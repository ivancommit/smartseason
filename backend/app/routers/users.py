from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_admin, hash_password
from app.models.models import User
from app.schemas.schemas import UserResponse, UserCreate

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def get_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.role == "agent").all()
    return users

@router.post("", response_model=UserResponse)
def create_user(request: UserCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if request.role != "agent":
        raise HTTPException(status_code=400, detail="Can only create agent accounts")
    
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed = hash_password(request.password)
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=hashed,
        role="agent"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.delete("/{user_id}")
def delete_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if str(admin.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete self")
        
    user = db.query(User).filter(str(User.id) == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "Agent deleted successfully"}
