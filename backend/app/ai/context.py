from decimal import Decimal

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.expenses.models import Expense
from app.products.models import Product
from app.sales.models import Sale, SaleItem


def build_business_context(
    db: Session, business_id: int
) -> tuple[dict[str, float | int], list[dict[str, float | int | str]]]:
    sales_agg = (
        db.query(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")).label("omzet"),
            func.coalesce(func.sum(Sale.total_cost), Decimal("0.00")).label("cogs"),
            func.coalesce(func.count(Sale.id), 0).label("tx_count"),
        )
        .filter(Sale.business_id == business_id, Sale.status == "COMPLETED")
        .first()
    )

    expenses_agg = (
        db.query(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total_exp")
        )
        .filter(Expense.business_id == business_id)
        .first()
    )

    omzet = float(sales_agg.omzet)
    cogs = float(sales_agg.cogs)
    gross_profit = omzet - cogs
    expenses = float(expenses_agg.total_exp)

    metrics: dict[str, float | int] = {
        "total_omzet": omzet,
        "total_transactions": int(sales_agg.tx_count),
        "total_cogs": cogs,
        "estimated_gross_profit": gross_profit,
        "total_expenses": expenses,
        "estimated_operating_result": gross_profit - expenses,
    }

    best_sellers_query = (
        db.query(
            Product.name,
            func.sum(SaleItem.quantity).label("total_qty"),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.business_id == business_id, Sale.status == "COMPLETED")
        .group_by(Product.name)
        .order_by(desc("total_qty"))
        .limit(5)
        .all()
    )

    best_sellers = [
        {"product_name": row.name, "total_sold": int(row.total_qty)}
        for row in best_sellers_query
    ]
    return metrics, best_sellers
