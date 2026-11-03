from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import authorize_business_access
from app.businesses.models import Business
from app.businesses.schemas import BusinessResponse, BusinessUpdate
from app.core.database import get_db

router = APIRouter(
    prefix="/businesses/{business_id}",
    tags=["Businesses"],
    dependencies=[Depends(authorize_business_access)],
)


@router.get("", response_model=BusinessResponse)
def get_business(business: Business = Depends(authorize_business_access)):
    return business


@router.patch("", response_model=BusinessResponse)
def update_business(
    business_data: BusinessUpdate,
    business: Business = Depends(authorize_business_access),
    db: Session = Depends(get_db),
):
    business.name = business_data.name
    business.category = business_data.category
    business.location = business_data.location
    db.commit()
    db.refresh(business)
    return business
