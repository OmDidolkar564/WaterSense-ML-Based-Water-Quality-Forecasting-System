import json
import os
from database import get_supabase_client

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SUBS_FILE = os.path.join(CURRENT_DIR, 'subscriptions.json')

def migrate():
    print("🚀 Starting migration to Supabase...")
    
    client = get_supabase_client()
    if not client:
        print("❌ Supabase client not initialized. Check credentials in .env")
        return

    if not os.path.exists(SUBS_FILE):
        print("ℹ️ No local subscriptions.json found. Nothing to migrate.")
        return

    try:
        with open(SUBS_FILE, 'r') as f:
            data = json.load(f)
        
        if not data:
            print("ℹ️ subscriptions.json is empty.")
            return
            
        count = 0
        for item in data:
            email = item.get('email')
            # Handle variable naming from earlier versions
            location = item.get('location', item.get('district'))
            sub_type = item.get('type', 'district')
            
            if not email or not location:
                print(f"⚠️ Skipping invalid item: {item}")
                continue
                
            # Upsert (using email+location+type as unique key if unique constraint exists)
            # Or just ignore if exists
            try:
                res = client.table('subscriptions').select("*").eq('email', email).eq('location', location).eq('type', sub_type).execute()
                if not res.data:
                    client.table('subscriptions').insert({
                        'email': email,
                        'location': location,
                        'type': sub_type
                    }).execute()
                    count += 1
                    print(f"✅ Migrated: {email} -> {location} ({sub_type})")
                else:
                    print(f"⏩ Skipped (exists): {email} -> {location}")
            except Exception as e:
                print(f"❌ Error migrating {email}: {e}")
        
        print(f"\n🎉 Migration complete! {count} records imported.")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate()
