from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Field, FieldUpdate
from app.schemas.schemas import FieldUpdateResponse, FieldUpdateCreate

router = APIRouter()

STAGE_ORDER = ["planted", "growing", "ready", "harvested"]

@router.get("/{field_id}/updates", response_model=List[FieldUpdateResponse])
def get_updates(field_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).filter(str(Field.id) == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    if current_user.role == "agent" and str(field.assigned_agent_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to this field")
        
    updates = db.query(FieldUpdate).options(joinedload(FieldUpdate.agent)).filter(FieldUpdate.field_id == field.id).order_by(FieldUpdate.created_at.desc()).all()
    return updates

@router.post("/{field_id}/updates", response_model=FieldUpdateResponse)
def create_update(field_id: str, request: FieldUpdateCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).filter(str(Field.id) == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    if current_user.role == "agent" and str(field.assigned_agent_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to this field")
        
    new_stage = request.stage
    current_idx = STAGE_ORDER.index(field.stage)
    try:
        new_idx = STAGE_ORDER.index(new_stage)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid stage")
        
    if new_idx != current_idx + 1:
        raise HTTPException(status_code=400, detail="Stage can only advance one step forward")
        
    field.stage = new_stage
    field.updated_at = datetime.now()
    
    new_update = FieldUpdate(
        field_id=field.id,
        agent_id=current_user.id,
        stage=new_stage,
        note=request.note
    )
    db.add(new_update)
    db.commit()
    db.refresh(new_update)
    
    new_update = db.query(FieldUpdate).options(joinedload(FieldUpdate.agent)).filter(FieldUpdate.id == new_update.id).first()
    
    return new_update
