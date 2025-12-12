import pandas as pd
import numpy as np
import os
from sklearn.linear_model import LinearRegression
import warnings

warnings.filterwarnings('ignore')

def generate_forecasts():
    print("🚀 Starting Forecast Generation (2024-2030)...")
    
    # Path setup
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, 'enhanced_predictions.csv.gz')
    output_path = os.path.join(base_dir, 'forecast_data.csv.gz')
    
    if not os.path.exists(input_path):
        print(f"❌ Input file not found: {input_path}")
        return

    # Load Data
    try:
        df = pd.read_csv(input_path, compression='gzip')
        print(f"✅ Loaded {len(df)} historical records.")
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return

    # Targets to forecast
    targets = ['WQI', 'TDS', 'pH', 'NO3', 'F', 'Potable', 'Safe_For_Use', 'Risk_Category']
    
    # Store results
    forecasts = []
    
    # Get unique districts
    # Group by State+District to be precise
    if 'District' not in df.columns or 'Year' not in df.columns:
        print("❌ Dataset missing 'District' or 'Year' columns.")
        return

    groups = df.groupby(['State', 'District'])
    
    print(f"🔄 Processing {len(groups)} districts...")
    
    future_years = np.array([2024, 2025, 2026, 2027, 2028, 2029, 2030]).reshape(-1, 1)
    
    count = 0
    for (state, district), group in groups:
        # We need at least 2 points to make a trend
        if len(group) < 2:
            continue
            
        group = group.sort_values('Year')
        X = group['Year'].values.reshape(-1, 1)
        
        district_forecasts = {
            'State': state,
            'District': district,
        }
        
        for target in targets:
            if target not in group.columns:
                continue
                
            y = group[target]
            
            # Handle Categorical/Boolean via logic or skip
            if target in ['Risk_Category']:
                # For categorical, we can't regress easily. 
                # We will re-calculate it later based on WQI forecast
                continue
            
            # Clean data for regression
            valid_mask = ~np.isnan(y)
            if valid_mask.sum() < 2: # Need at least 2 points
                continue
                
            X_clean = X[valid_mask]
            y_clean = y[valid_mask]
            
            # Regression
            try:
                # Simple Linear Regression works best for short timeframes (5 points)
                # To avoid wild predictions, we can clamp or use robust scaler, 
                # but standard LinearRegression is fine for this demo.
                model = LinearRegression()
                model.fit(X_clean, y_clean)
                preds = model.predict(future_years)
                
                # Store
                for i, year in enumerate(future_years.flatten()):
                    predicted_val = preds[i]
                    
                    # Clamping logical limits
                    if target == 'WQI': predicted_val = max(0, min(300, predicted_val))
                    if target == 'pH': predicted_val = max(0, min(14, predicted_val))
                    if target in ['TDS', 'NO3', 'F']: predicted_val = max(0, predicted_val)
                    if target in ['Potable', 'Safe_For_Use']: predicted_val = max(0, min(1, predicted_val)) # probability-ish
                    
                    key = f"{target}_{year}"
                    # We structure it differently: distinct rows for CSV? 
                    # Actually, let's make the output CSV have columns: State, District, Year, WQI, TDS...
                    pass 
            except:
                pass

        # Re-structuring for the output dataframe
        # We want rows: State, District, Year, WQI, ...
        
        # Re-loop to build rows
        for i, year in enumerate(future_years.flatten()):
            row = {
                'State': state,
                'District': district,
                'Year': year,
                'Risk_Category': 'Unknown' # Placeholder
            }
            
            # Predict each Num var
            wqi_val = 0
            for target in ['WQI', 'TDS', 'pH', 'NO3', 'F']:
                if target in group.columns:
                    y = group[target]
                    # Clean NaNs
                    valid_mask = ~np.isnan(y)
                    if valid_mask.sum() < 2:
                        # Fallback: take mean of available
                        if valid_mask.sum() > 0: row[target] = round(float(y.mean()), 2)
                        else: row[target] = 0
                        continue

                    model = LinearRegression().fit(X[valid_mask], y[valid_mask])
                    pred = model.predict([[year]])[0]
                    
                    # Clamp
                    if target == 'pH': pred = max(0, min(14, pred))
                    else: pred = max(0, pred)
                    
                    row[target] = round(pred, 2)
                    if target == 'WQI': wqi_val = pred
            
            # Derive Categories from new WQI
            if wqi_val < 50: row['Risk_Category'] = 'Good'
            elif wqi_val < 100: row['Risk_Category'] = 'Poor'
            elif wqi_val < 150: row['Risk_Category'] = 'Very Poor'
            else: row['Risk_Category'] = 'Unsuitable'
            
            row['Potable'] = 1 if (row.get('WQI', 100) < 100 and 6.5 <= row.get('pH', 7) <= 8.5) else 0
            row['Safe_For_Use'] = 1 if row.get('WQI', 100) < 150 else 0
            
            # Add lat/long if available (take last known)
            if 'Latitude' in group.columns: row['Latitude'] = group.iloc[-1]['Latitude']
            if 'Longitude' in group.columns: row['Longitude'] = group.iloc[-1]['Longitude']

            forecasts.append(row)
            
        count += 1
        if count % 100 == 0:
            print(f"   Processed {count}...")

    # Save
    forecast_df = pd.DataFrame(forecasts)
    print(f"💾 Saving {len(forecast_df)} forecast records...")
    forecast_df.to_csv(output_path, index=False, compression='gzip')
    print(f"✅ forecasts generated at {output_path}")

if __name__ == "__main__":
    generate_forecasts()
