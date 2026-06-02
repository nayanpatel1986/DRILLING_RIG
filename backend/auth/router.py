import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from db_models import User, UserRole
from .utils import verify_password, get_password_hash, create_access_token
from pydantic import BaseModel
from datetime import timedelta
from typing import Optional

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str

class PinVerify(BaseModel):
    pin: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: Optional[str] = None

class UserResponse(BaseModel):
    username: str
    email: str
    role: str
    class Config:
        orm_mode = True


def _ensure_unique_user_fields(user: UserCreate, db: Session):
    existing_username = db.query(User).filter(User.username == user.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already registered")

    existing_email = db.query(User).filter(User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")


def _create_user_record(user: UserCreate, db: Session, role: str) -> User:
    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        role=role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def _normalize_role(role: Optional[str], default: str = UserRole.VIEWER.value) -> str:
    if role is None:
        return default

    normalized = role.strip().lower()
    valid_roles = {item.value for item in UserRole}
    if normalized not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed roles: {', '.join(sorted(valid_roles))}",
        )
    return normalized

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    _ensure_unique_user_fields(user, db)
    ENV = os.getenv("ENV", "development").lower()
    user_count = db.query(User).count()
    
    # SECURITY: Disable public registration in production after the initial bootstrap user.
    # Once an admin exists, new users must be created through the authenticated admin flow.
    if ENV == "production":
        if user_count > 0:
             raise HTTPException(status_code=403, detail="Public registration disabled. Contact system administrator.")
        
    # Bootstrap the first user as admin so the system can be configured.
    # All subsequent public registrations, when allowed, are viewers.
    role = UserRole.ADMIN.value if user_count == 0 else UserRole.VIEWER.value
    return _create_user_record(user, db, role)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    from .utils import ACCESS_TOKEN_EXPIRE_MINUTES
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
    }

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # Simple decode, in real app verify sub
    from jose import JWTError, jwt
    from .utils import SECRET_KEY, ALGORITHM
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_operator_or_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in {UserRole.ADMIN.value, UserRole.OPERATOR.value}:
        raise HTTPException(status_code=403, detail="Operator or admin access required")
    return current_user

@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).all()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    _ensure_unique_user_fields(user, db)
    role = _normalize_role(user.role)
    return _create_user_record(user, db, role=role)

@router.post("/verify-pin")
async def verify_pin(data: PinVerify):
    import os
    manager_pin = os.getenv("MANAGER_PIN", "").strip()
    if not manager_pin:
        raise HTTPException(status_code=500, detail="MANAGER_PIN not configured in environment")
        
    if data.pin == manager_pin:
        return {"success": True}
    raise HTTPException(status_code=401, detail="Invalid Manager PIN")
