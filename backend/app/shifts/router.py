from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit.service import record_audit, snapshot
from app.auth.dependencies import (
    BusinessAccess,
    authorize_business_access,
    get_business_access,
    get_current_user,
)
from app.auth.models import User
from app.core.database import get_db
from app.sales.models import Sale
from app.shifts.models import SHIFT_CLOSED, SHIFT_OPEN, Shift
from app.shifts.schemas import (
    ShiftCloseRequest,
    ShiftOpenRequest,
    ShiftResponse,
)

router = APIRouter(
    prefix="/businesses/{business_id}/shifts",
    tags=["Shifts"],
    dependencies=[Depends(authorize_business_access)],
)

SHIFT_AUDIT_FIELDS = (
    "status",
    "opening_cash",
    "expected_cash",
    "actual_cash",
    "difference",
)


def _shift_summary(db: Session, shift: Shift) -> dict:
    period_end = shift.closed_at or datetime.utcnow()

    cash_in = (
        db.query(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")),
            func.count(Sale.id),
        )
        .filter(
            Sale.business_id == shift.business_id,
            Sale.cashier_user_id == shift.cashier_user_id,
            Sale.payment_method == "CASH",
            Sale.created_at >= shift.opened_at,
            Sale.created_at <= period_end,
        )
        .first()
    )

    cash_refunds = (
        db.query(func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")))
        .filter(
            Sale.business_id == shift.business_id,
            Sale.cashier_user_id == shift.cashier_user_id,
            Sale.payment_method == "CASH",
            Sale.status == "CANCELLED",
            Sale.cancelled_at.is_not(None),
            Sale.cancelled_at >= shift.opened_at,
            Sale.cancelled_at <= period_end,
        )
        .first()
    )

    total_cash_sales = cash_in[0] or Decimal("0.00")
    total_transactions = int(cash_in[1] or 0)
    total_cash_refunds = cash_refunds[0] or Decimal("0.00")
    expected_cash = shift.opening_cash + total_cash_sales - total_cash_refunds

    return {
        "total_cash_sales": total_cash_sales,
        "total_cash_refunds": total_cash_refunds,
        "total_transactions": total_transactions,
        "expected_cash": expected_cash,
    }


def _shift_response(db: Session, shift: Shift) -> ShiftResponse:
    summary = _shift_summary(db, shift)
    expected_cash = (
        shift.expected_cash
        if shift.status == SHIFT_CLOSED and shift.expected_cash is not None
        else summary["expected_cash"]
    )
    return ShiftResponse(
        id=shift.id,
        business_id=shift.business_id,
        cashier_user_id=shift.cashier_user_id,
        cashier_name=shift.cashier.full_name if shift.cashier else None,
        status=shift.status,
        opening_cash=shift.opening_cash,
        expected_cash=expected_cash,
        actual_cash=shift.actual_cash,
        difference=shift.difference,
        notes=shift.notes,
        opened_at=shift.opened_at,
        closed_at=shift.closed_at,
        total_cash_sales=summary["total_cash_sales"],
        total_cash_refunds=summary["total_cash_refunds"],
        total_transactions=summary["total_transactions"],
    )


@router.post("/open", response_model=ShiftResponse)
def open_shift(
    business_id: int,
    payload: ShiftOpenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active_shift = (
        db.query(Shift)
        .filter(
            Shift.business_id == business_id,
            Shift.cashier_user_id == current_user.id,
            Shift.status == SHIFT_OPEN,
        )
        .first()
    )
    if active_shift is not None:
        raise HTTPException(
            status_code=400,
            detail="Anda masih memiliki shift yang terbuka",
        )

    shift = Shift(
        business_id=business_id,
        cashier_user_id=current_user.id,
        status=SHIFT_OPEN,
        opening_cash=payload.opening_cash,
        notes=payload.notes,
        opened_at=datetime.utcnow(),
    )
    db.add(shift)
    db.flush()
    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="SHIFT_OPEN",
        entity_type="SHIFT",
        entity_id=shift.id,
        description="Membuka shift kasir",
        after_data=snapshot(shift, SHIFT_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(shift)
    return _shift_response(db, shift)


@router.get("/active", response_model=ShiftResponse | None)
def get_active_shift(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shift = (
        db.query(Shift)
        .filter(
            Shift.business_id == business_id,
            Shift.cashier_user_id == current_user.id,
            Shift.status == SHIFT_OPEN,
        )
        .first()
    )
    return _shift_response(db, shift) if shift else None


@router.get("/", response_model=list[ShiftResponse])
def list_shifts(
    business_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    access: BusinessAccess = Depends(get_business_access),
    db: Session = Depends(get_db),
):
    query = db.query(Shift).filter(Shift.business_id == business_id)
    if access.role == "CASHIER":
        query = query.filter(Shift.cashier_user_id == current_user.id)
    shifts = (
        query.order_by(Shift.opened_at.desc(), Shift.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_shift_response(db, shift) for shift in shifts]


@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift(
    business_id: int,
    shift_id: int,
    current_user: User = Depends(get_current_user),
    access: BusinessAccess = Depends(get_business_access),
    db: Session = Depends(get_db),
):
    shift = (
        db.query(Shift)
        .filter(Shift.id == shift_id, Shift.business_id == business_id)
        .first()
    )
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift tidak ditemukan")
    if access.role == "CASHIER" and shift.cashier_user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Anda tidak memiliki izin untuk tindakan ini"
        )
    return _shift_response(db, shift)


@router.post("/{shift_id}/close", response_model=ShiftResponse)
def close_shift(
    business_id: int,
    shift_id: int,
    payload: ShiftCloseRequest,
    current_user: User = Depends(get_current_user),
    access: BusinessAccess = Depends(get_business_access),
    db: Session = Depends(get_db),
):
    shift = (
        db.query(Shift)
        .filter(Shift.id == shift_id, Shift.business_id == business_id)
        .with_for_update()
        .first()
    )
    if shift is None:
        raise HTTPException(status_code=404, detail="Shift tidak ditemukan")
    if access.role == "CASHIER" and shift.cashier_user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Anda tidak memiliki izin untuk tindakan ini"
        )
    if shift.status == SHIFT_CLOSED:
        return _shift_response(db, shift)

    summary = _shift_summary(db, shift)
    before = snapshot(shift, SHIFT_AUDIT_FIELDS)
    shift.status = SHIFT_CLOSED
    shift.closed_at = datetime.utcnow()
    shift.expected_cash = summary["expected_cash"]
    shift.actual_cash = payload.actual_cash
    shift.difference = payload.actual_cash - summary["expected_cash"]
    if payload.notes:
        shift.notes = payload.notes

    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="SHIFT_CLOSE",
        entity_type="SHIFT",
        entity_id=shift.id,
        description="Menutup shift kasir",
        before_data=before,
        after_data=snapshot(shift, SHIFT_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(shift)
    return _shift_response(db, shift)
