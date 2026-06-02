from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Default to the docker service name 'postgres'
# Connection string: postgresql://user:password@host:port/dbname
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    # Build from components if partials exist, otherwise fail
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    db = os.getenv("POSTGRES_DB", "rig_manager")
    host = os.getenv("POSTGRES_HOST", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    
    if user and password:
        SQLALCHEMY_DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    else:
        raise RuntimeError(
            "DATABASE_URL or POSTGRES_USER/PASSWORD environment variables must be set. "
            "Insecure defaults have been removed for safety."
        )

# If running locally (not in docker) efficiently, we might need localhost
# SQLALCHEMY_DATABASE_URL = "postgresql://admin:password123@localhost:5432/rig_manager"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
