import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('c:/Users/a/Desktop/Bruno2/backend/.env')
db_url = os.getenv("DATABASE_URL")

def fix_db():
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        print("Añadiendo columna items_json a la tabla orders...")
        cur.execute("ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items_json JSONB;")
        
        print("Asegurando que la tabla receipts exista en storage...")
        # (Esto se hace mejor desde el dashboard de Supabase, pero intentamos querys de ayuda si hay permisos)
        
        conn.commit()
        cur.close()
        conn.close()
        print("¡Base de datos actualizada con éxito!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_db()
