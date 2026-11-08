from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ShiftOpenRequest(BaseModel):
    opening_cash: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: str | None = Field(default=None, max_length=500)


class ShiftCloseRequest(BaseModel):
    actual_cash: Decimal = Field(ge=0)
    notes: str | None = Field(default=None, max_length=500)


class ShiftResponse(BaseModel):
    id: int
    business_id: int
    cashier_user_id: int
    cashier_name: str | None = None
    status: str
    opening_cash: Decimal
    expected_cash: Decimal | None
    actual_cash: Decimal | None
    difference: Decimal | None
    notes: str | None
    opened_at: datetime
    closed_at: datetime | None
    total_cash_sales: Decimal = Decimal("0.00")
    total_cash_refunds: Decimal = Decimal("0.00")
    total_transactions: int = 0

    class Config:
        from_attributes = True
