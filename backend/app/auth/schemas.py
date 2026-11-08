from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    business_name: str = Field(min_length=1, max_length=120)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int
    business_id: int | None = None


class UserProfile(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    profile_image_url: str | None = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    email: EmailStr
    full_name: str


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str