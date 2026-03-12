import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment or fallback to SQLite
# Get database URL from environment or fallback to SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./creaciones.db")

# SQLAlchemy requires 'postgresql://' instead of 'postgres://' which some providers use
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs 'check_same_thread' but Postgres doesn't
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Log the DB URL (safely masked) for debugging
masked_url = SQLALCHEMY_DATABASE_URL
if "@" in SQLALCHEMY_DATABASE_URL:
    parts = SQLALCHEMY_DATABASE_URL.split("@")
    host_part = parts[1]
    masked_url = f"postgresql://****@{host_part}"
print(f"DEBUG: Initialized DB logic. Using: {masked_url}")

try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args=connect_args,
        pool_pre_ping=True
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    print(f"ERROR: Could not create database engine: {e}")
    raise e

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
