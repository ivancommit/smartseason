from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.security import get_current_user, compute_field_status
from app.models.models import User, Field, FieldUpdate

router = APIRouter()

@router.get("")
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Field)
    if current_user.role == "agent":
        query = query.filter(Field.assigned_agent_id == current_user.id)
        
    fields = query.all()
    
    total_fields = len(fields)
    by_status = {"active": 0, "at_risk": 0, "completed": 0}
    by_stage = {"planted": 0, "growing": 0, "ready": 0, "harvested": 0}
    
    field_ids = []
    
    for field in fields:
        field_ids.append(field.id)
        last_update = db.query(FieldUpdate).filter(FieldUpdate.field_id == field.id).order_by(FieldUpdate.created_at.desc()).first()
        last_update_at = last_update.created_at if last_update else None
        
        status_str = compute_field_status(field.stage, field.planting_date, last_update_at)
        
        by_status[status_str] = by_status.get(status_str, 0) + 1
        by_stage[field.stage] = by_stage.get(field.stage, 0) + 1
        
    recent_updates_query = db.query(FieldUpdate).filter(FieldUpdate.field_id.in_(field_ids) if field_ids else False).order_by(FieldUpdate.created_at.desc()).limit(5)
    recent_updates = []
    for update in recent_updates_query.all():
        recent_updates.append({
            "field_name": update.field.name,
            "agent_name": update.agent.name,
            "note": update.note,
            "stage": update.stage,
            "created_at": update.created_at.isoformat()
        })
        
    return {
        "total_fields": total_fields,
        "by_status": by_status,
        "by_stage": by_stage,
        "recent_updates": recent_updates
    }
