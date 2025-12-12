'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Timeline, TrendingUp } from '@mui/icons-material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

interface ForecastItem {
    Year: number;
    WQI: number;
    TDS: number;
    pH: number;
    NO3: number;
    F: number;
    Risk_Category: string;
}

interface ForecastResponse {
    district: string;
    state: string;
    forecast_data: ForecastItem[];
}

interface Locations {
    [state: string]: string[];
}

export default function ForecastPage() {
    // Selectors
    const [locations, setLocations] = useState<Locations>({});
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedDistrict, setSelectedDistrict] = useState<string>('');

    // Data
    const [forecastData, setForecastData] = useState<ForecastItem[]>([]);
    const [loadingLocs, setLoadingLocs] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Locations on Mount
    useEffect(() => {
        fetch('/api/locations')
            .then(res => res.json())
            .then(data => {
                setLocations(data);
                // Default selection to first reasonable option
                const states = Object.keys(data);
                if (states.length > 0) {
                    const firstState = states[0];
                    setSelectedState(firstState);
                    if (data[firstState]?.length > 0) {
                        setSelectedDistrict(data[firstState][0]);
                    }
                }
                setLoadingLocs(false);
            })
            .catch(err => {
                console.error("Failed to load locations", err);
                setError("Failed to load location list.");
                setLoadingLocs(false);
            });
    }, []);

    // Fetch Forecast when District Changes
    useEffect(() => {
        if (!selectedDistrict) return;

        setLoadingData(true);
        setError(null);
        
        fetch(`/api/forecast/${selectedDistrict}`)
            .then(async (res) => {
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Failed to fetch forecast');
                }
                return res.json();
            })
            .then((data: ForecastResponse) => {
                // Ensure years are sorted
                const sorted = data.forecast_data.sort((a, b) => a.Year - b.Year); 
                setForecastData(sorted);
                setLoadingData(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setLoadingData(false);
                setForecastData([]);
            });

    }, [selectedDistrict]);

    // Derived States for Dropdowns
    const states = useMemo(() => Object.keys(locations).sort(), [locations]);
    const districts = useMemo(() => {
        return selectedState ? (locations[selectedState] || []).sort() : [];
    }, [locations, selectedState]);

    // Chart logic
    const chartData = useMemo(() => {
        return forecastData.map(d => ({
            year: d.Year,
            WQI: d.WQI,
            TDS: d.TDS,
            pH: d.pH,
            NO3: d.NO3
        }));
    }, [forecastData]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 2 }}>
                    <TrendingUp sx={{ fontSize: 40, color: '#00695c' }} />
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #00695c 0%, #004d40 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Future Forecasting (2025-2030)
                    </Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ color: '#666' }}>
                    Predictive analysis using AI linear projection models on 2019-2023 data.
                </Typography>
            </Box>

            {/* Error Alert */}
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Controls */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: '16px' }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth disabled={loadingLocs}>
                            <InputLabel>All States</InputLabel>
                            <Select
                                value={selectedState}
                                label="Select State"
                                onChange={(e) => {
                                    setSelectedState(e.target.value);
                                    // Reset district
                                    const newDists = locations[e.target.value];
                                    if (newDists?.length) setSelectedDistrict(newDists[0]);
                                    else setSelectedDistrict('');
                                }}
                            >
                                {states.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth disabled={!selectedState || loadingLocs}>
                            <InputLabel>District</InputLabel>
                            <Select
                                value={selectedDistrict}
                                label="Select District"
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                            >
                                {districts.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
                        {loadingData && <CircularProgress size={24} sx={{ mr: 2 }} />}
                        {selectedDistrict && !loadingData && (
                            <Typography variant="body2" color="success.main">
                                ✅ Forecast Loaded for {selectedDistrict}
                            </Typography>
                        )}
                    </Grid>
                </Grid>
            </Paper>

            {/* Main Chart */}
            {forecastData.length > 0 && (
                <Grid container spacing={3}>
                    {/* WQI Chart */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, borderRadius: '16px', height: 450 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#00695c' }}>
                                Water Quality Index (WQI) Projection
                            </Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="year" />
                                    <YAxis domain={[0, 'auto']} label={{ value: 'WQI', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend />
                                    <ReferenceLine x={2023} stroke="red" strokeDasharray="3 3" label="Forecast Start" />
                                    <Line type="monotone" dataKey="WQI" stroke="#ff9800" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* Parameters Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: '16px', height: 400 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2' }}>
                                Chemical Parameters (TDS, NO3)
                            </Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="year" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <Tooltip />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="TDS" stroke="#2196f3" strokeWidth={2} name="TDS (mg/L)" />
                                    <Line yAxisId="right" type="monotone" dataKey="NO3" stroke="#f44336" strokeWidth={2} name="Nitrate (mg/L)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {/* pH Chart */}
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 3, borderRadius: '16px', height: 400 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#7b1fa2' }}>
                                pH Levels
                            </Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="year" />
                                    <YAxis domain={[6, 9]} />
                                    <Tooltip />
                                    <Legend />
                                    <ReferenceLine y={6.5} stroke="green" strokeDasharray="3 3" />
                                    <ReferenceLine y={8.5} stroke="green" strokeDasharray="3 3" />
                                    <Line type="monotone" dataKey="pH" stroke="#9c27b0" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Container>
    );
}
