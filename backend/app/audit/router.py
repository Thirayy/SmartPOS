from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.audit.models import AuditLog
from app.audit.schemas import AuditLogResponse
from app.auth.dependencies import require_roles
from app.core.database import get_db

router = APIRouter(
    prefix="/businesses/{business_id}/audit",
    tags=["Audit"],
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)


@router.get("/", response_model=list[AuditLogResponse])
def list_audit_logs(
    business_id: int,
    entity_type: str | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).filter(AuditLog.business_id == business_id)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action == action)
    return (
        query.order_by(desc(AuditLog.created_at), desc(AuditLog.id))
        .offset(offset)
        .limit(limit)
        .all()
    )
