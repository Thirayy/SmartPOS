from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from decimal import Decimal
import uuid
from typing import List, Optional

from app.core.database import get_db
from app.sales.models import Sale, SaleItem
from app.products.models import Product, InventoryMovement
from app.sales.schemas import CheckoutRequest, SaleResponse
from app.auth.dependencies import authorize_business_access, get_current_user
from app.auth.models import User

router = APIRouter(
    prefix="/businesses/{business_id}/sales",
    tags=["Sales"],
    dependencies=[Depends(authorize_business_access)],
)

# 1. Endpoint Process Checkout (POS Sale)
@router.post("/checkout", response_model=SaleResponse)
def checkout(
    business_id: int,
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        total_amount = Decimal("0.00")
        total_cost = Decimal("0.00")
        sale_items_data = []

        # Validasi stok & hitung total
        for item_req in req.items:
            product = db.query(Product).filter(
                Product.id == item_req.product_id, 
                Product.business_id == business_id
            ).first()

            if not product:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Produk ID {item_req.product_id} tidak ditemukan"
                )

            if product.stock < item_req.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stok produk '{product.name}' tidak mencukupi (Sisa: {product.stock})"
                )

            subtotal = product.selling_price * item_req.quantity
            cost_subtotal = product.cost_price * item_req.quantity

            total_amount += subtotal
            total_cost += cost_subtotal

            sale_items_data.append({
                "product": product,
                "quantity": item_req.quantity,
                "unit_selling_price": product.selling_price,
                "unit_cost_price": product.cost_price,
                "subtotal": subtotal
            })

        # Hitung diskon & kembalian
        final_amount = max(Decimal("0.00"), total_amount - req.discount)

        if req.amount_received < final_amount:
            raise HTTPException(
                status_code=400, 
                detail="Nominal uang yang diterima kurang dari total belanja"
            )

        change_amount = req.amount_received - final_amount
        transaction_number = f"TRX-{uuid.uuid4().hex[:8].upper()}"

        # Buat record Sale utama
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
            cashier_user_id=current_user.id
        )
        db.add(new_sale)
        db.flush()

        # Input item transaksi, kurangi stok, catat mutasi stok
        for item_data in sale_items_data:
            prod = item_data["product"]

            sale_item = SaleItem(
                sale_id=new_sale.id,
                product_id=prod.id,
                quantity=item_data["quantity"],
                unit_selling_price=item_data["unit_selling_price"],
                unit_cost_price=item_data["unit_cost_price"],
                subtotal=item_data["subtotal"]
            )
            db.add(sale_item)

            # Potong stok produk secara nyata di DB
            prod.stock -= item_data["quantity"]

            # Catat mutasi stok keluar (SALE)
            movement = InventoryMovement(
                product_id=prod.id,
                business_id=business_id,
                movement_type="SALE",
                quantity=item_data["quantity"],
                reference_sale_id=new_sale.id,
                user_id=current_user.id,
                reason=f"POS Sale {transaction_number}"
            )
            db.add(movement)

        db.commit()
        db.refresh(new_sale)
        return new_sale

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# 2. Endpoint Get List Histori Transaksi (Tracking Transaksi)
@router.get("/", response_model=List[SaleResponse])
def get_sales_history(
    business_id: int,
    payment_method: Optional[str] = Query(None, description="Filter transaksi berdasarkan metode pembayaran"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Sale).filter(Sale.business_id == business_id)

    if payment_method:
        query = query.filter(Sale.payment_method == payment_method)

    sales = query.order_by(desc(Sale.created_at)).offset(offset).limit(limit).all()
    return sales


# 3. Endpoint Get Detail Transaksi Tertentu (Struk Transaksi)
@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale_detail(business_id: int, sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(
        Sale.id == sale_id, 
        Sale.business_id == business_id
    ).first()

    if not sale:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")

    return sale