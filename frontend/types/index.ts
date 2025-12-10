// types/index.ts - All TypeScript type definitions

export interface StatsResponse {
  total_samples: number;
  avg_wqi: number;
  potable_percentage: number;
  safe_percentage: number;
  states_count: number;
  districts_count: number;
  year_range: string;
  risk_distribution: {
    [key: string]: number;
  };
}

export interface WaterQualityInput {
  pH: number;
  EC: number;
  TDS: number;
  TH: number;
  Ca: number;
  Mg: number;
  Na: number;
  K: number;
  Cl: number;
  SO4: number;
  NO3: number;
  F: number;
  year?: number;
  latitude?: number;
  longitude?: number;
}

export interface PredictionResponse {
  predicted_tds: number;
  wqi: number;
  risk_category: string;
  potable: boolean;
  safe_for_use: boolean;
  recommendations: string[];
  parameter_status: {
    [key: string]: string;
  };
}

export interface DistrictRisk {
  district: string;
  state: string;
  avg_wqi: number;
  avg_tds: number;
  potability_rate: number;
  risk_score: number;
  sample_count: number;
}

export interface TemporalTrend {
  year: number;
  avg_wqi: number;
  avg_tds: number;
  avg_no3: number;
  avg_f: number;
  potability_rate: number;
}

export interface MapDataPoint {
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  avg_wqi: number;
  risk_category: string;
  sample_count: number;
}

export interface StateData {
  state: string;
  total_samples: number;
  avg_wqi: number;
  districts: number;
  risk_distribution: {
    [key: string]: number;
  };
  yearly_trends: {
    [year: string]: number;
  };
}

export interface HealthResponse {
  status: string;
  models_loaded: boolean;
  data_loaded: boolean;
  timestamp: string;
}

export interface BatchPredictionResponse {
  predictions: Array<{
    wqi: number;
    risk_category: string;
  }>;
  count: number;
}

// Form validation types
export interface PredictorFormData {
  pH: string;
  EC: string;
  TDS: string;
  TH: string;
  Ca: string;
  Mg: string;
  Na: string;
  K: string;
  Cl: string;
  SO4: string;
  NO3: string;
  F: string;
  year: string;
  latitude: string;
  longitude: string;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

// API Error type
export interface APIError {
  detail: string;
  status?: number;
}