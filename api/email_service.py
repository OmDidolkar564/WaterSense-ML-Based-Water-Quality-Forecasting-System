import os
import resend
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv('RESEND_API_KEY')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

def send_alert_email(to_email: str, district_name: str, wqi_value: float):
    """
    Send an alert email using Resend.
    Returns True if successful, False otherwise.
    """
    if not RESEND_API_KEY:
        print("Warning: RESEND_API_KEY not found. Email not sent.")
        return False

    try:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
            <h1 style="color: #d32f2f;">⚠️ Groundwater Quality Alert</h1>
            <p>This is an automated alert for <strong>{district_name}</strong>.</p>
            <p>The latest Water Quality Index (WQI) reported is: <strong style="font-size: 1.2em;">{wqi_value:.2f}</strong></p>
            <p>This level is considered <span style="color: red; font-weight: bold;">UNSAFE</span> or requires attention.</p>
            <hr>
            <p style="font-size: 0.9em; color: #666;">
                You are receiving this because you subscribed to alerts for {district_name}.
                <br>
                Groundwater ML Platform
            </p>
        </div>
        """

        r = resend.Emails.send({
            "from": "Groundwater ML <onboarding@resend.dev>", # Default test sender for free tier
            "to": to_email,
            "subject": f"⚠️ Critical Alert: {district_name} Water Quality",
            "html": html_content
        })
        print(f"✅ Email sent to {to_email}: {r}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False
