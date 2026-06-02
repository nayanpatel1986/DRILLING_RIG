from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db
from db_models import SystemPreference, User
from auth.router import get_current_user
from services.websocket_server import ws_manager
from typing import Dict, Any
import json

router = APIRouter(prefix="/preferences", tags=["preferences"])

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/{key}")
def get_preference(key: str, db: Session = Depends(get_db)):
    pref = db.query(SystemPreference).filter(SystemPreference.key == key).first()
    if pref:
        try:
            return {"key": key, "value": json.loads(pref.value)}
        except json.JSONDecodeError:
            return {"key": key, "value": pref.value}
    return {"key": key, "value": None}

@router.post("/{key}")
async def set_preference(
    key: str, 
    value: Any = Body(...), 
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    pref = db.query(SystemPreference).filter(SystemPreference.key == key).first()
    val_str = json.dumps(value)
    
    if pref:
        pref.value = val_str
    else:
        pref = SystemPreference(key=key, value=val_str)
        db.add(pref)
        
    db.commit()
    db.refresh(pref)
    
    # Broadcast preference update via WebSocket for real-time synchronization across all devices
    try:
        await ws_manager.broadcast({
            "_type": "preference_updated",
            "key": key,
            "value": value
        })
    except Exception as e:
        # Prevent preference save failure if WebSocket broadcast fails
        pass
        
    return {"key": pref.key, "value": value}
