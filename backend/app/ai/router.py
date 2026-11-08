from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.sales.models import Sale, SaleItem
from app.expenses.models import Expense
from app.products.models import Product
from app.ai.provider import run_business_analysis
from app.ai.schemas import BusinessAnalysisResponse
from app.auth.dependencies import authorize_business_access, require_roles
from decimal import Decimal

router = APIRouter(
    prefix="/businesses/{business_id}/ai",
    tags=["AI Analyst"],
    dependencies=[
        Depends(authorize_business_access),
        Depends(require_roles("OWNER", "MANAGER")),
    ],
)

@router.post("/analyze", response_model=BusinessAnalysisResponse)
def analyze_business(business_id: int, db: Session = Depends(get_db)):
    try:
        # 1. Agregasi POS Data dari Backend
        sales_agg = db.query(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")).label("omzet"),
            func.coalesce(func.sum(Sale.total_cost), Decimal("0.00")).label("cogs"),
            func.coalesce(func.count(Sale.id), 0).label("tx_count")
        ).filter(Sale.business_id == business_id, Sale.status == "COMPLETED").first()

        expenses_agg = db.query(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total_exp")
        ).filter(Expense.business_id == business_id).first()

        omzet = float(sales_agg.omzet)
        cogs = float(sales_agg.cogs)
        gross_profit = omzet - cogs
        expenses = float(expenses_agg.total_exp)
        net_result = gross_profit - expenses

        metrics = {
            "total_omzet": omzet,
            "total_transactions": int(sales_agg.tx_count),
            "total_cogs": cogs,
            "estimated_gross_profit": gross_profit,
            "total_expenses": expenses,
            "estimated_operating_result": net_result
        }

        # 2. Ambil Top 5 Best Sellers
        best_sellers_query = db.query(
            Product.name,
            func.sum(SaleItem.quantity).label("total_qty")
        ).join(SaleItem, SaleItem.product_id == Product.id)\
         .join(Sale, Sale.id == SaleItem.sale_id)\
         .filter(Sale.business_id == business_id, Sale.status == "COMPLETED")\
         .group_by(Product.name)\
         .order_by(desc("total_qty"))\
         .limit(5).all()

        best_sellers = [{"product_name": row.name, "total_sold": int(row.total_qty)} for row in best_sellers_query]

        # 3. Jalankan Engine Analisis AI
        analysis_result = run_business_analysis(metrics, best_sellers)
        return analysis_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan analisis AI: {str(e)}")