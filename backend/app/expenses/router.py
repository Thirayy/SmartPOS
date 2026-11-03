from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.expenses.models import Expense
from app.expenses.schemas import ExpenseCreate, ExpenseResponse
from app.auth.dependencies import authorize_business_access, get_current_user
from app.auth.models import User

router = APIRouter(
    prefix="/businesses/{business_id}/expenses",
    tags=["Expenses"],
    dependencies=[Depends(authorize_business_access)],
)

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    business_id: int,
    expense: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_expense = Expense(
        business_id=business_id,
        user_id=current_user.id,
        **expense.model_dump()
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/", response_model=list[ExpenseResponse])
def list_expenses(business_id: int, db: Session = Depends(get_db)):
    return db.query(Expense).filter(Expense.business_id == business_id).order_by(Expense.date.desc()).all()