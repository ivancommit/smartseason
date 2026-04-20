import os
import sys
from datetime import date, timedelta
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv()

from app.core.database import SessionLocal
from app.models.models import User, Field, FieldUpdate
from app.core.security import hash_password

def seed():
    db = SessionLocal()
    
    # 1. Create Users
    users = [
        {"name": "Season Admin", "email": "admin@smartseason.app", "password": "Admin1234!", "role": "admin"},
        {"name": "Amara Osei", "email": "amara@smartseason.app", "password": "Agent1234!", "role": "agent"},
        {"name": "Juma Kariuki", "email": "juma@smartseason.app", "password": "Agent1234!", "role": "agent"},
        {"name": "Fatima Nkosi", "email": "fatima@smartseason.app", "password": "Agent1234!", "role": "agent"},
    ]
    
    db_users = {}
    for u in users:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            new_u = User(name=u["name"], email=u["email"], password_hash=hash_password(u["password"]), role=u["role"])
            db.add(new_u)
            db.commit()
            db.refresh(new_u)
            db_users[u["email"]] = new_u
        else:
            db_users[u["email"]] = existing
            
    amara = db_users["amara@smartseason.app"]
    juma = db_users["juma@smartseason.app"]
    fatima = db_users["fatima@smartseason.app"]
    admin = db_users["admin@smartseason.app"]
    
    # 2. Create Fields
    db.query(FieldUpdate).delete()
    db.query(Field).delete()
    db.commit()
    
    fields_data = [
        {"name": "Nakuru North 1", "crop_type": "Maize", "stage": "planted", "days_ago": 5, "agent": amara, "loc": "Nakuru"},
        {"name": "Nakuru North 2", "crop_type": "Wheat", "stage": "planted", "days_ago": 20, "agent": amara, "loc": "Nakuru"},
        {"name": "Eldoret East", "crop_type": "Beans", "stage": "growing", "days_ago": 30, "agent": juma, "loc": "Eldoret"},
        {"name": "Eldoret West", "crop_type": "Tomatoes", "stage": "growing", "days_ago": 60, "agent": juma, "loc": "Eldoret"},
        {"name": "Kisumu Central", "crop_type": "Sorghum", "stage": "growing", "days_ago": 25, "agent": juma, "loc": "Kisumu"},
        {"name": "Meru Ridge 1", "crop_type": "Sunflower", "stage": "ready", "days_ago": 45, "agent": fatima, "loc": "Meru"},
        {"name": "Meru Ridge 2", "crop_type": "Maize", "stage": "ready", "days_ago": 55, "agent": fatima, "loc": "Meru"},
        {"name": "Nakuru South", "crop_type": "Wheat", "stage": "harvested", "days_ago": 70, "agent": amara, "loc": "Nakuru"},
        {"name": "Eldoret South", "crop_type": "Beans", "stage": "harvested", "days_ago": 80, "agent": juma, "loc": "Eldoret"},
        {"name": "Kisumu North", "crop_type": "Sorghum", "stage": "harvested", "days_ago": 65, "agent": fatima, "loc": "Kisumu"}
    ]
    
    db_fields = []
    for fd in fields_data:
        planting_date = date.today() - timedelta(days=fd["days_ago"])
        f = Field(
            name=fd["name"], 
            crop_type=fd["crop_type"], 
            planting_date=planting_date,
            stage=fd["stage"],
            location=fd["loc"],
            assigned_agent_id=fd["agent"].id
        )
        db.add(f)
        db.commit()
        db.refresh(f)
        db_fields.append(f)
        
        # 3. Create Updates
        if fd["stage"] != "planted":
            stages_to_add = []
            if fd["stage"] == "growing":
                stages_to_add = ["growing"]
            elif fd["stage"] == "ready":
                stages_to_add = ["growing", "ready"]
            elif fd["stage"] == "harvested":
                stages_to_add = ["growing", "ready", "harvested"]
                
            for s in stages_to_add:
                note = f"The field has properly advanced to the {s} stage. Crops are looking as expected with adequate moisture."
                new_update = FieldUpdate(
                    field_id=f.id,
                    agent_id=fd["agent"].id,
                    stage=s,
                    note=note
                )
                db.add(new_update)
            db.commit()

    print("Seed complete.")
    db.close()

if __name__ == "__main__":
    seed()
