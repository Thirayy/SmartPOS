from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base

SHIFT_OPEN = "OPEN"
SHIFT_CLOSED = "CLOSED"


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    cashier_user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    status = Column(String, nullable=False, default=SHIFT_OPEN)
    opening_cash = Column(Numeric(12, 2), nullable=False, default=0)
    expected_cash = Column(Numeric(12, 2), nullable=True)
    actual_cash = Column(Numeric(12, 2), nullable=True)
    difference = Column(Numeric(12, 2), nullable=True)
    notes = Column(Text, nullable=True)
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, nullable=True)

    business = relationship("Business", back_populates="shifts")
    cashier = relationship("User")
