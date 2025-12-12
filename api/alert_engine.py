import pandas as pd
import os
from datetime import datetime
from email_service import send_alert_email
from subscription_manager import get_all_subscriptions
from database import get_supabase_client

# Thresholds
WQI_CRITICAL_THRESHOLD = 150.0  # Unsuitable
WQI_WARNING_THRESHOLD = 100.0   # Very Poor

def check_and_send_alerts():
    """
    Scheduled job to check water quality predictions and send alerts.
    """
    print(f"⏰ [{datetime.now().strftime('%H:%M:%S')}] Running Predictive Alert Check...")
    
    # 1. Load latest predictions (acting as our forecast source)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    predictions_path = os.path.join(current_dir, 'enhanced_predictions.csv')
    
    if not os.path.exists(predictions_path):
        print("❌ Alert Engine: Predictions file not found.")
        return

    try:
        df = pd.read_csv(predictions_path)
    except Exception as e:
        print(f"❌ Alert Engine: Error loading data: {e}")
        return

    # 2. Get all subscribers
    subs = get_all_subscriptions()
    if not subs:
        print("ℹ️ Alert Engine: No subscribers found.")
        return

    sent_count = 0
    
    # 3. Check each subscription
    for sub in subs:
        email = sub.get('email')
        loc = sub.get('location') # District or State name
        sub_type = sub.get('type', 'district')
        
        if not email or not loc:
            continue

        # Filter data for this location
        if sub_type == 'district':
            # Match District (case insensitive)
            loc_data = df[df['District'].str.lower() == loc.lower()]
        else:
            # Match State
            loc_data = df[df['State'].str.lower() == loc.lower()]
            
        if loc_data.empty:
            continue
            
        # Get the latest/worst prediction for this location
        # For demo, we take the average WQI of the location to represent "current status"
        avg_wqi = loc_data['WQI'].mean()
        
        # Trigger condition
        if avg_wqi >= WQI_WARNING_THRESHOLD:
            # Simple rate limiting logic could go here (e.g. check last_sent)
            # For now, we send every time the job runs (demo mode)
            
            print(f"⚠️ Alert Trigger: {loc} ({sub_type}) WQI={avg_wqi:.1f}")
            
            if send_alert_email(email, loc, avg_wqi):
                sent_count += 1
                
    if sent_count > 0:
        print(f"✅ Alert Engine: Sent {sent_count} alert emails.")
    else:
        print("✅ Alert Engine: Check complete. No alerts needed or sent.")
