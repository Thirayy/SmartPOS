from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    business_id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    description: str | None
    before_data: dict[str, Any] | None
    after_data: dict[str, Any] | None
    created_at: datetime

    class Config:
        from_attributes = True
