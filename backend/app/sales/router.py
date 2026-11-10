import hashlib
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit.service import record_audit, snapshot
from app.auth.dependencies import (
    BusinessAccess,
    authorize_business_access,
    get_business_access,
    get_current_user,
    require_roles,
)
from app.auth.models import User
from app.core.dates import utc_naive_bounds
from app.core.database import get_db
from app.members.models import ROLE_CASHIER
from app.products.models import InventoryMovement, Product
from app.sales.models import Sale, SaleItem
from app.sales.schemas import (
    CheckoutRequest,
    SaleCancelRequest,
    SaleResponse,
)
from app.shifts.models import SHIFT_OPEN, Shift

router = APIRouter(
    prefix="/businesses/{business_id}/sales",
    tags=["Sales"],
    dependencies=[Depends(authorize_business_access)],
)

SALE_AUDIT_FIELDS = (
    "transaction_number",
    "total_amount",
    "total_cost",
    "discount",
    "payment_method",
    "status",
)


def _build_transaction_number(business_id: int, idempotency_key: str) -> str:
    digest = hashlib.sha256(
        f"{business_id}:{idempotency_key}".encode("utf-8")
    ).hexdigest()
    return f"TRX-{digest[:12].upper()}"


def _find_sale_by_transaction_number(
    db: Session, business_id: int, transaction_number: str
) -> Optional[Sale]:
    return (
        db.query(Sale)
        .filter(
            Sale.business_id == business_id,
            Sale.transaction_number == transaction_number,
        )
        .first()
    )


