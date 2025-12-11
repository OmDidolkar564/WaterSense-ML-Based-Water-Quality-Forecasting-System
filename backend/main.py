"""
main.py
FastAPI Backend for Groundwater Quality ML System
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import json
from datetime import datetime
import io
import warnings
import os
import traceback
import atexit
from apscheduler.schedulers.background import BackgroundScheduler

# Internal Modules (Ensure these exist or comment out if not needed for this step)
try:
    from email_service import send_alert_email
    from subscription_manager import add_subscription, get_subscribers_for_location, get_all_subscriptions
    from alert_engine import check_and_send_alerts
except ImportError:
    # Dummy imports if not present, to prevent crash during this refactor
    print("⚠️ Warning: Email/Subscription modules not found. Mocking them.")
    def send_alert_email(*args, **kwargs): return True
    def add_subscription(*args, **kwargs): return True
    def get_subscribers_for_location(*args, **kwargs): return []
    def get_all_subscriptions(*args, **kwargs): return []
    def check_and_send_alerts(*args, **kwargs): pass

# Suppress warnings
warnings.filterwarnings('ignore')

app = FastAPI(
    title="Groundwater Quality ML API",
    description="Advanced ML API for groundwater quality prediction and risk assessment",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ============================================================================
# LOAD DATA (Unified Dataset)
# ============================================================================

try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    predictions_path = os.path.join(current_dir, 'enhanced_predictions.csv')
    
    if os.path.exists(predictions_path):
        # Use robust reading
        predictions_df = pd.read_csv(
            predictions_path, 
            encoding='utf-8', 
            on_bad_lines='skip'
        )
        
        # Ensure year is int
        if 'Year' in predictions_df.columns:
            predictions_df['Year'] = pd.to_numeric(predictions_df['Year'], errors='coerce').fillna(0).astype(int)
            
        print(f"✅ Data loaded: {len(predictions_df)} rows from {predictions_path}")
        print(f"   Columns: {list(predictions_df.columns[:5])}...")
    else:
        print(f"❌ File not found: {predictions_path}")
        predictions_df = pd.DataFrame()
except Exception as e:
    print(f"❌ Data load failed: {e}")
    traceback.print_exc()
    predictions_df = pd.DataFrame()

print("="*60 + "\n")

# ============================================================================
# SCHEDULER SETUP
# ============================================================================

scheduler = BackgroundScheduler()
# Run check every 24 hours.
scheduler.add_job(func=check_and_send_alerts, trigger="interval", hours=24)
scheduler.start()

# Shut down the scheduler when exiting the app
atexit.register(lambda: scheduler.shutdown())

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class WaterQualityInput(BaseModel):
    pH: float = Field(..., ge=0, le=14)
    EC: float = Field(..., ge=0)
    TDS: float = Field(..., ge=0)
    TH: float = Field(..., ge=0)
    Ca: float = Field(..., ge=0)
    Mg: float = Field(..., ge=0)
    Na: float = Field(..., ge=0)
    K: float = Field(..., ge=0)
    Cl: float = Field(..., ge=0)
    SO4: float = Field(..., ge=0)
    NO3: float = Field(..., ge=0)
    F: float = Field(..., ge=0)
    # Optional context (not used for calculation but good for logging)
    year: Optional[int] = Field(2024)
    latitude: Optional[float] = Field(20.5937)
    longitude: Optional[float] = Field(78.9629)

class PredictionResponse(BaseModel):
    predicted_tds: float
    wqi: float
    risk_category: str
    potable: bool
    safe_for_use: bool
    recommendations: List[str]
    parameter_status: Dict[str, str]

class StatsResponse(BaseModel):
    total_samples: int
    avg_wqi: float
    potable_percentage: float
    safe_percentage: float
    states_count: int
    districts_count: int
    year_range: str
    risk_distribution: Dict[str, int]

class DistrictRisk(BaseModel):
    district: str
    state: str
    avg_wqi: float
    avg_tds: float
    potability_rate: float
    risk_score: float
    sample_count: int

class TemporalTrend(BaseModel):
    year: int
    avg_wqi: float
    avg_tds: float
    avg_no3: float
    avg_f: float

class SubscriptionRequest(BaseModel):
    email: str
    location: str
    type: str = 'district'

class TriggerRequest(BaseModel):
    location: str
    type: str = 'district'
    wqi_override: Optional[float] = None

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def calculate_wqi(params: Dict[str, float]) -> float:
    """
    Calculate Water Quality Index using Indian standards (BIS)
    """
    # Standard limits based on Indian Bureau of Indian Standards (BIS)
    standards = {
        'ph': {'ideal': 7.0, 'acceptable': (6.5, 8.5), 'max': 14},
        'tds': {'acceptable': 500, 'max': 2000},
        'th': {'acceptable': 200, 'max': 600},
        'cl': {'acceptable': 250, 'max': 1000},
        'so4': {'acceptable': 200, 'max': 400},
        'no3': {'acceptable': 45, 'max': 100},
        'f': {'acceptable': 1.0, 'max': 1.5},
        'ca': {'acceptable': 75, 'max': 200},
        'mg': {'acceptable': 30, 'max': 100},
        'na': {'acceptable': 200, 'max': 200},
    }
    
    # Weights for each parameter
    weights = {
        'ph': 0.12, 'tds': 0.15, 'th': 0.10, 'cl': 0.08, 'so4': 0.08,
        'no3': 0.15, 'f': 0.12, 'ca': 0.05, 'mg': 0.05, 'na': 0.05,
    }
    
    wqi_sum = 0
    total_weight = 0
    
    for param_key in weights.keys():
        # Case insensitive lookup
        value = params.get(param_key)
        if value is None:
            value = params.get(param_key.upper()) # Try upper case
        
        if value is None:
            continue
            
        weight = weights.get(param_key, 0)
        
        # Calculate sub-index Q_i
        standard = standards.get(param_key, {})
        acceptable = standard.get('acceptable', 100)
        max_limit = standard.get('max', acceptable * 2)
        
        q_i = 0
        if param_key == 'ph':
            ideal_range = standard['acceptable']
            if ideal_range[0] <= value <= ideal_range[1]:
                q_i = 0
            else:
                deviation = min(abs(value - 7.0), 7.0)
                q_i = (deviation / 7.0) * 100
        else:
            if isinstance(acceptable, tuple): acceptable = acceptable[1]
            
            if value <= acceptable:
                q_i = (value / acceptable) * 50
            elif value <= max_limit:
                excess = value - acceptable
                range_width = max_limit - acceptable
                q_i = 50 + ((excess / range_width) * 50)
            else:
                excess = value - max_limit
                q_i = 100 + min((excess / max_limit) * 100, 100)
        
        wqi_sum += weight * q_i
        total_weight += weight
    
    if total_weight == 0:
        return 0
    
    final_wqi = wqi_sum / total_weight
    return max(0, min(200, final_wqi))

def classify_risk(wqi: float) -> str:
    if pd.isna(wqi): return "Unknown"
    if wqi < 25: return 'Excellent'
    elif wqi < 50: return 'Good'
    elif wqi < 100: return 'Poor'
    elif wqi < 150: return 'Very Poor'
    else: return 'Unsuitable'

def get_recommendations(params: Dict[str, float], wqi: float) -> List[str]:
    recommendations = []
    
    ph = params.get('ph', params.get('pH', 7))
    if ph < 6.5: recommendations.append("⚠ Low pH detected. pH adjustment needed.")
    elif ph > 8.5: recommendations.append("⚠ High pH detected. Acidification recommended.")
    
    if params.get('tds', params.get('TDS', 0)) > 500: recommendations.append("⚠ High TDS. Reverse osmosis recommended.")
    if params.get('no3', params.get('NO3', 0)) > 45: recommendations.append("⚠ Nitrate exceeds limits. Not suitable for drinking.")
    if params.get('f', params.get('F', 0)) > 1.5: recommendations.append("⚠ High fluoride. Defluoridation required.")
    
    if wqi < 50: recommendations.append("✓ Water quality is excellent. Safe for use.")
    elif wqi < 100: recommendations.append("✓ Water quality is good. Minimal treatment needed.")
    else: recommendations.append("⛔ Water quality is poor. Treatment required.")
    
    return recommendations

def check_parameter_status(params: Dict[str, float]) -> Dict[str, str]:
    status = {}
    limits = {
        'pH': (6.5, 8.5, 'pH'),
        'TDS': (0, 500, 'mg/L'),
        'NO3': (0, 45, 'mg/L'),
        'F': (0, 1.5, 'mg/L'),
        'TH': (0, 300, 'mg/L')
    }
    
    for param, (min_val, max_val, unit) in limits.items():
        val = params.get(param.lower(), params.get(param))
        if val is not None:
            if param == 'pH':
                status[param] = f"⛔ Out of range" if val < min_val or val > max_val else "✓ Within range"
            else:
                status[param] = f"⚠ Exceeds limit" if val > max_val else "✓ Safe"
    return status

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {
        "message": "Groundwater Quality ML API",
        "version": "2.0.0",
        "status": "operational"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": True,
        "data_loaded": not predictions_df.empty,
        "record_count": len(predictions_df),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/stats", response_model=StatsResponse)
async def get_statistics():
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    risk_dist = predictions_df['Risk_Category'].value_counts().to_dict()
    
    return StatsResponse(
        total_samples=len(predictions_df),
        avg_wqi=float(predictions_df['WQI'].mean()),
        potable_percentage=float(predictions_df['Potable'].mean() * 100) if 'Potable' in predictions_df.columns else 0,
        safe_percentage=float(predictions_df['Safe_For_Use'].mean() * 100) if 'Safe_For_Use' in predictions_df.columns else 0,
        states_count=predictions_df['State'].nunique() if 'State' in predictions_df.columns else 0,
        districts_count=predictions_df['District'].nunique() if 'District' in predictions_df.columns else 0,
        year_range=f"{predictions_df['Year'].min()}-{predictions_df['Year'].max()}",
        risk_distribution=risk_dist
    )

@app.post("/api/predict", response_model=PredictionResponse)
async def predict_water_quality(data: WaterQualityInput):
    # Convert Pydantic model to dict with lower case keys for calculation
    params = {k.lower(): v for k, v in data.dict().items()}
    
    wqi = calculate_wqi(params)
    risk_category = classify_risk(wqi)
    
    potable = (
        data.pH >= 6.5 and data.pH <= 8.5 and
        data.TDS <= 1000 and
        data.NO3 <= 50 and
        data.F <= 1.5 and
        data.TH <= 600
    )
    safe_for_use = wqi <= 100
    
    return PredictionResponse(
        predicted_tds=float(data.TDS),
        wqi=float(wqi),
        risk_category=risk_category,
        potable=potable,
        safe_for_use=safe_for_use,
        recommendations=get_recommendations(params, wqi),
        parameter_status=check_parameter_status(params)
    )

@app.get("/api/districts", response_model=List[DistrictRisk])
async def get_district_risks(limit: int = 20, sort_by: str = "risk_score"):
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    try:
        # Group by district and calc means
        group_cols = ['District', 'State']
        if not all(col in predictions_df.columns for col in group_cols):
             raise HTTPException(status_code=500, detail="District/State columns missing in data")

        # Aggragation
        agg_dict = {'WQI': 'mean', 'TDS': 'mean'}
        if 'Potable' in predictions_df.columns:
            agg_dict['Potable'] = 'mean'
        else:
            predictions_df['Potable'] = 0 # Fallback
            agg_dict['Potable'] = 'mean'
            
        district_data = predictions_df.groupby(group_cols).agg(agg_dict).reset_index()
        
        # Add sample count
        count_data = predictions_df.groupby(group_cols).size().reset_index(name='sample_count')
        district_data = pd.merge(district_data, count_data, on=group_cols)
        
        # Rename to match response model
        district_data.rename(columns={
            'District': 'district', 'State': 'state', 
            'WQI': 'avg_wqi', 'TDS': 'avg_tds', 'Potable': 'potability_rate'
        }, inplace=True)
        
        # Risk Score
        district_data['risk_score'] = (
            district_data['avg_wqi'] * 0.5 + 
            (district_data['avg_tds'] / 10) * 0.3 + 
            (1 - district_data['potability_rate']) * 50
        )
        
        # Sort and limit
        district_data = district_data.sort_values(sort_by, ascending=False).head(limit)
        
        return district_data.to_dict('records')
        
    except Exception as e:
        print(f"Error in district risks: {e}")
        return []

@app.get("/api/temporal", response_model=List[TemporalTrend])
async def get_temporal_trends():
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    try:
        yearly = predictions_df.groupby('Year').agg({
            'WQI': 'mean', 'TDS': 'mean', 'NO3': 'mean', 'F': 'mean'
        }).reset_index()
        
        return [
            TemporalTrend(
                year=int(row['Year']),
                avg_wqi=float(row['WQI']),
                avg_tds=float(row['TDS']),
                avg_no3=float(row['NO3']),
                avg_f=float(row['F'])
            ) for _, row in yearly.iterrows()
        ]
    except Exception as e:
        print(f"Error in temporal: {e}")
        return []

@app.get("/api/years")
async def get_available_years():
    if predictions_df.empty: return {'years': []}
    years = sorted(predictions_df['Year'].unique().tolist())
    return {'years': [int(y) for y in years if y > 0]} # Filter 0/NaN

@app.get("/api/available-years-raw")
async def get_available_years_raw():
    return await get_available_years()

@app.get("/api/map-data-raw")
async def get_map_data_raw(year: Optional[int] = None):
    """Get map visualization data"""
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    df = predictions_df.copy()
    if year:
        df = df[df['Year'] == year]
        if df.empty: raise HTTPException(status_code=404, detail="No data for year")
    
    # Needs lat/long
    if 'Latitude' not in df.columns or 'Longitude' not in df.columns:
        raise HTTPException(status_code=500, detail="Coordinates missing")
        
    # Valid coords only
    df = df[
        (df['Latitude'].notna()) & (df['Longitude'].notna()) & 
        (df['Latitude'] != 0) & (df['Longitude'] != 0)
    ]
    
    # Select columns to return (lightweight)
    # Aggregating by District to reduce points if necessary, or just returning all points
    # For visualizing *locations*, returning all points is better if < 10k. 
    # Our data is ~10k per year. Returning all points is fine.
    
    output = []
    # Use itertuples for speed
    for row in df.itertuples():
        output.append({
            'district': getattr(row, 'District', 'Unknown'),
            'state': getattr(row, 'State', 'Unknown'),
            'latitude': getattr(row, 'Latitude'),
            'longitude': getattr(row, 'Longitude'),
            'avg_wqi': getattr(row, 'WQI', 0),
            'avg_tds': getattr(row, 'TDS', 0),
            'risk_category': getattr(row, 'Risk_Category', 'Unknown'),
            'sample_count': 1
        })
        
    return output

@app.get("/api/district-data")
async def get_district_data(
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    offset: int = 0,
    limit: int = 50
):
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
        
    df = predictions_df
    
    if year:
        df = df[df['Year'] == year]
    if state:
        df = df[df['State'].str.lower() == state.lower()]
    if district:
        df = df[df['District'].str.lower() == district.lower()]
        
    total = len(df)
    paginated = df.iloc[offset:offset+limit]
    
    # Replace NaN with None for JSON
    paginated_dict = paginated.where(pd.notnull(paginated), None).to_dict('records')
    
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "data": paginated_dict
    }

# ============================================================================
# SUBSCRIPTION & ALERTS (Keep existing)
# ============================================================================

@app.post("/api/subscribe")
async def subscribe_user(request: SubscriptionRequest):
    success = add_subscription(request.email, request.location, request.type)
    if not success:
         raise HTTPException(status_code=400, detail="Already subscribed or invalid data")
    return {"message": f"Subscribed {request.email}"}

@app.post("/api/trigger-alert")
async def trigger_manual_alert(request: TriggerRequest):
    subscribers = get_subscribers_for_location(request.location, request.type)
    if not subscribers:
        return {"message": f"No subscribers found for {request.location}"}
    
    wqi_val = request.wqi_override if request.wqi_override else 150.0
    sent = 0
    for sub in subscribers:
        loc = sub.get('location', request.location)
        if send_alert_email(sub['email'], loc, wqi_val):
            sent += 1
    return {"message": f"Triggered {sent} alerts"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
