from pydantic import BaseModel
from decimal import Decimal
from datetime import date

class ExpenseCreate(BaseModel):
    category: str # RENT, UTILITIES, SUPPLIES, OTHER
    amount: Decimal
    date: date
    description: str

class ExpenseResponse(BaseModel):
    id: int
    business_id: int
    category: str
    amount: Decimal
    date: date
    description: str
    user_id: int

    class Config:
        from_attributes = True