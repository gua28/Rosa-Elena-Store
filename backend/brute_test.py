import psycopg2

passwords = ["ELENITAROSA9912", "elenitarosa9912", "Elenitarosa9912"]
host = "aws-1-us-east-1.pooler.supabase.com"
user = "postgres.ghjvojncdugaifoxpwex"

for port in [6543, 5432]:
    print(f"\n--- Testing Port {port} ---")
    for pw in passwords:
        print(f"Testing password: {pw}")
        try:
            conn = psycopg2.connect(
                dbname="postgres",
                user=user,
                password=pw,
                host=host,
                port=port,
                sslmode="require"
            )
            print(f"SUCCESS with {pw} on port {port}!")
            conn.close()
            exit(0)
        except Exception as e:
            print(f"FAILED with {pw}: {e}")
