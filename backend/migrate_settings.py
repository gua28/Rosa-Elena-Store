import sqlite3
import os

db_path = 'creaciones.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create settings table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR PRIMARY KEY,
        value VARCHAR
    )
    """)
    
    conn.commit()
    conn.close()
    print("Settings table created.")
else:
    print("Database not found.")
