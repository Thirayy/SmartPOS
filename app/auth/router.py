from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.models import User
from app.auth.schemas import UserCreate, UserLogin, TokenResponse
from passlib.context import CryptContext

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/register", response_model=TokenResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    hashed_password = pwd_context.hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "access_token": f"mock-token-for-{new_user.id}",
        "token_type": "bearer",
        "role": new_user.role,
        "full_name": new_user.full_name
    }

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not pwd_context.verify(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah")
        
    return {
        "access_token": f"mock-token-for-{user.id}",
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name
    }