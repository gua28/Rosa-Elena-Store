import sqlite3
import os

db_path = 'creaciones.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current columns in orders table
    cursor.execute("PRAGMA table_info(orders)")
    columns = [col[1] for col in cursor.fetchall()]
    
    # Add missing columns if they don't exist
    if 'payment_method' not in columns:
        print("Adding payment_method column...")
        cursor.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT")
    
    if 'payment_reference' not in columns:
        print("Adding payment_reference column...")
        cursor.execute("ALTER TABLE orders ADD COLUMN payment_reference TEXT")
    
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print("Database not found, no migration needed (it will be created with new schema).")
