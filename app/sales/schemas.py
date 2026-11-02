from pydantic import BaseModel
from decimal import Decimal

class SaleItemRequest(BaseModel):
    product_id: int
    quantity: int

class CheckoutRequest(BaseModel):
    cashier_user_id: int
    payment_method: str # CASH, TRANSFER
    amount_received: Decimal
    discount: Decimal = Decimal("0.00")
    items: list[SaleItemRequest]

class SaleResponse(BaseModel):
    id: int
    transaction_number: str
    total_amount: Decimal
    amount_received: Decimal
    change_amount: Decimal
    payment_method: str

    class Config:
        from_attributes = True