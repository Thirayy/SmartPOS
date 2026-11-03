from pydantic import BaseModel


class BusinessResponse(BaseModel):
    id: int
    owner_user_id: int
    name: str
    category: str
    location: str

    class Config:
        from_attributes = True


class BusinessUpdate(BaseModel):
    name: str
    category: str
    location: str
