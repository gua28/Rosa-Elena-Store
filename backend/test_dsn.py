import psycopg2
import sys

dsn = "postgresql://postgres.ghjvojncdugaifoxpwex:RosaElena_Tienda_2025*@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
try:
    conn = psycopg2.connect(dsn)
    print("SUCCESS with DSN string!")
    conn.close()
except Exception as e:
    print(f"FAILED with DSN: {e}")
