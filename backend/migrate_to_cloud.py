import sqlite3
import psycopg2
import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SQLITE_PATH = "creaciones.db"
POSTGRES_URL = os.getenv("DATABASE_URL")

if POSTGRES_URL.startswith("postgres://"):
    POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql://", 1)

def migrate():
    print("🚀 Starting Data Migration to Cloud...")
    
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_cur = sqlite_conn.cursor()
    
    pg_conn = psycopg2.connect(POSTGRES_URL)
    pg_cur = pg_conn.cursor()

    try:
        # 1. Products
        print("📦 Migrating Products...")
        sqlite_cur.execute("SELECT name, category, price, stock, image, description FROM products")
        products = sqlite_cur.fetchall()
        pg_cur.execute("DELETE FROM products") 
        for p in products:
            pg_cur.execute("INSERT INTO products (name, category, price, stock, image, description) VALUES (%s, %s, %s, %s, %s, %s)", p)
        print(f"✅ Migrated {len(products)} products.")

        # 2. Orders (Flexible Migration)
        print("🛒 Migrating Orders...")
        sqlite_cur.execute("PRAGMA table_info(orders)")
        sqlite_cols = [c[1] for c in sqlite_cur.fetchall()]
        print(f"Columns found in SQLite orders: {sqlite_cols}")
        
        # Mapping SQLite -> Postgres
        mapping = {
            "total": "total",
            "amount": "total", # if using amount instead of total
            "customer_name": "customer_name",
            "customer_phone": "customer_phone",
            "customer_address": "customer_address",
            "status": "status",
            "timestamp": "timestamp",
            "created_at": "timestamp",
            "items_json": "items_json",
            "payment_method": "payment_method",
            "payment_reference": "payment_reference",
            "payment_proof": "payment_proof"
        }
        
        available_sqlite_cols = [col for col in mapping.keys() if col in sqlite_cols]
        # Avoid duplicate target columns if both 'total' and 'amount' exists (unlikely here but just in case)
        target_cols = []
        source_cols = []
        seen_targets = set()
        for s_col in available_sqlite_cols:
            t_col = mapping[s_col]
            if t_col not in seen_targets:
                target_cols.append(t_col)
                source_cols.append(s_col)
                seen_targets.add(t_col)

        query = f"SELECT {', '.join(source_cols)} FROM orders"
        sqlite_cur.execute(query)
        orders = sqlite_cur.fetchall()
        
        pg_cur.execute("DELETE FROM orders CASCADE") # Use cascade to clear order_items if needed
        pg_cur.execute("DELETE FROM order_items")
        
        for o in orders:
            placeholders = ", ".join(["%s"] * len(o))
            pg_cur.execute(f"INSERT INTO orders ({', '.join(target_cols)}) VALUES ({placeholders})", o)
        print(f"✅ Migrated {len(orders)} orders.")

        # 4. Settings
        print("⚙️ Migrating Settings...")
        sqlite_cur.execute("SELECT key, value FROM settings")
        settings = sqlite_cur.fetchall()
        for s in settings:
            pg_cur.execute("INSERT INTO settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", s)
        print("✅ Settings synchronized.")

        pg_conn.commit()
        print("\n✨ MIGRATION COMPLETED SUCCESSFULLY! ✨")

    except Exception as e:
        pg_conn.rollback()
        print(f"❌ Migration failed: {e}")
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()
