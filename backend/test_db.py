import models
from database import SessionLocal
import datetime

db = SessionLocal()
try:
    print("Creating order...")
    new_order = models.Order(
        customer_name="Test Client",
        total=10.0,
        status="procesando",
        timestamp=datetime.datetime.now().isoformat(),
        payment_method="Test",
        payment_reference="12345"
    )
    db.add(new_order)
    print("Committing...")
    db.commit()
    print("Success!")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
