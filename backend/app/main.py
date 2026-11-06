from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.database import engine, Base
from app.core.config import settings

# Import semua models agar terdeteksi oleh Base.metadata SQLAlchemy
from app.auth.models import User, Session
from app.businesses.models import Business
from app.products.models import Product, InventoryMovement
from app.sales.models import Sale, SaleItem
from app.expenses.models import Expense

# Import semua router aplikasi
from app.auth.router import router as auth_router
from app.businesses.router import router as businesses_router
from app.products.router import router as products_router
from app.expenses.router import router as expenses_router
from app.reports.router import router as reports_router
from app.ai.router import router as ai_router
from app.sales.router import router as sales_router

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
for router in (auth_router, businesses_router, products_router, expenses_router, reports_router, ai_router, sales_router):
    app.include_router(router, prefix="/api/v1")

# Auto create tables pada startup
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT")
        )

@app.get("/")
def read_root():
    return {"message": "Welcome to SmartPOS MVP API", "status": "active"}