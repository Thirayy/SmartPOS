from datetime import date as calendar_date
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

EXPENSE_CATEGORIES = {"RENT", "UTILITIES", "SUPPLIES", "OTHER"}


class ExpenseCreate(BaseModel):
    category: str
    amount: Decimal = Field(gt=0)
    date: calendar_date
    description: str = Field(min_length=1, max_length=500)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in EXPENSE_CATEGORIES:
            raise ValueError("Kategori harus RENT, UTILITIES, SUPPLIES, atau OTHER")
        return normalized


class ExpenseUpdate(BaseModel):
    category: str | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    date: calendar_date | None = None
    description: str | None = Field(default=None, min_length=1, max_length=500)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if normalized not in EXPENSE_CATEGORIES:
            raise ValueError("Kategori harus RENT, UTILITIES, SUPPLIES, atau OTHER")
        return normalized


class ExpenseResponse(BaseModel):
    id: int
    business_id: int
    category: str
    amount: Decimal
    date: calendar_date
    description: str
    user_id: int

    class Config:
        from_attributes = True
