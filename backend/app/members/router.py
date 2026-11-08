from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_business_access, require_roles
from app.auth.models import User
from app.auth.passwords import pwd_context
from app.core.database import get_db
from app.members.models import (
    ROLE_OWNER,
    BusinessMember,
)
from app.members.schemas import MemberCreate, MemberResponse, MemberUpdate

router = APIRouter(
    prefix="/businesses/{business_id}/members",
    tags=["Business Members"],
)


def _member_response(member: BusinessMember) -> MemberResponse:
    return MemberResponse(
        id=member.id,
        user_id=member.user_id,
        business_id=member.business_id,
        email=member.user.email,
        full_name=member.user.full_name,
        role=member.role,
        is_active=member.is_active,
        created_at=member.created_at,
    )


def _active_owner_count(db: Session, business_id: int) -> int:
    return (
        db.query(BusinessMember)
        .filter(
            BusinessMember.business_id == business_id,
            BusinessMember.role == ROLE_OWNER,
            BusinessMember.is_active.is_(True),
        )
        .count()
    )


@router.get(
    "/",
    response_model=list[MemberResponse],
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)
def list_members(business_id: int, db: Session = Depends(get_db)):
    members = (
        db.query(BusinessMember)
        .filter(BusinessMember.business_id == business_id)
        .order_by(BusinessMember.role, BusinessMember.id)
        .all()
    )
    return [_member_response(member) for member in members]


@router.post(
    "/",
    response_model=MemberResponse,
    dependencies=[Depends(require_roles("OWNER"))],
)
def create_member(
    business_id: int,
    payload: MemberCreate,
    db: Session = Depends(get_db),
):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        existing_membership = (
            db.query(BusinessMember)
            .filter(
                BusinessMember.business_id == business_id,
                BusinessMember.user_id == existing_user.id,
            )
            .first()
        )
        if existing_membership:
            raise HTTPException(
                status_code=400,
                detail="Pengguna sudah menjadi anggota bisnis ini",
            )
        user = existing_user
    else:
        user = User(
            email=payload.email,
            password_hash=pwd_context.hash(payload.password),
            full_name=payload.full_name.strip(),
            role=payload.role,
        )
        db.add(user)
        db.flush()

    member = BusinessMember(
        business_id=business_id,
        user_id=user.id,
        role=payload.role,
        is_active=True,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return _member_response(member)


@router.patch(
    "/{member_id}",
    response_model=MemberResponse,
    dependencies=[Depends(require_roles("OWNER"))],
)
def update_member(
    business_id: int,
    member_id: int,
    payload: MemberUpdate,
    db: Session = Depends(get_db),
    access=Depends(get_business_access),
):
    member = (
        db.query(BusinessMember)
        .filter(
            BusinessMember.id == member_id,
            BusinessMember.business_id == business_id,
        )
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Anggota tidak ditemukan")

    if member.user_id == access.business.owner_user_id:
        raise HTTPException(
            status_code=400,
            detail="Peran pemilik bisnis tidak dapat diubah dari halaman ini",
        )

    next_role = payload.role if payload.role is not None else member.role
    next_active = (
        payload.is_active if payload.is_active is not None else member.is_active
    )

    if member.role == ROLE_OWNER and (next_role != ROLE_OWNER or not next_active):
        if _active_owner_count(db, business_id) <= 1:
            raise HTTPException(
                status_code=400,
                detail="Bisnis harus memiliki minimal satu owner aktif",
            )

    member.role = next_role
    member.is_active = next_active
    db.commit()
    db.refresh(member)
    return _member_response(member)


@router.delete(
    "/{member_id}",
    response_model=MemberResponse,
    dependencies=[Depends(require_roles("OWNER"))],
)
def deactivate_member(
    business_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    access=Depends(get_business_access),
):
    member = (
        db.query(BusinessMember)
        .filter(
            BusinessMember.id == member_id,
            BusinessMember.business_id == business_id,
        )
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Anggota tidak ditemukan")
    if member.user_id == access.business.owner_user_id:
        raise HTTPException(
            status_code=400,
            detail="Pemilik bisnis tidak dapat dinonaktifkan",
        )
    if member.role == ROLE_OWNER and _active_owner_count(db, business_id) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Bisnis harus memiliki minimal satu owner aktif",
        )

    member.is_active = False
    db.commit()
    db.refresh(member)
    return _member_response(member)
