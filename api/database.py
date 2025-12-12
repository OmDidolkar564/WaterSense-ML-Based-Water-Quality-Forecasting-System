import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

supabase: Client = None

if url and key:
    try:
        supabase = create_client(url, key)
        print("✅ Supabase client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase: {e}")
else:
    print("⚠️ Supabase credentials missing (SUPABASE_URL, SUPABASE_KEY)")

def get_supabase_client() -> Client:
    return supabase
