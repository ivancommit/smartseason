from pydantic import BaseModel, EmailStr, Field as PydanticField
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID

class UserBase(BaseModel):
    name: str = PydanticField(..., max_length=100)
    email: EmailStr
    role: str = PydanticField(..., max_length=10)

class UserCreate(UserBase):
    password: str = PydanticField(..., min_length=8)

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class AgentRef(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class FieldUpdateBase(BaseModel):
    note: str = PydanticField(..., min_length=10)
    stage: str = PydanticField(..., max_length=20)

class FieldUpdateCreate(FieldUpdateBase):
    pass

class FieldUpdateResponse(FieldUpdateBase):
    id: UUID
    created_at: datetime
    agent: AgentRef
    class Config:
        from_attributes = True

class FieldBase(BaseModel):
    name: str = PydanticField(..., max_length=150)
    crop_type: str = PydanticField(..., max_length=100)
    planting_date: date
    stage: str = PydanticField(..., max_length=20)
    location: Optional[str] = PydanticField(None, max_length=200)
    assigned_agent_id: Optional[UUID] = None

class FieldCreate(FieldBase):
    pass

class FieldBaseResponse(FieldBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class FieldResponse(FieldBaseResponse):
    status: str
    last_update_at: Optional[datetime]
    assigned_agent: Optional[AgentRef]
    
    class Config:
        from_attributes = True

class FieldDetailResponse(FieldResponse):
    updates: List[FieldUpdateResponse]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None
