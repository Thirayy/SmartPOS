from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import List, Optional

class SaleItemRequest(BaseModel):
    product_id: int
    quantity: int

class CheckoutRequest(BaseModel):
    payment_method: str  # CASH, TRANSFER, QRIS, dll
    amount_received: Decimal
    discount: Decimal = Decimal("0.00")
    items: List[SaleItemRequest]

class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_selling_price: Decimal
    unit_cost_price: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True

class SaleResponse(BaseModel):
    id: int
    business_id: int
    transaction_number: str
    total_amount: Decimal
    total_cost: Decimal
    discount: Decimal
    payment_method: str
    amount_received: Decimal
    change_amount: Decimal
    status: str
    cashier_user_id: int
    created_at: Optional[datetime] = None
    items: List[SaleItemResponse] = []

    class Config:
        from_attributes = True