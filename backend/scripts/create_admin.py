import os
import sys
from sqlalchemy.orm import Session
from database import SessionLocal
from db_models import User, UserRole
from auth.utils import get_password_hash

def create_admin(username, email, password):
    db: Session = SessionLocal()
    try:
        # Check if user exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"User {username} already exists. Updating password and setting role to ADMIN.")
            existing.hashed_password = get_password_hash(password)
            existing.role = UserRole.ADMIN
            db.commit()
            print("Successfully updated user to ADMIN.")
            return

        admin_user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN
        )
        db.add(admin_user)
        db.commit()
        print(f"Successfully created ADMIN user: {username}")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_admin.py <username> <email> <password>")
        sys.exit(1)
    
    u, e, p = sys.argv[1:4]
    create_admin(u, e, p)
