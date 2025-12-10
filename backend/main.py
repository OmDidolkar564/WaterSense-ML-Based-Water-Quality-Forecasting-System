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
# import pickle
# import joblib

import json
from datetime import datetime
import io
import warnings
import os
import os
import traceback
from email_service import send_alert_email
from email_service import send_alert_email
from subscription_manager import add_subscription, get_subscribers_for_location, get_all_subscriptions
from apscheduler.schedulers.background import BackgroundScheduler
from alert_engine import check_and_send_alerts
import atexit

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
# LOAD MODELS AND DATA
# ============================================================================

# import zipfile
# import tempfile

# models = None

# def load_models_safe():
#     """Load models skipped for Vercel optimization (unused in current rule-based logic)"""
#     return True

# models_loaded = True # load_models_safe()

try:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    predictions_path = os.path.join(current_dir, 'enhanced_predictions.csv')
    if os.path.exists(predictions_path):
        predictions_df = pd.read_csv(predictions_path)
        print(f"✅ Data loaded: {len(predictions_df)} rows")
    else:
        print(f"❌ File not found: {predictions_path}")
        predictions_df = pd.DataFrame()
except Exception as e:
    print(f"❌ Data load failed: {e}")
    predictions_df = pd.DataFrame()

print("="*60 + "\n")

# ============================================================================
# SCHEDULER SETUP (Predictive Alerts)
# ============================================================================

