import joblib
try:
    m = joblib.load('backend/enhanced_models.pkl')
    print(f"TDS Model: {type(m.get('tds_model'))}")
    print(f"Potability Model: {type(m.get('potability_model'))}")
except Exception as e:
    print(f"Error: {e}")
