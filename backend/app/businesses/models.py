from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    location = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="businesses")
    members = relationship(
        "BusinessMember", back_populates="business", cascade="all, delete-orphan"
    )
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="business", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="business", cascade="all, delete-orphan")
    audit_logs = relationship(
        "AuditLog", back_populates="business", cascade="all, delete-orphan"
    )
    shifts = relationship(
        "Shift", back_populates="business", cascade="all, delete-orphan"
    )
