from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.database import SessionLocal, engine, Base
from app.core.config import settings

# Import semua models agar terdeteksi oleh Base.metadata SQLAlchemy
from app.auth.models import User, Session
from app.audit.models import AuditLog
from app.businesses.models import Business
from app.members.models import ROLE_OWNER, BusinessMember
from app.products.models import Product, InventoryMovement
from app.sales.models import Sale, SaleItem
from app.expenses.models import Expense
from app.shifts.models import Shift

# Import semua router aplikasi
from app.auth.router import router as auth_router
from app.audit.router import router as audit_router
from app.businesses.router import router as businesses_router
from app.members.router import router as members_router
from app.products.router import router as products_router
from app.expenses.router import router as expenses_router
from app.reports.router import router as reports_router
from app.ai.router import router as ai_router
from app.ai.models import AIChatMessage, AIConversation
from app.ai.ingest import ensure_hcb_schema
from app.sales.router import router as sales_router
from app.shifts.router import router as shifts_router

app = FastAPI(title=f"{settings.PROJECT_NAME} API", version="1.0.0")

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Daftarkan semua router dengan prefix universal /api/v1
for router in (
    auth_router,
    audit_router,
    businesses_router,
    members_router,
    products_router,
    expenses_router,
    reports_router,
    ai_router,
    sales_router,
    shifts_router,
):
    app.include_router(router, prefix="/api/v1")


def _backfill_owner_memberships() -> None:
    with SessionLocal() as db:
        for business in db.query(Business).all():
            existing = (
                db.query(BusinessMember)
                .filter(
                    BusinessMember.business_id == business.id,
                    BusinessMember.user_id == business.owner_user_id,
                )
                .first()
            )
            if existing is None:
                db.add(
                    BusinessMember(
                        business_id=business.id,
                        user_id=business.owner_user_id,
                        role=ROLE_OWNER,
                        is_active=True,
                    )
                )
        db.commit()


# Auto create tables pada startup
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT")
        )
        connection.execute(
            text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP")
        )
        connection.execute(
            text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_by_user_id INTEGER")
        )
        connection.execute(
            text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR")
        )
        ensure_hcb_schema(connection)
    _backfill_owner_memberships()

@app.get("/")
def read_root():
    return {"message": "Welcome to SmartPOS MVP API", "status": "active"}