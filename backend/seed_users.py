"""
DrillBit User Seed Script
-------------------------
Runs on every container startup before Uvicorn.
Creates essential users if they don't already exist.
This ensures login always works on any fresh deployment.

HOW TO ADD PERMANENT USERS:
  Add entries to the SEED_USERS list below.
  Each entry is: { username, email, password, role }
  Valid roles: admin, operator, viewer

This script is IDEMPOTENT - it checks if the user exists first.
"""

import os
import sys

# Add app to path so we can import modules
sys.path.insert(0, '/app')

from database import SessionLocal, engine, Base
from db_models import User, UserRole
from auth.utils import get_password_hash

# ─────────────────────────────────────────────────────────────
# PERMANENT SEED USERS — Edit this list to add permanent accounts
# These users will be created on any fresh deployment automatically.
# ─────────────────────────────────────────────────────────────
SEED_USERS = [
    {
        "username": os.getenv("ADMIN_USERNAME", "Drillbit_Twin"),
        "email":    os.getenv("ADMIN_EMAIL",    "admin@drillbit.local"),
        "password": os.getenv("ADMIN_PASSWORD", "Ongc@123"),
        "role":     UserRole.ADMIN.value,
    },
    {
        "username": "Driller",
        "email":    "driller@drillbit.local",
        "password": "operator123",
        "role":     UserRole.OPERATOR.value,
    },
]
# ─────────────────────────────────────────────────────────────


def seed():
    """Create seed users if they don't exist. Safe to call repeatedly."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    created = []
    skipped = []

    try:
        for user_data in SEED_USERS:
            username = user_data["username"]
            existing = db.query(User).filter(User.username == username).first()

            if existing:
                skipped.append(username)
                continue

            new_user = User(
                username=username,
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"],
            )
            db.add(new_user)
            created.append(f"{username} ({user_data['role']})")

        db.commit()
    finally:
        db.close()

    if created:
        print(f"[Seed] Created users: {', '.join(created)}", flush=True)
    if skipped:
        print(f"[Seed] Already exist (skipped): {', '.join(skipped)}", flush=True)
    if not created and not skipped:
        print("[Seed] No seed users configured.", flush=True)


if __name__ == "__main__":
    seed()
