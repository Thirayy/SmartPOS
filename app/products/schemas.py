from pydantic import BaseModel
from decimal import Decimal

class ProductCreate(BaseModel):
    name: str
    sku: str | None = None
    selling_price: Decimal
    cost_price: Decimal
    stock: int = 0
    low_stock_threshold: int = 5

class ProductResponse(ProductCreate):
    id: int
    business_id: int
    is_active: bool

    class Config:
        from_attributes = True

class StockAdjustment(BaseModel):
    quantity: int
    movement_type: str # STOCK_IN, STOCK_OUT, ADJUSTMENT
    reason: str | None = None