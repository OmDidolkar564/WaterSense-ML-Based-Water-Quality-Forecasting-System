// lib/api.ts - API client for backend communication

import axios from 'axios';
import type {
  StatsResponse,
  WaterQualityInput,
  PredictionResponse,
  DistrictRisk,
  TemporalTrend,
  MapDataPoint,
  StateData,
  HealthResponse,
} from '@/types';

// Get API URL from environment variable or use default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omdidolkar-groundwater-backend.hf.space';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.detail || error.response.statusText;
      throw new Error(message);
    } else if (error.request) {
      // No response received
      throw new Error('No response from server. Please check if backend is running.');
    } else {
      // Request setup error
      throw new Error(error.message);
    }
  }
);

// ============================================================================
// API FUNCTIONS
// ============================================================================

const api = {
  /**
   * Health check
   */
  async health(): Promise<HealthResponse> {
    const { data } = await apiClient.get<HealthResponse>('/api/health');
    return data;
  },

  /**
   * Get overall statistics
   */
  async getStats(): Promise<StatsResponse> {
    const { data } = await apiClient.get<StatsResponse>('/api/stats');
    return data;
  },

  /**
   * Predict water quality
   */
  async predict(input: WaterQualityInput): Promise<PredictionResponse> {
    const { data } = await apiClient.post<PredictionResponse>('/api/predict', input);
    return data;
  },

  /**
   * Get district risks
   */
  async getDistrictRisks(params?: {
    limit?: number;
    sort_by?: string;
  }): Promise<DistrictRisk[]> {
    const { data } = await apiClient.get<DistrictRisk[]>('/api/districts', {
      params,
    });
    return data;
  },

  /**
   * Get temporal trends
   */
  async getTemporalTrends(): Promise<TemporalTrend[]> {
    const { data } = await apiClient.get<TemporalTrend[]>('/api/temporal');
    return data;
  },

  /**
   * Get available years with map data
   */
  async getAvailableYears(): Promise<{
    available_years: Array<{
      year: number;
      total_samples: number;
      valid_coordinates: number;
      districts: number;
      has_map_data: boolean;
    }>;
    years_with_map_data: number[];
    all_years: number[];
  }> {
    const { data } = await apiClient.get('/api/years');
    return data;
  },

  /**
   * Get map data
   */
  async getMapData(year?: number): Promise<MapDataPoint[]> {
    const { data } = await apiClient.get<MapDataPoint[]>('/api/map-data', {
      params: year ? { year } : undefined,
    });
    return data;
  },

  /**
   * Get list of states
   */
  async getStates(): Promise<string[]> {
    const { data } = await apiClient.get<{ states: string[] }>('/api/states');
    return data.states;
  },

  /**
   * Get state data
   */
  async getStateData(stateName: string): Promise<StateData> {
    const { data } = await apiClient.get<StateData>(`/api/state/${stateName}`);
    return data;
  },

  /**
   * Batch prediction from file
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async batchPredict(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post('/api/batch-predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};

export default api;