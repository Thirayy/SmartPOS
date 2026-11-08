from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=80)
    selling_price: Decimal = Field(ge=0)
    cost_price: Decimal = Field(ge=0)
    stock: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    sku: str | None = Field(default=None, max_length=80)
    selling_price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    business_id: int
    name: str
    sku: str | None
    selling_price: Decimal
    cost_price: Decimal
    stock: int
    low_stock_threshold: int
    is_active: bool

    class Config:
        from_attributes = True


class StockAdjustment(BaseModel):
    quantity: int = Field(gt=0)
    movement_type: str
    reason: str | None = Field(default=None, max_length=255)

    @field_validator("movement_type")
    @classmethod
    def validate_movement_type(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in {"STOCK_IN", "STOCK_OUT", "ADJUSTMENT"}:
            raise ValueError("Tipe mutasi harus STOCK_IN, STOCK_OUT, atau ADJUSTMENT")
        return normalized
