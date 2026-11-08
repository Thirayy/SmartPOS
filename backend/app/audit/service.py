from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.audit.models import AuditLog


def snapshot(obj: Any, fields: tuple[str, ...]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for field in fields:
        value = getattr(obj, field, None)
        if isinstance(value, Decimal):
            data[field] = str(value)
        elif isinstance(value, (date, datetime)):
            data[field] = value.isoformat()
        else:
            data[field] = value
    return data


def record_audit(
    db: Session,
    *,
    business_id: int,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    description: str | None = None,
    before_data: dict[str, Any] | None = None,
    after_data: dict[str, Any] | None = None,
) -> AuditLog:
    log = AuditLog(
        business_id=business_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        before_data=before_data,
        after_data=after_data,
    )
    db.add(log)
    return log
