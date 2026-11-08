from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("businesses.id"), nullable=False)
    transaction_number = Column(String, unique=True, nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    total_cost = Column(Numeric(12, 2), nullable=False) # COGS total
    discount = Column(Numeric(12, 2), default=0)
    payment_method = Column(String, nullable=False) # CASH, TRANSFER
    amount_received = Column(Numeric(12, 2), nullable=False)
    change_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String, default="COMPLETED") # COMPLETED, CANCELLED
    cashier_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    cancel_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="sales")
    cashier = relationship("User", foreign_keys=[cashier_user_id])
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_user_id])
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

    @property
    def cashier_name(self) -> str | None:
        return self.cashier.full_name if self.cashier else None

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_selling_price = Column(Numeric(12, 2), nullable=False)
    unit_cost_price = Column(Numeric(12, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

    @property
    def product_name(self) -> str:
        return self.product.name
