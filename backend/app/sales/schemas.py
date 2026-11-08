from pydantic import BaseModel, Field, field_validator
from decimal import Decimal
from datetime import datetime
from typing import List, Optional

ALLOWED_PAYMENT_METHODS = {"CASH", "TRANSFER", "QRIS"}

class SaleItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)

class CheckoutRequest(BaseModel):
    payment_method: str  # CASH, TRANSFER, QRIS
    amount_received: Decimal = Field(ge=0)
    discount: Decimal = Field(default=Decimal("0.00"), ge=0)
    items: List[SaleItemRequest] = Field(min_length=1)
    idempotency_key: Optional[str] = Field(default=None, max_length=128)

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in ALLOWED_PAYMENT_METHODS:
            raise ValueError("Metode pembayaran harus CASH, TRANSFER, atau QRIS")
        return normalized

    @field_validator("idempotency_key")
    @classmethod
    def normalize_idempotency_key(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

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

class SaleCancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("Alasan minimal 3 karakter")
        return normalized


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
    cashier_name: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by_user_id: Optional[int] = None
    cancel_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[SaleItemResponse] = []

    class Config:
        from_attributes = True