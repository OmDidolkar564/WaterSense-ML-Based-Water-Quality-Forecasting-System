"""
Groundwater Quality Preprocessing Pipeline
==========================================

This script handles the cleaning, normalization, and feature engineering of raw groundwater quality data.
It transforms raw CSV files from the Central Ground Water Board (CGWB) into a standardized format
suitable for ML training and the web application.

Key Preprocessing Steps:
1. Column Standardization (Renaming to consistent keys)
2. Handling Missing Values (Imputation strategy)
3. Feature Engineering (Calculating Water Quality Index - WQI)
4. Risk Classification (Categorizing based on WQI and BIS standards)

Usage:
    python preprocessing.py --input 2022.csv --output 2022_processed.csv
"""

import pandas as pd
import numpy as np
import os
import argparse

# ==============================================================================
# CONFIGURATION & STANDARDS
# ==============================================================================

# Column Mapping to normalize variations across different year CSVs
COLUMN_MAPPING = {
    'Year': 'Year',
    'State Name': 'State',
    'STATE': 'State',
    'District Name': 'District',
    'DISTRICT': 'District',
    'Block Name': 'Block',
    'BLOCK': 'Block',
    'Latitude': 'Latitude',
    'LATITUDE': 'Latitude',
    'Longitude': 'Longitude',
    'LONGITUDE': 'Longitude',
    
    # Chemical Parameters
    'pH': 'pH',
    'EC': 'EC',
    'TDS': 'TDS',
    'Total Hardness': 'TH',
    'TH': 'TH',
    'Ca': 'Ca',
    'Mg': 'Mg',
    'Na': 'Na',
    'K': 'K',
    'Cl': 'Cl',
    'SO4': 'SO4',
    'NO3': 'NO3',
    'Nitrate': 'NO3',
    'F': 'F',
    'Fluoride': 'F',
    'SiO2': 'SiO2'
}

