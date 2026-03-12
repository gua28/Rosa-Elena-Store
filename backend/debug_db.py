import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("DATABASE_URL")
print(f"Testing connection to: {url.split('@')[-1]}")

try:
    conn = psycopg2.connect(url)
    print("SUCCESS: Connected to the database!")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
