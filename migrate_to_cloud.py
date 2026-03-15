import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

# Conexión Local (SQLite)
lite_conn = sqlite3.connect('backend/creaciones.db')
lite_cur = lite_conn.cursor()

# Conexión Nube (PostgreSQL)
pg_url = os.getenv("DATABASE_URL")
if not pg_url:
    print("ERROR: No se encontró DATABASE_URL en el archivo .env")
    exit()

try:
    pg_conn = psycopg2.connect(pg_url)
    pg_cur = pg_conn.cursor()
except Exception as e:
    print(f"ERROR: No se pudo conectar a la nube: {e}")
    exit()

def migrate_table(table_name, columns):
    print(f"Migrando tabla {table_name}...")
    lite_cur.execute(f"SELECT {', '.join(columns)} FROM {table_name}")
    rows = lite_cur.fetchall()
    
    if not rows:
        print(f"  Tabla {table_name} está vacía.")
        return

    # Limpiar tabla en la nube antes de insertar para evitar duplicados (o conflictos de ID)
    # Nota: Usamos TRUNCATE ... CASCADE para limpiar dependencias
    pg_cur.execute(f"TRUNCATE TABLE {table_name} CASCADE")
    
    query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES %s"
    execute_values(pg_cur, query, rows)
    print(f"  Insertados {len(rows)} registros en {table_name}.")

# 1. Migrar Usuarios
migrate_table("users", ["id", "email", "password", "role", "name", "phone", "address"])

# 2. Migrar Productos
migrate_table("products", ["id", "name", "price", "category", "image", "description", "stock"])

# 3. Migrar Pedidos
migrate_table("orders", ["id", "user_id", "customer_name", "customer_phone", "customer_address", "total", "status", "timestamp", "payment_proof", "payment_method", "payment_reference"])

# 4. Migrar Items de Pedidos
migrate_table("order_items", ["id", "order_id", "product_id", "product_name", "price", "quantity"])

# 5. Migrar Logs de Inventario
migrate_table("inventory_logs", ["id", "product_id", "change_type", "quantity_changed", "previous_stock", "new_stock", "reason", "timestamp"])

# 6. Migrar Configuraciones
migrate_table("settings", ["key", "value"])

# Ajustar secuencias de ID en Postgres
tables_with_id = ["users", "products", "orders", "order_items", "inventory_logs"]
for table in tables_with_id:
    pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM {table}")

pg_conn.commit()

lite_conn.close()
pg_conn.close()

print("\n¡MIGRACIÓN COMPLETADA EXITOSAMENTE! 🎉")
print("Ahora tus datos locales están sincronizados con la nube.")
