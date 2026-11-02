from pydantic import BaseModel
from decimal import Decimal
from datetime import date

class ExpenseCreate(BaseModel):
    category: str # RENT, UTILITIES, SUPPLIES, OTHER
    amount: Decimal
    date: date
    description: str
    user_id: int

class ExpenseResponse(ExpenseCreate):
    id: int
    business_id: int

    class Config:
        from_attributes = True