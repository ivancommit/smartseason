from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user, compute_field_status
from app.models.models import User, Field, FieldUpdate
from app.schemas.schemas import FieldResponse, FieldDetailResponse, FieldCreate

router = APIRouter()

STAGE_ORDER = ["planted", "growing", "ready", "harvested"]

def build_field_response(db: Session, field: Field):
    last_update = db.query(FieldUpdate).filter(FieldUpdate.field_id == field.id).order_by(FieldUpdate.created_at.desc()).first()
    last_update_at = last_update.created_at if last_update else None
    
    status_str = compute_field_status(field.stage, field.planting_date, last_update_at)
    
    field_dict = field.__dict__.copy()
    field_dict["status"] = status_str
    field_dict["last_update_at"] = last_update_at
    return field_dict

@router.get("", response_model=List[FieldResponse])
def get_fields(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Field).options(joinedload(Field.assigned_agent))
    if current_user.role == "agent":
        query = query.filter(Field.assigned_agent_id == current_user.id)
    
    fields = query.all()
    results = []
    for f in fields:
        results.append(build_field_response(db, f))
    return results

@router.post("", response_model=FieldResponse)
def create_field(request: FieldCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create fields")
    if request.stage != "planted":
        raise HTTPException(status_code=400, detail="Stage must be 'planted' on creation")
        
    new_field = Field(
        name=request.name,
        crop_type=request.crop_type,
        planting_date=request.planting_date,
        stage=request.stage,
        location=request.location,
        assigned_agent_id=request.assigned_agent_id
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    
    new_field = db.query(Field).options(joinedload(Field.assigned_agent)).filter(Field.id == new_field.id).first()
    return build_field_response(db, new_field)

@router.get("/{field_id}", response_model=FieldDetailResponse)
def get_field(field_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).options(joinedload(Field.assigned_agent)).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    if current_user.role == "agent" and str(field.assigned_agent_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to this field")
        
    resp = build_field_response(db, field)
    updates = db.query(FieldUpdate).options(joinedload(FieldUpdate.agent)).filter(FieldUpdate.field_id == field.id).order_by(FieldUpdate.created_at.desc()).all()
    resp["updates"] = updates
    return resp

@router.put("/{field_id}", response_model=FieldResponse)
def update_field(field_id: str, request: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    if current_user.role == "agent" and str(field.assigned_agent_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not assigned to this field")
        
    if current_user.role == "agent":
        if "stage" not in request or "note" not in request:
            raise HTTPException(status_code=400, detail="Agent must provide stage and note")
        new_stage = request["stage"]
        
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
            note=request["note"]
        )
        db.add(new_update)
        db.commit()
    else:
        if "stage" in request and request["stage"] != field.stage:
            new_stage = request["stage"]
            current_idx = STAGE_ORDER.index(field.stage)
            try:
                new_idx = STAGE_ORDER.index(new_stage)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid stage")
                
            if new_idx != current_idx + 1:
                raise HTTPException(status_code=400, detail="Stage can only advance one step forward")
                
            field.stage = new_stage
            
            note = request.get("note", "Stage advanced by admin")
            new_update = FieldUpdate(
                field_id=field.id,
                agent_id=current_user.id,
                stage=new_stage,
                note=note
            )
            db.add(new_update)
            
        for key in ["name", "crop_type", "planting_date", "location", "assigned_agent_id"]:
            if key in request:
                setattr(field, key, request[key])
        field.updated_at = datetime.now()
        db.commit()
        
    field = db.query(Field).options(joinedload(Field.assigned_agent)).filter(Field.id == field.id).first()
    return build_field_response(db, field)

@router.delete("/{field_id}")
def delete_field(field_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete fields")
        
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    db.delete(field)
    db.commit()
    return {"message": "Field deleted successfully"}
