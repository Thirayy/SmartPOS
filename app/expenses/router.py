from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.expenses.models import Expense
from app.expenses.schemas import ExpenseCreate, ExpenseResponse

router = APIRouter(prefix="/api/v1/businesses/{business_id}/expenses", tags=["Expenses"])

@router.post("/", response_model=ExpenseResponse)
def create_expense(business_id: int, expense: ExpenseCreate, db: Session = Depends(get_db)):
    db_expense = Expense(
        business_id=business_id,
        **expense.model_dump()
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/", response_model=list[ExpenseResponse])
def list_expenses(business_id: int, db: Session = Depends(get_db)):
    return db.query(Expense).filter(Expense.business_id == business_id).order_by(Expense.date.desc()).all()