from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

db = SessionLocal()

# Add Owner if not exists
owner_email = "dueno@rosa.com"
if not db.query(models.User).filter(models.User.email == owner_email).first():
    db.add(models.User(
        email=owner_email,
        password="dueno123",
        role="owner",
        name="Dueño Rosa Elena"
    ))
    db.commit()
    print(f"Added owner: {owner_email}")
else:
    print(f"Owner {owner_email} already exists.")

# Rename soporte if needed
admin_email = "soporte@rosa.com"
old_admin = db.query(models.User).filter(models.User.email == "admin@rosa.com").first()
if old_admin:
    old_admin.email = admin_email
    old_admin.password = "admin123"
    old_admin.name = "Soporte Técnico"
    db.commit()
    print(f"Updated admin to: {admin_email}")

db.close()