@router.post("/checkout", response_model=SaleResponse)
def checkout(
    business_id: int,
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    access: BusinessAccess = Depends(get_business_access),
    db: Session = Depends(get_db),
):
    if req.idempotency_key:
        transaction_number = _build_transaction_number(
            business_id, req.idempotency_key
        )
        existing_sale = _find_sale_by_transaction_number(
            db, business_id, transaction_number
        )
        if existing_sale:
            return existing_sale
    else:
        transaction_number = f"TRX-{uuid.uuid4().hex[:8].upper()}"

    if access.role == ROLE_CASHIER:
        active_shift = (
            db.query(Shift)
            .filter(
                Shift.business_id == business_id,
                Shift.cashier_user_id == current_user.id,
                Shift.status == SHIFT_OPEN,
            )
            .with_for_update()
            .first()
        )
        if active_shift is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Buka shift terlebih dahulu sebelum melakukan transaksi. "
                    "Isi kas awal di halaman Shift Kasir."
                ),
            )

    try:
        quantities: dict[int, int] = {}
        for item_req in req.items:
            quantities[item_req.product_id] = (
                quantities.get(item_req.product_id, 0) + item_req.quantity
            )

        product_ids = sorted(quantities)
        products = (
            db.query(Product)
            .filter(
                Product.id.in_(product_ids),
                Product.business_id == business_id,
            )
            .order_by(Product.id)
            .with_for_update()
            .all()
        )
        products_by_id = {product.id: product for product in products}

        if req.idempotency_key:
            existing_sale = _find_sale_by_transaction_number(
                db, business_id, transaction_number
            )
            if existing_sale:
                return existing_sale

        total_amount = Decimal("0.00")
        total_cost = Decimal("0.00")
        sale_items_data = []

        for product_id in product_ids:
            product = products_by_id.get(product_id)
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Produk ID {product_id} tidak ditemukan",
                )

            if not product.is_active:
                raise HTTPException(
                    status_code=400,
                    detail=f"Produk '{product.name}' sudah tidak aktif",
                )

            quantity = quantities[product_id]
            if product.stock < quantity:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Stok produk '{product.name}' tidak mencukupi "
                        f"(Sisa: {product.stock})"
                    ),
                )

            subtotal = product.selling_price * quantity
            cost_subtotal = product.cost_price * quantity

            total_amount += subtotal
            total_cost += cost_subtotal

            sale_items_data.append(
                {
                    "product": product,
                    "quantity": quantity,
                    "unit_selling_price": product.selling_price,
                    "unit_cost_price": product.cost_price,
                    "subtotal": subtotal,
                }
            )

        if req.discount > total_amount:
            raise HTTPException(
                status_code=400,
                detail="Diskon tidak boleh melebihi subtotal belanja",
            )

        final_amount = total_amount - req.discount

        if req.amount_received < final_amount:
            raise HTTPException(
                status_code=400,
                detail="Nominal uang yang diterima kurang dari total belanja",
            )

        change_amount = req.amount_received - final_amount

        new_sale = Sale(
            business_id=business_id,
            transaction_number=transaction_number,
            total_amount=final_amount,
            total_cost=total_cost,
            discount=req.discount,
            payment_method=req.payment_method,
            amount_received=req.amount_received,
            change_amount=change_amount,
            status="COMPLETED",
            cashier_user_id=current_user.id,
        )
        db.add(new_sale)
        db.flush()

        for item_data in sale_items_data:
            prod = item_data["product"]

            db.add(
                SaleItem(
                    sale_id=new_sale.id,
                    product_id=prod.id,
                    quantity=item_data["quantity"],
                    unit_selling_price=item_data["unit_selling_price"],
                    unit_cost_price=item_data["unit_cost_price"],
                    subtotal=item_data["subtotal"],
                )
            )

            prod.stock -= item_data["quantity"]

            db.add(
                InventoryMovement(
                    product_id=prod.id,
                    business_id=business_id,
                    movement_type="SALE",
                    quantity=item_data["quantity"],
                    reference_sale_id=new_sale.id,
                    user_id=current_user.id,
                    reason=f"POS Sale {transaction_number}",
                )
            )

        record_audit(
            db,
            business_id=business_id,
            user_id=current_user.id,
            action="CHECKOUT",
            entity_type="SALE",
            entity_id=new_sale.id,
            description=f"Transaksi {transaction_number}",
            after_data=snapshot(new_sale, SALE_AUDIT_FIELDS),
        )

        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            if req.idempotency_key:
                existing_sale = _find_sale_by_transaction_number(
                    db, business_id, transaction_number
                )
                if existing_sale:
                    return existing_sale
            raise HTTPException(
                status_code=409,
                detail="Transaksi bentrok dengan permintaan lain. Silakan coba lagi.",
            ) from error

        db.refresh(new_sale)
        return new_sale

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[SaleResponse])
def get_sales_history(
    business_id: int,
    payment_method: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    cashier_user_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Tanggal mulai tidak boleh setelah tanggal akhir.",
        )

    query = db.query(Sale).filter(Sale.business_id == business_id)

    if payment_method:
        query = query.filter(Sale.payment_method == payment_method.strip().upper())
    if status:
        query = query.filter(Sale.status == status.strip().upper())
    if cashier_user_id:
        query = query.filter(Sale.cashier_user_id == cashier_user_id)

    start_at, end_before = utc_naive_bounds(start_date, end_date)
    if start_at:
        query = query.filter(Sale.created_at >= start_at)
    if end_before:
        query = query.filter(Sale.created_at < end_before)

    return (
        query.order_by(desc(Sale.created_at), desc(Sale.id))
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale_detail(
    business_id: int,
    sale_id: int,
    db: Session = Depends(get_db),
):
    sale = (
        db.query(Sale)
        .filter(Sale.id == sale_id, Sale.business_id == business_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return sale


def _cancel_or_return_sale(
    *,
    business_id: int,
    sale_id: int,
    payload: SaleCancelRequest,
    action: str,
    current_user: User,
    db: Session,
) -> Sale:
    sale = (
        db.query(Sale)
        .filter(Sale.id == sale_id, Sale.business_id == business_id)
        .with_for_update()
        .first()
    )
    if sale is None:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    if sale.status == "CANCELLED":
        return sale

    if sale.status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="Hanya transaksi selesai yang dapat dibatalkan atau diretur",
        )

    before = snapshot(sale, SALE_AUDIT_FIELDS)
    sale_items = (
        db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
    )
    product_ids = sorted({item.product_id for item in sale_items})
    products = (
        db.query(Product)
        .filter(
            Product.id.in_(product_ids),
            Product.business_id == business_id,
        )
        .order_by(Product.id)
        .with_for_update()
        .all()
    )
    products_by_id = {product.id: product for product in products}

    for item in sale_items:
        product = products_by_id.get(item.product_id)
        if product is None:
            continue
        product.stock += item.quantity
        db.add(
            InventoryMovement(
                product_id=product.id,
                business_id=business_id,
                movement_type="RETURN",
                quantity=item.quantity,
                reference_sale_id=sale.id,
                user_id=current_user.id,
                reason=f"{action.title()} {sale.transaction_number}: {payload.reason}",
            )
        )

    sale.status = "CANCELLED"
    sale.cancelled_at = datetime.utcnow()
    sale.cancelled_by_user_id = current_user.id
    sale.cancel_reason = payload.reason

    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action=action,
        entity_type="SALE",
        entity_id=sale.id,
        description=f"{action} {sale.transaction_number}: {payload.reason}",
        before_data=before,
        after_data=snapshot(sale, SALE_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(sale)
    return sale


@router.post(
    "/{sale_id}/cancel",
    response_model=SaleResponse,
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)
def cancel_sale(
    business_id: int,
    sale_id: int,
    payload: SaleCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _cancel_or_return_sale(
        business_id=business_id,
        sale_id=sale_id,
        payload=payload,
        action="CANCEL",
        current_user=current_user,
        db=db,
    )


@router.post(
    "/{sale_id}/return",
    response_model=SaleResponse,
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)
def return_sale(
    business_id: int,
    sale_id: int,
    payload: SaleCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _cancel_or_return_sale(
        business_id=business_id,
        sale_id=sale_id,
        payload=payload,
        action="RETURN",
        current_user=current_user,
        db=db,
    )
