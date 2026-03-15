import sqlite3
import os

db_path = 'backend/creaciones.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Tablas encontradas: {tables}")
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"Tabla {table_name}: {count} registros")
    conn.close()
else:
    print("Archivo creaciones.db no encontrado en el directorio actual.")
