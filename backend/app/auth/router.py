from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt
from app.core.database import get_db
from app.auth.models import User
from app.businesses.models import Business
from app.auth.schemas import PasswordUpdate, TokenResponse, UserCreate, UserLogin, UserProfile, UserProfileUpdate
from app.auth.dependencies import get_current_user
from app.core.config import settings
from passlib.context import CryptContext

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user.id), "exp": expires_at},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


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
    db.flush()
    business = Business(
        owner_user_id=new_user.id,
        name=user_data.business_name,
        category="Umum",
        location="Belum diatur",
    )
    db.add(business)
    db.commit()
    db.refresh(new_user)
    db.refresh(business)
    
    return {
        "access_token": create_access_token(new_user),
        "token_type": "bearer",
        "role": new_user.role,
        "full_name": new_user.full_name,
        "user_id": new_user.id,
        "business_id": business.id,
    }

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not pwd_context.verify(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah")
        
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "user_id": user.id,
        "business_id": user.businesses[0].id if user.businesses else None,
    }


@router.get("/me", response_model=UserProfile)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserProfile)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_user = db.query(User).filter(
        User.email == profile_data.email,
        User.id != current_user.id,
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah digunakan akun lain")

    current_user.email = profile_data.email
    current_user.full_name = profile_data.full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/password")
def update_password(
    password_data: PasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not pwd_context.verify(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Kata sandi saat ini salah")
    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Kata sandi baru minimal 8 karakter")

    current_user.password_hash = pwd_context.hash(password_data.new_password)
    db.commit()
    return {"message": "Kata sandi berhasil diubah"}