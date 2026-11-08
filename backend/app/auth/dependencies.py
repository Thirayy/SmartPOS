from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth.models import User
from app.businesses.models import Business
from app.core.config import settings
from app.core.database import get_db
from app.members.models import ROLE_OWNER, BusinessMember

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class BusinessAccess:
    business: Business
    role: str
    membership: BusinessMember | None = None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Silakan login untuk mengakses data bisnis",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=401,
            detail="Sesi login tidak valid atau sudah kedaluwarsa",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Akun tidak ditemukan",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_business_access(
    business_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BusinessAccess:
    business = db.query(Business).filter(Business.id == business_id).first()
    if business is None:
        raise HTTPException(status_code=404, detail="Bisnis tidak ditemukan")

    if business.owner_user_id == current_user.id:
        return BusinessAccess(business=business, role=ROLE_OWNER)

    membership = (
        db.query(BusinessMember)
        .filter(
            BusinessMember.business_id == business_id,
            BusinessMember.user_id == current_user.id,
            BusinessMember.is_active.is_(True),
        )
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=404, detail="Bisnis tidak ditemukan")

    return BusinessAccess(
        business=business,
        role=membership.role,
        membership=membership,
    )


def authorize_business_access(
    access: BusinessAccess = Depends(get_business_access),
) -> Business:
    return access.business


def get_business_role(
    access: BusinessAccess = Depends(get_business_access),
) -> str:
    return access.role


def require_roles(*allowed_roles: str):
    def dependency(role: str = Depends(get_business_role)) -> str:
        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Anda tidak memiliki izin untuk tindakan ini",
            )
        return role

    return dependency
