from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

ROLE_OWNER = "OWNER"
ROLE_MANAGER = "MANAGER"
ROLE_CASHIER = "CASHIER"
BUSINESS_ROLES = (ROLE_OWNER, ROLE_MANAGER, ROLE_CASHIER)


class BusinessMember(Base):
    __tablename__ = "business_members"
    __table_args__ = (
        UniqueConstraint("business_id", "user_id", name="uq_business_member"),
    )

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(String, nullable=False, default=ROLE_CASHIER)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    business = relationship("Business", back_populates="members")
    user = relationship("User", back_populates="memberships")
