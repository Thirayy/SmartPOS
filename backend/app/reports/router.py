from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.sales.models import Sale, SaleItem
from app.expenses.models import Expense
from app.products.models import Product
from decimal import Decimal
from app.auth.dependencies import authorize_business_access

router = APIRouter(
    prefix="/businesses/{business_id}/reports",
    tags=["Reports"],
    dependencies=[Depends(authorize_business_access)],
)

@router.get("/dashboard")
def get_dashboard_report(business_id: int, db: Session = Depends(get_db)):
    # 1. Agregasi Omzet & COGS dari Sales (COMPLETED)
    sales_agg = db.query(
        func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")).label("omzet"),
        func.coalesce(func.sum(Sale.total_cost), Decimal("0.00")).label("cogs"),
        func.coalesce(func.count(Sale.id), 0).label("tx_count")
    ).filter(
        Sale.business_id == business_id,
        Sale.status == "COMPLETED"
    ).first()

    total_omzet = sales_agg.omzet
    total_cogs = sales_agg.cogs
    total_transactions = sales_agg.tx_count

    estimated_gross_profit = total_omzet - total_cogs

    # 2. Agregasi Total Expenses
    expenses_agg = db.query(
        func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total_exp")
    ).filter(
        Expense.business_id == business_id
    ).first()

    total_expenses = expenses_agg.total_exp

    # 3. Hasil Operasional Bersih
    estimated_operating_result = estimated_gross_profit - total_expenses

    # 4. Produk Terlaris (Best Sellers)
    best_sellers_query = db.query(
        Product.name,
        func.sum(SaleItem.quantity).label("total_qty")
    ).join(SaleItem, SaleItem.product_id == Product.id)\
     .join(Sale, Sale.id == SaleItem.sale_id)\
     .filter(Sale.business_id == business_id, Sale.status == "COMPLETED")\
     .group_by(Product.name)\
     .order_by(desc("total_qty"))\
     .limit(5).all()

    best_sellers = [
        {"product_name": row.name, "total_sold": int(row.total_qty)}
        for row in best_sellers_query
    ]

    return {
        "total_omzet": float(total_omzet),
        "total_transactions": int(total_transactions),
        "total_cogs": float(total_cogs),
        "estimated_gross_profit": float(estimated_gross_profit),
        "total_expenses": float(total_expenses),
        "estimated_operating_result": float(estimated_operating_result),
        "best_sellers": best_sellers
    }