import socket

def check_port(host, port):
    sc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sc.settimeout(5)
    try:
        sc.connect((host, port))
        print(f"Port {port} is OPEN on {host}")
    except Exception as e:
        print(f"Port {port} is CLOSED or unreachable on {host}: {e}")
    finally:
        sc.close()

check_port("ghjvojncdugaifoxpwex.supabase.co", 5432)
check_port("db.ghjvojncdugaifoxpwex.supabase.co", 5432)
check_port("aws-1-us-east-1.pooler.supabase.com", 6543)
check_port("aws-1-us-east-1.pooler.supabase.com", 5432)
