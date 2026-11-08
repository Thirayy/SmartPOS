from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.audit.service import record_audit, snapshot
from app.auth.dependencies import get_current_user, require_roles
from app.auth.models import User
from app.core.database import get_db
from app.expenses.models import Expense
from app.expenses.schemas import ExpenseCreate, ExpenseResponse, ExpenseUpdate

router = APIRouter(
    prefix="/businesses/{business_id}/expenses",
    tags=["Expenses"],
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)

EXPENSE_AUDIT_FIELDS = ("category", "amount", "date", "description")


@router.post("/", response_model=ExpenseResponse)
def create_expense(
    business_id: int,
    expense: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_expense = Expense(
        business_id=business_id,
        user_id=current_user.id,
        **expense.model_dump(),
    )
    db.add(db_expense)
    db.flush()
    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="EXPENSE",
        entity_id=db_expense.id,
        description=f"Mencatat pengeluaran {db_expense.category}",
        after_data=snapshot(db_expense, EXPENSE_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.get("/", response_model=list[ExpenseResponse])
def list_expenses(
    business_id: int,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Tanggal mulai tidak boleh setelah tanggal akhir.",
        )

    query = db.query(Expense).filter(Expense.business_id == business_id)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)

    return (
        query.order_by(desc(Expense.date), desc(Expense.id))
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.patch("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    business_id: int,
    expense_id: int,
    payload: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.business_id == business_id)
        .first()
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Pengeluaran tidak ditemukan")

    before = snapshot(expense, EXPENSE_AUDIT_FIELDS)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)

    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="EXPENSE",
        entity_id=expense.id,
        description="Mengubah pengeluaran",
        before_data=before,
        after_data=snapshot(expense, EXPENSE_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}")
def delete_expense(
    business_id: int,
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.business_id == business_id)
        .first()
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Pengeluaran tidak ditemukan")

    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="DELETE",
        entity_type="EXPENSE",
        entity_id=expense.id,
        description="Menghapus pengeluaran",
        before_data=snapshot(expense, EXPENSE_AUDIT_FIELDS),
    )
    db.delete(expense)
    db.commit()
    return {"message": "Pengeluaran berhasil dihapus"}
