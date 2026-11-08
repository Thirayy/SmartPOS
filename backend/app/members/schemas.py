from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.members.models import BUSINESS_ROLES


def normalize_role(value: str) -> str:
    normalized = value.strip().upper()
    if normalized not in BUSINESS_ROLES:
        raise ValueError("Peran harus OWNER, MANAGER, atau CASHIER")
    return normalized


class MemberCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: str = "CASHIER"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        return normalize_role(value)


class MemberUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        return normalize_role(value) if value is not None else None


class MemberResponse(BaseModel):
    id: int
    user_id: int
    business_id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
