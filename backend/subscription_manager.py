import json
import os
from typing import List, Dict
from database import get_supabase_client

# Store in the same directory as this file (fallback)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SUBS_FILE = os.path.join(CURRENT_DIR, 'subscriptions.json')

def _load_subs() -> List[Dict]:
    """Load subscriptions from Supabase or json file (fallback)"""
    client = get_supabase_client()
    if client:
        try:
            response = client.table('subscriptions').select("*").execute()
            return response.data
        except Exception as e:
            print(f"⚠️ Supabase fetch error: {e}")
            # Fallback to local file if DB fails
    
    if not os.path.exists(SUBS_FILE):
        return []
    try:
        with open(SUBS_FILE, 'r') as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error loading subscriptions: {e}")
        return []

def _save_subs(subs: List[Dict]):
    """Save is deprecated for DB, only used for JSON fallback"""
    try:
        with open(SUBS_FILE, 'w') as f:
            json.dump(subs, f, indent=2)
    except Exception as e:
        print(f"Error saving subscriptions: {e}")

def add_subscription(email: str, location: str, sub_type: str = 'district') -> bool:
    """
    Add a new subscription. 
    Returns True if added, False if already exists.
    """
    client = get_supabase_client()
    
    # Normalize inputs
    email = email.lower().strip()
    location = location.strip()
    sub_type = sub_type.lower().strip()
    
    if client:
        try:
            # Check existing
            res = client.table('subscriptions').select("*").eq('email', email).eq('location', location).eq('type', sub_type).execute()
            if res.data:
                return False
            
            # Insert
            client.table('subscriptions').insert({
                'email': email,
                'location': location,
                'type': sub_type
            }).execute()
            return True
        except Exception as e:
            print(f"⚠️ Supabase insert error: {e}")
            return False

    # Fallback to JSON
    subs = _load_subs()
    for sub in subs:
        existing_loc = sub.get('location', sub.get('district', ''))
        existing_type = sub.get('type', 'district')
        if (sub.get('email') == email and 
            existing_loc.lower() == location.lower() and 
            existing_type == sub_type):
            return False 
    
    subs.append({
        'email': email,
        'location': location,
        'type': sub_type,
        'created_at': "new"
    })
    _save_subs(subs)
    return True

def get_subscribers_for_location(location: str, sub_type: str = 'district') -> List[Dict]:
    """Get all subscribers for a specific location and type"""
    # Use load_subs which handles DB/File abstraction
    subs = _load_subs()
    target_loc = location.lower().strip()
    target_type = sub_type.lower().strip()
    
    matches = []
    for s in subs:
        s_loc = s.get('location', s.get('district', '')).lower()
        s_type = s.get('type', 'district')
        if s_loc == target_loc and s_type == target_type:
            matches.append(s)
            
    return matches

def get_all_subscriptions() -> List[Dict]:
    """Get all subscriptions"""
    return _load_subs()