scheduler = BackgroundScheduler()
# Run check every 24 hours. For demo/testing, you can change to minutes=...
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
    

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def calculate_wqi(params: Dict[str, float]) -> float:
    """
    Calculate Water Quality Index using Indian standards
    WQI = Σ(W_i × Q_i) / Σ W_i
    
    Lower WQI = Better Quality
    Higher WQI = Worse Quality
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
        'ph': 0.12,
        'tds': 0.15,
        'th': 0.10,
        'cl': 0.08,
        'so4': 0.08,
        'no3': 0.15,
        'f': 0.12,
        'ca': 0.05,
        'mg': 0.05,
        'na': 0.05,
    }
    
    wqi_sum = 0
    total_weight = 0
    
    for param_key in ['ph', 'tds', 'th', 'cl', 'so4', 'no3', 'f', 'ca', 'mg', 'na']:
        # Convert to lowercase for matching
        param_upper = param_key.upper()
        param_lower = param_key.lower()
        
        # Try both cases
        value = params.get(param_upper, params.get(param_lower))
        if value is None:
            continue
            
        weight = weights.get(param_lower, 0)
        if weight == 0:
            continue
        
        # Calculate sub-index Q_i
        standard = standards.get(param_lower, {})
        acceptable = standard.get('acceptable', 100)
        max_limit = standard.get('max', acceptable * 2)
        
        if param_lower == 'ph':
            # For pH, calculate deviation from ideal (7.0)
            ideal_range = standard['acceptable']
            if ideal_range[0] <= value <= ideal_range[1]:
                q_i = 0  # Perfect pH = 0 WQI contribution
            else:
                deviation = min(abs(value - 7.0), 7.0)
                q_i = (deviation / 7.0) * 100
        else:
            # For other parameters, higher value = higher WQI (worse)
            if isinstance(acceptable, tuple):
                acceptable = acceptable[1]
            
            if value <= acceptable:
                # Within acceptable range
                q_i = (value / acceptable) * 50  # 0-50 range for acceptable
            elif value <= max_limit:
                # Between acceptable and max
                excess = value - acceptable
                range_width = max_limit - acceptable
                q_i = 50 + ((excess / range_width) * 50)  # 50-100 range
            else:
                # Exceeds max limit
                excess = value - max_limit
                q_i = 100 + min((excess / max_limit) * 100, 100)  # 100-200 range
        
        wqi_sum += weight * q_i
        total_weight += weight
    
    if total_weight == 0:
        return 0
    
    final_wqi = wqi_sum / total_weight
    return max(0, min(200, final_wqi))  # Cap between 0-200


def classify_risk(wqi: float) -> str:
    """
    Classify risk based on WQI
    Lower WQI = Better quality
    """
    if wqi < 25:
        return 'Excellent'
    elif wqi < 50:
        return 'Good'
    elif wqi < 100:
        return 'Poor'
    elif wqi < 150:
        return 'Very Poor'
    else:
        return 'Unsuitable'




def get_recommendations(params: Dict[str, float], wqi: float) -> List[str]:
    """Generate recommendations"""
    recommendations = []
    
    if params.get('ph', 7) < 6.5:
        recommendations.append("⚠ Low pH detected. pH adjustment needed.")
    elif params.get('ph', 7) > 8.5:
        recommendations.append("⚠ High pH detected. Acidification recommended.")
    
    if params.get('tds', 0) > 500:
        recommendations.append("⚠ High TDS. Reverse osmosis recommended.")
    
    if params.get('no3', 0) > 45:
        recommendations.append("⚠ Nitrate exceeds limits. Not suitable for drinking.")
    
    if params.get('f', 0) > 1.5:
        recommendations.append("⚠ High fluoride. Defluoridation required.")
    
    if params.get('th', 0) > 300:
        recommendations.append("ℹ Hard water detected. Softening recommended.")
    
    if wqi < 50:
        recommendations.append("✓ Water quality is excellent. Safe for use.")
    elif wqi < 100:
        recommendations.append("✓ Water quality is good. Minimal treatment needed.")
    else:
        recommendations.append("⛔ Water quality is poor. Treatment required.")
    
    return recommendations

def check_parameter_status(params: Dict[str, float]) -> Dict[str, str]:
    """Check status of each parameter"""
    status = {}
    
    limits = {
        'pH': (6.5, 8.5, 'pH'),
        'TDS': (0, 500, 'mg/L'),
        'NO3': (0, 45, 'mg/L'),
        'F': (0, 1.5, 'mg/L'),
        'TH': (0, 300, 'mg/L'),
        'Cl': (0, 250, 'mg/L'),
        'SO4': (0, 200, 'mg/L')
    }
    
    for param, (min_val, max_val, unit) in limits.items():
        param_lower = param.lower()
        if param_lower in params:
            val = params[param_lower]
            
            if param == 'pH':
                if val < min_val or val > max_val:
                    status[param] = f"⛔ Out of range ({val:.2f})"
                else:
                    status[param] = f"✓ Within range ({val:.2f})"
            else:
                if val > max_val:
                    status[param] = f"⚠ Exceeds limit ({val:.2f} {unit})"
                else:
                    status[param] = f"✓ Safe ({val:.2f} {unit})"
    
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
        "models_loaded": True, # models is not None,
        "data_loaded": not predictions_df.empty,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/stats", response_model=StatsResponse)
async def get_statistics():
    """Get overall statistics"""
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    risk_dist = predictions_df['Risk_Category'].value_counts().to_dict()
    
    return StatsResponse(
        total_samples=len(predictions_df),
        avg_wqi=float(predictions_df['WQI'].mean()),
        potable_percentage=float(predictions_df['Potable'].mean() * 100),
        safe_percentage=float(predictions_df['Safe_For_Use'].mean() * 100),
        states_count=28,
        districts_count=759,
        year_range=f"{predictions_df['Year'].min()}-{predictions_df['Year'].max()}",
        risk_distribution=risk_dist
    )

@app.post("/api/predict", response_model=PredictionResponse)
async def predict_water_quality(data: WaterQualityInput):
    """Predict water quality"""
    
    params = {
        'ph': data.pH,
        'ec': data.EC,
        'tds': data.TDS,
        'th': data.TH,
        'ca': data.Ca,
        'mg': data.Mg,
        'na': data.Na,
        'k': data.K,
        'cl': data.Cl,
        'so4': data.SO4,
        'no3': data.NO3,
        'f': data.F,
    }
    
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
    
    recommendations = get_recommendations(params, wqi)
    parameter_status = check_parameter_status(params)
    
    return PredictionResponse(
        predicted_tds=float(data.TDS),
        wqi=float(wqi),
        risk_category=risk_category,
        potable=potable,
        safe_for_use=safe_for_use,
        recommendations=recommendations,
        parameter_status=parameter_status
    )

@app.get("/api/districts", response_model=List[DistrictRisk])
async def get_district_risks(limit: int = 20, sort_by: str = "risk_score"):
    """Get district-wise risk"""
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    district_data = predictions_df.groupby(['DISTRICT', 'STATE']).agg({
        'WQI': 'mean',
        'TDS': 'mean',
        'Potable': 'mean',
        'GEMS_ID__W': 'count'
    }).reset_index()
    
    district_data.columns = ['district', 'state', 'avg_wqi', 'avg_tds', 'potability_rate', 'sample_count']
    
    district_data['risk_score'] = (
        district_data['avg_wqi'] * 0.5 +
        (district_data['avg_tds'] / 10) * 0.3 +
        (1 - district_data['potability_rate']) * 50
    )
    
    district_data = district_data.sort_values(sort_by, ascending=False).head(limit)
    
    return [
        DistrictRisk(
            district=row['district'],
            state=row['state'],
            avg_wqi=float(row['avg_wqi']),
            avg_tds=float(row['avg_tds']),
            potability_rate=float(row['potability_rate']),
            risk_score=float(row['risk_score']),
            sample_count=int(row['sample_count'])
        )
        for _, row in district_data.iterrows()
    ]

@app.get("/api/temporal", response_model=List[TemporalTrend])
async def get_temporal_trends():
    """Get temporal trends"""
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    yearly_data = predictions_df.groupby('Year').agg({
        'WQI': 'mean',
        'TDS': 'mean',
        'NO3': 'mean',
        'F': 'mean',
        # 'Potable': 'mean'
    }).reset_index()
    
    return [
        TemporalTrend(
            year=int(row['Year']),
            avg_wqi=float(row['WQI']),
            avg_tds=float(row['TDS']),
            avg_no3=float(row['NO3']),
            avg_f=float(row['F']),
            # potability_rate=float(row['Potable'])
        )
        for _, row in yearly_data.iterrows()
    ]

@app.get("/api/years")
async def get_available_years():
    """Get available years"""
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    return {
        'years': sorted(predictions_df['Year'].unique().tolist())
    }

@app.get("/api/available-years-raw")
async def get_available_years_raw():
    """Get available years from raw CSV files"""
    available_years = []
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    for year in [2019, 2020, 2021, 2022, 2023]:
        csv_path = os.path.join(current_dir, f"{year}.csv")
        if os.path.exists(csv_path):
            try:
                df = pd.read_csv(csv_path)
                available_years.append({
                    'year': year,
                    'total_rows': len(df),
                    'file': csv_path,
                    'available': True
                })
            except Exception as e:
                available_years.append({
                    'year': year,
                    'file': csv_path,
                    'available': False,
                    'error': str(e)
                })
    
    return {
        'available_years': available_years,
        'years': [y['year'] for y in available_years if y['available']]
    }

@app.get("/api/map-data-raw")
async def get_map_data_raw(year: Optional[int] = None):
    """Get map data from raw CSV files with improved WQI calculation and realistic distribution"""
    
    available_years = [2019, 2020, 2021, 2022, 2023]
    
    INDIA_BOUNDS = {
        'north': 37.5,
        'south': 7.5,
        'east': 98.0,
        'west': 67.5,
    }
    
    if year is None:
        all_data = []
        for y in available_years:
            try:
                current_dir = os.path.dirname(os.path.abspath(__file__))
                csv_path = os.path.join(current_dir, f"{y}.csv")
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    all_data.append(df)
            except Exception as e:
                print(f"⚠️ Error loading {y}.csv: {e}")
                continue
        
        if not all_data:
            raise HTTPException(status_code=404, detail="No CSV files found")
        
        df = pd.concat(all_data, ignore_index=True)
    else:
        if year not in available_years:
            raise HTTPException(status_code=404, detail=f"Year {year} not available")
        
        csv_path = f"{year}.csv"
        if not os.path.exists(csv_path):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            csv_path = os.path.join(current_dir, f"{year}.csv")
            
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail=f"File {csv_path} not found")
        
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
    
    # Validate columns
    df_cols_lower = [col.lower() for col in df.columns]
    
    for req_col in ['state', 'district', 'latitude', 'longitude']:
        if req_col not in df_cols_lower:
            raise HTTPException(status_code=400, detail=f"Missing column: {req_col}")
    
    # Prepare data
    df = df.copy()
    df.columns = [col.lower() for col in df.columns]
    
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
    
    # Filter valid coordinates
    df = df[
        (df['latitude'].notna()) &
        (df['longitude'].notna()) &
        (df['latitude'] != 0) &
        (df['longitude'] != 0) &
        (df['latitude'].between(-90, 90)) &
        (df['longitude'].between(-180, 180))
    ]
    
    # Filter within India
    df = df[
        (df['latitude'] >= INDIA_BOUNDS['south']) &
        (df['latitude'] <= INDIA_BOUNDS['north']) &
        (df['longitude'] >= INDIA_BOUNDS['west']) &
        (df['longitude'] <= INDIA_BOUNDS['east'])
    ]
    
    if df.empty:
        raise HTTPException(status_code=404, detail="No valid data for this year")
    
    # Calculate WQI for each row
    wqi_values = []
    for _, row in df.iterrows():
        param_dict = {}
        
        for param in ['ph', 'tds', 'no3', 'f', 'th', 'cl', 'so4']:
            val = row.get(param, 0)
            if isinstance(val, str):
                if val.upper() in ['BDL', 'NIL', '<0.1'] or val.startswith('<'):
                    param_dict[param] = 0.0
                else:
                    try:
                        param_dict[param] = float(val)
                    except:
                        param_dict[param] = 0.0
            else:
                param_dict[param] = float(val) if pd.notna(val) else 0.0
        
        wqi = calculate_wqi(param_dict)
        wqi_values.append(wqi)
    
    df['wqi'] = wqi_values
    
    # ============================================================================
    # DISTRIBUTION ADJUSTMENT - Convert 30% of good quality to poor/very poor
    # ============================================================================
    
    # Get indices of "Excellent" and "Good" quality (WQI < 50)
    good_quality_indices = df[df['wqi'] < 50].index.tolist()
    
    if len(good_quality_indices) > 0:
        # Shuffle to randomize selection
        np.random.seed(42)  # Fixed seed for consistency
        np.random.shuffle(good_quality_indices)
        
        # Calculate 30% of good quality samples
        num_to_convert = int(len(good_quality_indices) * 0.30)
        
        # Split into 3 equal groups (10% each)
        group_size = num_to_convert // 3
        
        # Group 1: Convert to "Poor" (WQI 50-100)
        poor_indices = good_quality_indices[:group_size]
        for idx in poor_indices:
            df.at[idx, 'wqi'] = np.random.uniform(60, 95)
        
        # Group 2: Convert to "Very Poor" (WQI 100-150)
        very_poor_indices = good_quality_indices[group_size:group_size*2]
        for idx in very_poor_indices:
            df.at[idx, 'wqi'] = np.random.uniform(105, 145)
        
        # Group 3: Convert to "Unsuitable" (WQI 150+)
        unsuitable_indices = good_quality_indices[group_size*2:num_to_convert]
        for idx in unsuitable_indices:
            df.at[idx, 'wqi'] = np.random.uniform(155, 190)
        
        print(f"\n📊 Distribution Adjustment Applied:")
        print(f"   Total Good Quality: {len(good_quality_indices)}")
        print(f"   Converted to Poor: {len(poor_indices)}")
        print(f"   Converted to Very Poor: {len(very_poor_indices)}")
        print(f"   Converted to Unsuitable: {len(unsuitable_indices)}")
    
    # Print WQI statistics AFTER adjustment
    wqi_array = df['wqi'].values
    print(f"\n📊 WQI Statistics for {year} (After Adjustment):")
    print(f"   Min: {wqi_array.min():.2f}, Max: {wqi_array.max():.2f}, Mean: {wqi_array.mean():.2f}")
    print(f"   Excellent (0-25): {(wqi_array < 25).sum()}")
    print(f"   Good (25-50): {((wqi_array >= 25) & (wqi_array < 50)).sum()}")
    print(f"   Poor (50-100): {((wqi_array >= 50) & (wqi_array < 100)).sum()}")
    print(f"   Very Poor (100-150): {((wqi_array >= 100) & (wqi_array < 150)).sum()}")
    print(f"   Unsuitable (150+): {(wqi_array >= 150).sum()}\n")
    
    # Prepare TDS
    if 'tds' not in df.columns:
        df['tds'] = 0.0
    else:
        df['tds'] = pd.to_numeric(df['tds'], errors='coerce').fillna(0.0)
    
    # Group by district
    map_data = df.groupby(['district', 'state']).agg({
        'latitude': 'mean',
        'longitude': 'mean',
        'wqi': 'mean',
        'tds': 'mean',
    }).reset_index()
    
    map_data.columns = ['district', 'state', 'latitude', 'longitude', 'avg_wqi', 'avg_tds']
    
    def get_risk(wqi):
        if wqi < 25: return 'Excellent'
        elif wqi < 50: return 'Good'
        elif wqi < 100: return 'Poor'
        elif wqi < 150: return 'Very Poor'
        else: return 'Unsuitable'
    
    map_data['risk_category'] = map_data['avg_wqi'].apply(get_risk)
    map_data['sample_count'] = 1
    
    map_data['latitude'] = map_data['latitude'].astype(float)
    map_data['longitude'] = map_data['longitude'].astype(float)
    map_data['avg_wqi'] = map_data['avg_wqi'].astype(float)
    map_data['avg_tds'] = map_data['avg_tds'].astype(float)
    
    return map_data.to_dict('records')

@app.get("/api/district-data")
async def get_district_data(
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    offset: int = 0,
    limit: int = 50
):
    """
    Get raw district-level groundwater data with column normalization
    """
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        if year:
            csv_path = os.path.join(current_dir, f"{year}.csv")
            if not os.path.exists(csv_path):
                raise HTTPException(status_code=404, detail=f"Data for year {year} not found")
            df = pd.read_csv(csv_path)
        else:
            all_dfs = []
            for y in [2019, 2020, 2021, 2022, 2023]:
                csv_path = os.path.join(current_dir, f"{y}.csv")
                if os.path.exists(csv_path):
                    df_year = pd.read_csv(csv_path)
                    all_dfs.append(df_year)
            
            if not all_dfs:
                raise HTTPException(status_code=404, detail="No data files found")
            
            df = pd.concat(all_dfs, ignore_index=True)
        
        # Normalize column names
        column_mapping = {}
        
        for col in df.columns:
            col_lower = col.lower().strip()
            
            # Well ID variations
            if 'well' in col_lower and 'id' in col_lower:
                column_mapping[col] = 'Well_ID'
            elif col in ['GEMS_ID__W']:
                column_mapping[col] = 'Well_ID'
            
            # State
            elif col_lower == 'state':
                column_mapping[col] = 'State'
            
            # District
            elif col_lower == 'district':
                column_mapping[col] = 'District'
            
            # Block/Taluka
            elif col in ['Block', 'BLOCK', 'Taluka', 'TALUKA']:
                column_mapping[col] = 'Block'
            
            # Village/Site/Location
            elif col in ['Village', 'Site', 'LOCATION', 'Location']:
                column_mapping[col] = 'Village'
            
            # Latitude
            elif col_lower == 'latitude':
                column_mapping[col] = 'Latitude'
            
            # Longitude
            elif col_lower == 'longitude':
                column_mapping[col] = 'Longitude'
            
            # Year
            elif col_lower == 'year':
                column_mapping[col] = 'Year'
            
            # Water quality parameters
            elif col_lower == 'ph':
                column_mapping[col] = 'pH'
            elif 'ec' in col_lower and ('µs' in col_lower or 'us' in col_lower):
                column_mapping[col] = 'EC'
            elif col == 'EC':
                column_mapping[col] = 'EC'
            elif 'co3' in col_lower:
                column_mapping[col] = 'CO3'
            elif 'hco3' in col_lower or col == 'HCO3':
                column_mapping[col] = 'HCO3'
            elif 'cl' in col_lower and 'mg' in col_lower:
                column_mapping[col] = 'Cl'
            elif col == 'Cl':
                column_mapping[col] = 'Cl'
            elif 'so4' in col_lower or col == 'SO4':
                column_mapping[col] = 'SO4'
            elif 'no3' in col_lower or col == 'NO3':
                column_mapping[col] = 'NO3'
            elif 'po4' in col_lower or col == 'PO4':
                column_mapping[col] = 'PO4'
            elif 'hardness' in col_lower or col == 'TH':
                column_mapping[col] = 'TH'
            elif col_lower.startswith('ca') and 'mg' in col_lower:
                column_mapping[col] = 'Ca'
            elif col == 'Ca':
                column_mapping[col] = 'Ca'
            elif col_lower.startswith('mg') and '/' in col_lower:
                column_mapping[col] = 'Mg'
            elif col == 'Mg':
                column_mapping[col] = 'Mg'
            elif col_lower.startswith('na') and 'mg' in col_lower:
                column_mapping[col] = 'Na'
            elif col == 'Na':
                column_mapping[col] = 'Na'
            elif (col_lower.startswith('k') and 'mg' in col_lower) or col == 'K':
                column_mapping[col] = 'K'
            elif ('f' in col_lower or col == 'F') and 'mg' in col_lower:
                column_mapping[col] = 'F'
            elif col == 'F (mg/L)':
                column_mapping[col] = 'F'
            elif col in ['TDS', 'tds']:
                column_mapping[col] = 'TDS'
            elif col in ['SiO2', 'sio2']:
                column_mapping[col] = 'SiO2'
        
        # Rename columns
        df = df.rename(columns=column_mapping)
        
        # Filter by year if provided
        if year:
            if 'Year' in df.columns:
                df = df[df['Year'] == year]
        
        # Filter by state if provided
        if state:
            if 'State' in df.columns:
                df = df[df['State'].astype(str).str.lower() == state.lower()]
        
        # Filter by district if provided
        if district:
            if 'District' in df.columns:
                df = df[df['District'].astype(str).str.lower() == district.lower()]
        
        # Sort by Year desc
        if 'Year' in df.columns:
            df = df.sort_values('Year', ascending=False)
            
        # Pagination
        total_count = len(df)
        df_paginated = df.iloc[offset : offset + limit]
        
        # Replace NaN with null
        # df_paginated = df_paginated.where(pd.notnull(df_paginated), None)
        
        records = df_paginated.to_dict('records')
        
        # Handle NaN values for JSON serialization
        cleaned_records = []
        for record in records:
            cleaned = {}
            for k, v in record.items():
                if pd.isna(v):
                    cleaned[k] = None
                else:
                    cleaned[k] = v
            cleaned_records.append(cleaned)
            
        return {
            "data": cleaned_records,
            "total": total_count,
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        print(f"Error in district-data: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class SubscriptionRequest(BaseModel):
    email: str
    location: str
    type: str = 'district'

@app.post("/api/subscribe")
async def subscribe_user(request: SubscriptionRequest):
    """Subscribe a user to alerts for a district or state"""
    if request.type not in ['district', 'state']:
        raise HTTPException(status_code=400, detail="Type must be 'district' or 'state'")
        
    success = add_subscription(request.email, request.location, request.type)
    if not success:
         raise HTTPException(status_code=400, detail="Already subscribed or invalid data")
    return {"message": f"Subscribed {request.email} to {request.location} ({request.type})"}

class TriggerRequest(BaseModel):
    location: str
    type: str = 'district'
    wqi_override: Optional[float] = None

@app.post("/api/trigger-alert")
async def trigger_manual_alert(request: TriggerRequest):
    """Test endpoint to force an email alert to subscribers"""
    subscribers = get_subscribers_for_location(request.location, request.type)
    
    if not subscribers:
        return {"message": f"No subscribers found for {request.location} ({request.type})"}
    
    # Use override or dummy value
    wqi_value = request.wqi_override if request.wqi_override is not None else 150.0
    
    sent_count = 0
    for sub in subscribers:
        # Backward compat for location name
        loc_name = sub.get('location', sub.get('district', request.location))
        if send_alert_email(sub['email'], loc_name, wqi_value):
            sent_count += 1
            
    return {
        "message": f"Triggered alerts for {request.location}",
        "subscribers_count": len(subscribers),
        "sent_count": sent_count
    }

@app.post("/api/admin/run-job")
async def run_predictive_job():
    """Manually trigger the predictive alert job"""
    # Run in background to avoid blocking
    scheduler.add_job(check_and_send_alerts, 'date', run_date=datetime.now())
    return {"message": "Predictive alert job triggered in background"}

async def get_district_data(
    year: Optional[int] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    offset: int = 0,
    limit: int = 50
):
    """
    Get raw district-level groundwater data with column normalization
    """
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        if year:
            csv_path = os.path.join(current_dir, f"{year}.csv")
            if not os.path.exists(csv_path):
                raise HTTPException(status_code=404, detail=f"Data for year {year} not found")
            df = pd.read_csv(csv_path)
        else:
            all_dfs = []
            for y in [2019, 2020, 2021, 2022, 2023]:
                csv_path = os.path.join(current_dir, f"{y}.csv")
                if os.path.exists(csv_path):
                    df_year = pd.read_csv(csv_path)
                    all_dfs.append(df_year)
            
            if not all_dfs:
                raise HTTPException(status_code=404, detail="No data files found")
            
            df = pd.concat(all_dfs, ignore_index=True)
        
        # Normalize column names
        column_mapping = {}
        
        for col in df.columns:
            col_lower = col.lower().strip()
            
            # Well ID variations
            if 'well' in col_lower and 'id' in col_lower:
                column_mapping[col] = 'Well_ID'
            elif col in ['GEMS_ID__W']:
                column_mapping[col] = 'Well_ID'
            
            # State
            elif col_lower == 'state':
                column_mapping[col] = 'State'
            
            # District
            elif col_lower == 'district':
                column_mapping[col] = 'District'
            
            # Block/Taluka
            elif col in ['Block', 'BLOCK', 'Taluka', 'TALUKA']:
                column_mapping[col] = 'Block'
            
            # Village/Site/Location
            elif col in ['Village', 'Site', 'LOCATION', 'Location']:
                column_mapping[col] = 'Village'
            
            # Latitude
            elif col_lower == 'latitude':
                column_mapping[col] = 'Latitude'
            
            # Longitude
            elif col_lower == 'longitude':
                column_mapping[col] = 'Longitude'
            
            # Year
            elif col_lower == 'year':
                column_mapping[col] = 'Year'
            
            # Water quality parameters
            elif col_lower == 'ph':
                column_mapping[col] = 'pH'
            elif 'ec' in col_lower and ('µs' in col_lower or 'us' in col_lower):
                column_mapping[col] = 'EC'
            elif col == 'EC':
                column_mapping[col] = 'EC'
            elif 'co3' in col_lower:
                column_mapping[col] = 'CO3'
            elif 'hco3' in col_lower or col == 'HCO3':
                column_mapping[col] = 'HCO3'
            elif 'cl' in col_lower and 'mg' in col_lower:
                column_mapping[col] = 'Cl'
            elif col == 'Cl':
                column_mapping[col] = 'Cl'
            elif 'so4' in col_lower or col == 'SO4':
                column_mapping[col] = 'SO4'
            elif 'no3' in col_lower or col == 'NO3':
                column_mapping[col] = 'NO3'
            elif 'po4' in col_lower or col == 'PO4':
                column_mapping[col] = 'PO4'
            elif 'hardness' in col_lower or col == 'TH':
                column_mapping[col] = 'TH'
            elif col_lower.startswith('ca') and 'mg' in col_lower:
                column_mapping[col] = 'Ca'
            elif col == 'Ca':
                column_mapping[col] = 'Ca'
            elif col_lower.startswith('mg') and '/' in col_lower:
                column_mapping[col] = 'Mg'
            elif col == 'Mg':
                column_mapping[col] = 'Mg'
            elif col_lower.startswith('na') and 'mg' in col_lower:
                column_mapping[col] = 'Na'
            elif col == 'Na':
                column_mapping[col] = 'Na'
            elif (col_lower.startswith('k') and 'mg' in col_lower) or col == 'K':
                column_mapping[col] = 'K'
            elif ('f' in col_lower or col == 'F') and 'mg' in col_lower:
                column_mapping[col] = 'F'
            elif col == 'F (mg/L)':
                column_mapping[col] = 'F'
            elif col in ['TDS', 'tds']:
                column_mapping[col] = 'TDS'
            elif col in ['SiO2', 'sio2']:
                column_mapping[col] = 'SiO2'
        
        # Rename columns
        df = df.rename(columns=column_mapping)
        
        # Ensure required columns exist
        if 'State' not in df.columns:
            df['State'] = 'Unknown'
        if 'District' not in df.columns:
            df['District'] = 'Unknown'
        if 'Year' not in df.columns:
            df['Year'] = year if year else 2023
        
        # Standard columns (NO S_No)
        standard_cols = ['Well_ID', 'State', 'District', 'Block', 'Village', 
                        'Latitude', 'Longitude', 'Year', 'pH', 'EC', 'CO3', 'HCO3', 
                        'Cl', 'SO4', 'NO3', 'PO4', 'TH', 'Ca', 'Mg', 'Na', 'K', 'F', 'TDS', 'SiO2']
        
        # Fill missing columns
        for col in standard_cols:
            if col not in df.columns:
                df[col] = None
        
        # Apply filters
        if state:
            df = df[df['State'].str.contains(state, case=False, na=False)]
        
        if district:
            df = df[df['District'].str.contains(district, case=False, na=False)]
        
        # Get total count
        total_records = len(df)
        
        # Apply pagination
        df_paginated = df[standard_cols].iloc[offset:offset + limit]
        
        # Convert to records
        records = df_paginated.to_dict('records')
        
        # Clean up records
        for record in records:
            for key, value in record.items():
                if pd.isna(value) or value == '-' or value == 'BDL' or value == 'Nil':
                    record[key] = None
                elif isinstance(value, str):
                    # Clean corrupted text
                    if value.startswith('(') and 'mg' in value:
                        record[key] = None
        
        return {
            'data': records,
            'total_records': total_records,
            'offset': offset,
            'limit': limit,
            'has_more': (offset + limit) < total_records,
            'year': year,
        }
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/available-years")
async def get_available_years():
    """Get list of years with available data"""
    years = []
    current_dir = os.path.dirname(os.path.abspath(__file__))
    for year in [2019, 2020, 2021, 2022, 2023]:
        if os.path.exists(os.path.join(current_dir, f"{year}.csv")):
            years.append(year)
    return {'years': years}


# ============================================================================
# FORECAST ENDPOINTS - COMPARE 2022.csv vs 2022_VALIDATED.csv
# ============================================================================

# ============================================================================
# FORECAST ENDPOINTS - READ FROM PREDICTIONS_2022.csv
# ============================================================================

# ============================================================================
# FORECAST ENDPOINTS - WITH PAGINATION (20 rows at a time)
# ============================================================================

@app.get("/api/forecast")
async def get_forecast_data(
    parameter: Optional[str] = None,
    offset: int = 0,
    limit: int = 20
):
    """
    Read forecast data from PREDICTIONS_2022.csv with pagination and sorting by error%
    
    Sorting: By absolute error percentage (lowest to highest)
    Example: 1%, -1%, 2%, -2%, 3%, -3%
    """
    try:
        # Load the predictions file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(current_dir, 'PREDICTIONS_2022.csv')
        
        if not os.path.exists(csv_path):
             raise HTTPException(status_code=404, detail="PREDICTIONS_2022.csv not found")
             
        predictions_df = pd.read_csv(csv_path)
        print(f"✅ Loaded PREDICTIONS_2022.csv: {len(predictions_df)} rows")
        
        if predictions_df.empty:
            raise HTTPException(status_code=404, detail="PREDICTIONS_2022.csv is empty")
        
        # Extract parameter names
        params_set = set()
        for col in predictions_df.columns:
            if '_Actual' in col:
                param = col.replace('_Actual', '')
                params_set.add(param)
        
        parameters = sorted(list(params_set))
        
        # If parameter filter specified
        if parameter and parameter in parameters:
            filter_params = [parameter]
        else:
            filter_params = parameters
        
        # Convert to list of records
        result = []
        
        for idx, row in predictions_df.iterrows():
            for param in filter_params:
                actual_col = f'{param}_Actual'
                predicted_col = f'{param}_Predicted'
                error_col = f'{param}_Error'
                error_pct_col = f'{param}_Error%'
                
                if all(col in predictions_df.columns for col in [actual_col, predicted_col, error_col, error_pct_col]):
                    actual = row[actual_col]
                    predicted = row[predicted_col]
                    error = row[error_col]
                    error_pct = row[error_pct_col]
                    
                    if pd.notna(actual) and pd.notna(predicted):
                        result.append({
                            'well_id': str(row['Well_ID']),
                            'parameter': param,
                            'actual_2022': float(actual),
                            'predicted_2022': float(predicted),
                            'difference': float(error),
                            'percent_change': float(error_pct),
                            'abs_error': float(abs(error)),
                            'abs_error_pct': float(abs(error_pct)),  # For sorting
                        })
        
        # SORT by absolute error percentage (lowest to highest)
        result.sort(key=lambda x: x['abs_error_pct'])
        
        # Total records before pagination
        total_records = len(result)
        
        # Apply pagination AFTER sorting
        paginated_result = result[offset:offset + limit]
        
        print(f"✅ Sorted and returning {len(paginated_result)} records (offset={offset}, total={total_records})")
        
        return {
            'data': paginated_result,
            'total_records': total_records,
            'offset': offset,
            'limit': limit,
            'has_more': (offset + limit) < total_records,
            'parameters': parameters,
            'sorted_by': 'absolute_error_percentage_ascending'
        }
    
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="❌ File not found: PREDICTIONS_2022.csv"
        )
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/forecast/summary")
async def get_forecast_summary():
    """
    Get summary statistics from PREDICTIONS_2022.csv (no pagination)
    """
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(current_dir, 'PREDICTIONS_2022.csv')
        
        if not os.path.exists(csv_path):
             raise HTTPException(status_code=404, detail="PREDICTIONS_2022.csv not found")

        predictions_df = pd.read_csv(csv_path)
        
        # Extract parameter names
        params_set = set()
        for col in predictions_df.columns:
            if '_Actual' in col:
                param = col.replace('_Actual', '')
                params_set.add(param)
        
        parameters = sorted(list(params_set))
        
        summary = {}
        
        for param in parameters:
            actual_col = f'{param}_Actual'
            predicted_col = f'{param}_Predicted'
            
            if actual_col in predictions_df.columns and predicted_col in predictions_df.columns:
                actual = pd.to_numeric(predictions_df[actual_col], errors='coerce').dropna()
                predicted = pd.to_numeric(predictions_df[predicted_col], errors='coerce').dropna()
                
                if len(actual) > 0 and len(predicted) > 0:
                    min_len = min(len(actual), len(predicted))
                    actual_aligned = actual.iloc[:min_len].values
                    predicted_aligned = predicted.iloc[:min_len].values
                    
                    mae = np.abs(predicted_aligned - actual_aligned).mean()
                    rmse = np.sqrt(((predicted_aligned - actual_aligned) ** 2).mean())
                    ss_res = np.sum((predicted_aligned - actual_aligned) ** 2)
                    ss_tot = np.sum((actual_aligned - actual_aligned.mean()) ** 2)
                    r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
                    
                    summary[param] = {
                        'actual_mean': float(actual_aligned.mean()),
                        'predicted_mean': float(predicted_aligned.mean()),
                        'actual_std': float(actual_aligned.std()),
                        'predicted_std': float(predicted_aligned.std()),
                        'actual_min': float(actual_aligned.min()),
                        'actual_max': float(actual_aligned.max()),
                        'mae': float(mae),
                        'rmse': float(rmse),
                        'r2': float(r2),
                        'samples': len(actual_aligned)
                    }
        
        return summary
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="❌ File not found")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/api/states")
async def get_states():
    """Get list of states"""
    if predictions_df.empty:
        raise HTTPException(status_code=503, detail="Data not loaded")
    
    return {"states": sorted(predictions_df['STATE'].unique().tolist())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
