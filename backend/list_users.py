from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

db = SessionLocal()
users = db.query(models.User).all()
print("Current Users in DB:")
for u in users:
    print(f"- {u.email} ({u.role})")
db.close()
