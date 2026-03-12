import sqlite3
import os

db_path = r'c:\Users\a\Desktop\Bruno2\backend\creaciones.db'

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if columns exist in orders
    cursor.execute("PRAGMA table_info(orders)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'customer_phone' not in columns:
        print("Adding customer_phone to orders")
        cursor.execute("ALTER TABLE orders ADD COLUMN customer_phone TEXT")
    
    if 'customer_address' not in columns:
        print("Adding customer_address to orders")
        cursor.execute("ALTER TABLE orders ADD COLUMN customer_address TEXT")
        
    conn.commit()
    conn.close()
    print("Migration complete")
else:
    print("Database not found")
