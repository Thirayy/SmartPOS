from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base

# Import semua models agar terdeteksi oleh Base.metadata
from app.auth.models import User, Session
from app.businesses.models import Business
from app.products.models import Product, InventoryMovement
from app.sales.models import Sale, SaleItem
from app.expenses.models import Expense
from app.expenses.router import router as expenses_router
from app.reports.router import router as reports_router
from app.ai.router import router as ai_router

app = FastAPI(title="SmartPOS MVP API", version="1.0.0")

app.include_router(expenses_router)
app.include_router(reports_router)
app.include_router(ai_router)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Sesuaikan domain frontend jika sudahproduction
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto create tables pada startup (bisa diganti Alembic jika ingin migrasi ketat)
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to SmartPOS MVP API", "status": "active"}
