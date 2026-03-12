from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models

db = SessionLocal()
product_count = db.query(models.Product).count()
order_count = db.query(models.Order).count()
user_count = db.query(models.User).count()

print(f"Cloud DB Stats (Supabase):")
print(f"- Products: {product_count}")
print(f"- Orders: {order_count}")
print(f"- Users: {user_count}")

if product_count > 0:
    print("\nRecent Products:")
    for p in db.query(models.Product).limit(5).all():
        print(f"  * {p.name}")

db.close()