# BIS Standards for WQI Calculation
BIS_STANDARDS = {
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

# Parameter weights for WQI
WQI_WEIGHTS = {
    'pH': 0.12,
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

# ==============================================================================
# CORE LOGIC
# ==============================================================================

def calculate_row_wqi(row):
    """
    Calculate WQI for a single row of data.
    WQI = Σ(W_i * Q_i) / ΣW_i
    """
    wqi_sum = 0
    total_weight = 0
    
    for param, weight in WQI_WEIGHTS.items():
        # Match case-insensitive column names
        col_name = None
        for col in row.index:
            if col.lower() == param.lower():
                col_name = col
                break
        
        if not col_name or pd.isna(row[col_name]):
            continue
            
        value = float(row[col_name])
        
        # Get standard limits
        standard = BIS_STANDARDS.get(param.lower(), {})
        acceptable = standard.get('acceptable', 100)
        max_limit = standard.get('max', acceptable * 2)
        
        # Calculate Quality Rating (Qi)
        q_i = 0
        
        if param.lower() == 'ph':
            ideal_range = standard['acceptable']
            if ideal_range[0] <= value <= ideal_range[1]:
                q_i = 0
            else:
                deviation = min(abs(value - 7.0), 7.0)
                q_i = (deviation / 7.0) * 100
        else:
            if isinstance(acceptable, tuple): # Handle tuple if ever present
                acceptable = acceptable[1]
                
            if value <= acceptable:
                q_i = (value / acceptable) * 50
            elif value <= max_limit:
                excess = value - acceptable
                range_width = max_limit - acceptable
                q_i = 50 + ((excess / range_width) * 50)
            else:
                excess = value - max_limit
                q_i = 100 + min((excess / max_limit) * 100, 100) # Cap sub-index
        
        wqi_sum += weight * q_i
        total_weight += weight
        
    if total_weight == 0:
        return np.nan
        
    return wqi_sum / total_weight

def classify_risk(wqi):
    """Classify WQI into risk categories"""
    if pd.isna(wqi): return "Unknown"
    if wqi < 50: return "Good"
    if wqi < 100: return "Poor"
    if wqi < 150: return "Very Poor"
    return "Unsuitable"

def preprocess_dataframe(df, year_from_filename=None):
    """
    Process a single dataframe: standardizing, cleaning, and calculating WQI.
    Enforces numeric types and handles bad data robustly.
    """
    # 1. Standardize Columns
    normalized_cols = {}
    for col in df.columns:
        # Check mapping
        mapped_name = COLUMN_MAPPING.get(col)
        if not mapped_name:
            # Try case-insensitive lookup
            for k, v in COLUMN_MAPPING.items():
                if k.lower() == col.lower():
                    mapped_name = v
                    break
        
        if mapped_name:
            normalized_cols[col] = mapped_name
        else:
            normalized_cols[col] = col # Keep original if no map
            
    df = df.rename(columns=normalized_cols)
    
    # Ensure Year Column exists
    if 'Year' not in df.columns:
        if year_from_filename:
            df['Year'] = year_from_filename
        else:
            # Try to infer or default (though this shouldn't happen with our filenames)
            df['Year'] = np.nan

    # 2. Force Numeric Conversion
    # standard numeric columns + lat/long + year
    numeric_targets = list(WQI_WEIGHTS.keys()) + ['Latitude', 'Longitude', 'Year', 'EC', 'CO3', 'HCO3', 'Cl', 'NO3', 'PO4', 'SiO2']
    
    for col in df.columns:
        # Check if it should be numeric
        # We check if the column name (case-insensitive) is in our target list or mapped values
        is_target = False
        if col in numeric_targets:
            is_target = True
        elif col.lower() in [t.lower() for t in numeric_targets]:
            is_target = True
            
        if is_target:
            # Force conversion, turning "Leaked", "23°22'12"", etc. into NaN
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # 3. Handle Missing Values (Imputation)
    # Only impute columns that are actually present
    for col in df.columns:
        if df[col].dtype in [np.float64, np.int64]:
             median_val = df[col].median()
             if pd.notna(median_val):
                df[col] = df[col].fillna(median_val)
             else:
                df[col] = df[col].fillna(0) # Fallback if all empty or pure NaNs

    # 4. Feature Engineering: WQI
    if not df.empty:
        df['WQI_Calculated'] = df.apply(calculate_row_wqi, axis=1)
        df['Risk_Category'] = df['WQI_Calculated'].apply(classify_risk)
        
        # Potability logic
        # Ensure columns exist before using them in vector operations, or use safe retrieval
        ph_ok = df['pH'].between(6.5, 8.5) if 'pH' in df.columns else False
        wqi_ok = df['WQI_Calculated'] < 100
        
        df['Potable'] = wqi_ok & ph_ok
        df['Safe_For_Use'] = df['WQI_Calculated'] < 150
        df['WQI'] = df['WQI_Calculated']

    return df

def main():
    parser = argparse.ArgumentParser(description="Preprocess Groundwater Data")
    parser.add_argument("--input", help="Single input CSV file", required=False)
    parser.add_argument("--output", help="Output processed CSV file", default="backend/enhanced_predictions.csv")
    parser.add_argument("--all-years", action="store_true", help="Process all 2019-2023 files in backend/")
    
    args = parser.parse_args()
    
    dfs = []
    
    if args.input:
        if os.path.exists(args.input):
            print(f"🔄 Processing single file: {args.input}")
            try:
                df = pd.read_csv(args.input, encoding='utf-8', errors='replace')
                processed_df = preprocess_dataframe(df)
                dfs.append(processed_df)
            except Exception as e:
                 print(f"❌ Error reading/processing {args.input}: {e}")
        else:
            print(f"❌ Input file not found: {args.input}")
            return
            
    elif args.all_years:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        years = [2019, 2020, 2021, 2022, 2023]
        
        for year in years:
            filename = f"{year}.csv"
            file_path = os.path.join(base_dir, filename)
            
            if os.path.exists(file_path):
                print(f"🔄 Processing {filename}...")
                try:
                    # Robust CSV reading
                    try:
                        df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
                    except UnicodeDecodeError:
                        df = pd.read_csv(file_path, encoding='cp1252', on_bad_lines='skip')
                        
                    processed_df = preprocess_dataframe(df, year_from_filename=year)
                    
                    if not processed_df.empty:
                        print(f"   Shape: {processed_df.shape}")
                        dfs.append(processed_df)
                    else:
                        print(f"   ⚠️ Result was empty for {filename}")
                        
                except Exception as e:
                    print(f"❌ Error processing {filename}: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"⚠️ Warning: {filename} not found.")
    else:
        print("Please specify --input or --all-years")
        return

    if dfs:
        final_df = pd.concat(dfs, ignore_index=True)
        print(f"📊 Total Combined Samples: {len(final_df)}")
        
        # Final cleanup of common columns just in case
        if 'Sl_No' in final_df.columns:
            final_df = final_df.drop(columns=['Sl_No'])
            
        print(f"💾 Saving merged data to {args.output}...")
        final_df.to_csv(args.output, index=False)
        print("✅ Batch Preprocessing Complete!")
    else:
        print("❌ No data to save.")

if __name__ == "__main__":
    main()
