from datetime import datetime, timedelta, timezone
import base64
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from jose import jwt
from app.core.database import get_db
from app.auth.models import User
from app.businesses.models import Business
from app.auth.schemas import PasswordUpdate, TokenResponse, UserCreate, UserLogin, UserProfile, UserProfileUpdate
from app.auth.dependencies import get_current_user
from app.auth.passwords import pwd_context
from app.core.config import settings
from app.members.models import ROLE_OWNER, BusinessMember

router = APIRouter(prefix="/auth", tags=["Auth"])
MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024
ALLOWED_PROFILE_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
PROFILE_IMAGE_SIGNATURES = {
    "image/jpeg": lambda image: image.startswith(b"\xff\xd8\xff"),
    "image/png": lambda image: image.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda image: image.startswith(b"RIFF") and image[8:12] == b"WEBP",
}


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
        role=ROLE_OWNER,
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
    db.flush()
    db.add(
        BusinessMember(
            business_id=business.id,
            user_id=new_user.id,
            role=ROLE_OWNER,
            is_active=True,
        )
    )
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
        
    membership = (
        db.query(BusinessMember)
        .filter(
            BusinessMember.user_id == user.id,
            BusinessMember.is_active.is_(True),
        )
        .order_by(BusinessMember.id)
        .first()
    )
    if membership is not None:
        business_id = membership.business_id
        role = membership.role
    elif user.businesses:
        business_id = user.businesses[0].id
        role = ROLE_OWNER
    else:
        business_id = None
        role = user.role

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "role": role,
        "full_name": user.full_name,
        "user_id": user.id,
        "business_id": business_id,
    }


@router.get("/me", response_model=UserProfile)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/me/avatar", response_model=UserProfile)
async def upload_profile_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_type = file.content_type
    if content_type is None or content_type not in ALLOWED_PROFILE_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Gunakan gambar JPG, PNG, atau WebP.")

    image_data = await file.read(MAX_PROFILE_IMAGE_SIZE + 1)
    if len(image_data) > MAX_PROFILE_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Ukuran foto maksimal 2 MB.")
    if not image_data:
        raise HTTPException(status_code=400, detail="File foto kosong.")
    if not PROFILE_IMAGE_SIGNATURES[content_type](image_data):
        raise HTTPException(status_code=400, detail="File tidak sesuai dengan format gambar yang dipilih.")

    encoded_image = base64.b64encode(image_data).decode("ascii")
    current_user.profile_image_url = f"data:{content_type};base64,{encoded_image}"
    db.commit()
    db.refresh(current_user)
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