from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.auth.dependencies import authorize_business_access, require_roles
from app.core.dates import utc_naive_bounds
from app.core.database import get_db
from app.expenses.models import Expense
from app.products.models import Product
from app.sales.models import Sale, SaleItem

router = APIRouter(
    prefix="/businesses/{business_id}/reports",
    tags=["Reports"],
    dependencies=[
        Depends(authorize_business_access),
        Depends(require_roles("OWNER", "MANAGER")),
    ],
)


def _validate_period(start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Tanggal mulai tidak boleh setelah tanggal akhir.",
        )


def _apply_sale_period(query, start_date: date | None, end_date: date | None):
    start_at, end_before = utc_naive_bounds(start_date, end_date)
    if start_at:
        query = query.filter(Sale.created_at >= start_at)
    if end_before:
        query = query.filter(Sale.created_at < end_before)
    return query


def _apply_expense_period(query, start_date: date | None, end_date: date | None):
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    return query


@router.get("/dashboard")
def get_dashboard_report(
    business_id: int,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    _validate_period(start_date, end_date)

    sales_query = db.query(
        func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")).label("omzet"),
        func.coalesce(func.sum(Sale.total_cost), Decimal("0.00")).label("cogs"),
        func.coalesce(func.count(Sale.id), 0).label("tx_count"),
    ).filter(
        Sale.business_id == business_id,
        Sale.status == "COMPLETED",
    )
    sales_agg = _apply_sale_period(sales_query, start_date, end_date).first()

    total_omzet = sales_agg.omzet
    total_cogs = sales_agg.cogs
    total_transactions = sales_agg.tx_count
    estimated_gross_profit = total_omzet - total_cogs

    expenses_query = db.query(
        func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total_exp")
    ).filter(Expense.business_id == business_id)
    expenses_agg = _apply_expense_period(
        expenses_query, start_date, end_date
    ).first()
    total_expenses = expenses_agg.total_exp

    estimated_operating_result = estimated_gross_profit - total_expenses

    best_sellers_query = (
        db.query(
            Product.name,
            func.sum(SaleItem.quantity).label("total_qty"),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.business_id == business_id, Sale.status == "COMPLETED")
    )
    best_sellers_query = _apply_sale_period(
        best_sellers_query, start_date, end_date
    )
    best_sellers_query = (
        best_sellers_query.group_by(Product.name)
        .order_by(desc("total_qty"))
        .limit(5)
        .all()
    )

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
        "best_sellers": best_sellers,
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
    }
