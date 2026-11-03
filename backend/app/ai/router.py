from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.sales.models import Sale
from app.expenses.models import Expense
from app.ai.provider import call_ai_llm
from decimal import Decimal
from app.auth.dependencies import authorize_business_access

router = APIRouter(
    prefix="/businesses/{business_id}/ai",
    tags=["AI Analyst"],
    dependencies=[Depends(authorize_business_access)],
)

@router.post("/analyze")
def analyze_business(business_id: int, db: Session = Depends(get_db)):
    sales_agg = db.query(
        func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")).label("omzet"),
        func.coalesce(func.sum(Sale.total_cost), Decimal("0.00")).label("cogs"),
        func.coalesce(func.count(Sale.id), 0).label("tx_count")
    ).filter(Sale.business_id == business_id, Sale.status == "COMPLETED").first()

    expenses_agg = db.query(
        func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total_exp")
    ).filter(Expense.business_id == business_id).first()

    omzet = sales_agg.omzet
    cogs = sales_agg.cogs
    gross_profit = omzet - cogs
    expenses = expenses_agg.total_exp
    net_result = gross_profit - expenses

    metrics_summary = (
        f"Total Omzet: Rp{omzet:,.2f}, "
        f"Total Transaksi: {sales_agg.tx_count}, "
        f"Total COGS: Rp{cogs:,.2f}, "
        f"Laba Kotor: Rp{gross_profit:,.2f}, "
        f"Total Pengeluaran: Rp{expenses:,.2f}, "
        f"Hasil Operasional Bersih: Rp{net_result:,.2f}"
    )

    ai_insights = call_ai_llm(metrics_summary)

    return {
        "metrics_summary": metrics_summary,
        "insights": ai_insights
    }