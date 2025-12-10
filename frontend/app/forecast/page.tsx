'use client';

import { useEffect, useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
} from '@mui/material';
import { Add, Timeline } from '@mui/icons-material';

interface ForecastData {
    well_id: string;
    parameter: string;
    actual_2022: number;
    predicted_2022: number;
    difference: number;
    percent_change: number;
    abs_error: number;
    abs_error_pct: number;
}

interface SummaryStats {
    [key: string]: {
        actual_mean: number;
        predicted_mean: number;
        actual_std: number;
        predicted_std: number;
        actual_min: number;
        actual_max: number;
        mae: number;
        rmse: number;
        r2: number;
        samples: number;
    };
}

export default function ForecastPage() {
    const [selectedParameter, setSelectedParameter] = useState('');
    const [allData, setAllData] = useState<ForecastData[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);
    const [parameters, setParameters] = useState<string[]>([]);
    const [summaryData, setSummaryData] = useState<SummaryStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    const LIMIT = 20;
    const API_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000';

    // Fetch summary stats
    useEffect(() => {
        fetchSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchSummary = async () => {
        try {
            const res = await fetch(`${API_URL}/api/forecast/summary`);
            if (!res.ok) throw new Error('Failed to fetch summary');
            const data = await res.json();
            setSummaryData(data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Summary fetch error:', err);
        }
    };

    // Fetch initial data
    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedParameter]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = selectedParameter
                ? `${API_URL}/api/forecast?parameter=${selectedParameter}&offset=0&limit=${LIMIT}`
                : `${API_URL}/api/forecast?offset=0&limit=${LIMIT}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch data');

            const result = await res.json();

            setAllData(result.data || []);
            setTotalRecords(result.total_records || 0);
            setHasMore(result.has_more || false);
            setOffset(LIMIT);
            setParameters(result.parameters || []);

            if (!selectedParameter && result.parameters && result.parameters.length > 0) {
                setSelectedParameter(result.parameters[0]);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    // Load more data
    const loadMoreData = async () => {
        setLoadingMore(true);
        try {
            const url = selectedParameter
                ? `${API_URL}/api/forecast?parameter=${selectedParameter}&offset=${offset}&limit=${LIMIT}`
                : `${API_URL}/api/forecast?offset=${offset}&limit=${LIMIT}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to load more');
            const result = await res.json();

            setAllData((prev) => [...prev, ...(result.data || [])]);
            setHasMore(result.has_more || false);
            setOffset((prev) => prev + LIMIT);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Error loading more:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const summary = summaryData?.[selectedParameter];

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 2 }}>
                    <Timeline sx={{ fontSize: 40, color: '#764ba2' }} />
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Model Validation (2022)
                    </Typography>
                </Box>
                <Typography variant="subtitle1" sx={{ color: '#666' }}>
                    Actual vs Predicted water quality parameters
                </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Parameter Selector & Summary */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth disabled={loading || parameters.length === 0}>
                            <InputLabel>Select Parameter</InputLabel>
                            <Select
                                value={selectedParameter}
                                onChange={(e) => setSelectedParameter(e.target.value)}
                                label="Select Parameter"
                            >
                                {parameters.map((param) => (
                                    <MenuItem key={param} value={param}>
                                        {param}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Summary Cards - ALL CONSTANT COLORS */}
                    {summary && (
                        <>
                            <Grid item xs={12} sm={6} md={2}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" sx={{ color: '#555', fontWeight: 700 }}>
                                        ACTUAL (Mean)
                                    </Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
                                        {summary.actual_mean.toFixed(2)}
                                    </Typography>
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6} md={2}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" sx={{ color: '#555', fontWeight: 700 }}>
                                        PREDICTED (Mean)
                                    </Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
                                        {summary.predicted_mean.toFixed(2)}
                                    </Typography>
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6} md={2}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" sx={{ color: '#555', fontWeight: 700 }}>
                                        MAE
                                    </Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
                                        {summary.mae.toFixed(2)}
                                    </Typography>
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="caption" sx={{ color: '#555', fontWeight: 700 }}>
                                        R² SCORE
                                    </Typography>
                                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
                                        {summary.r2.toFixed(4)}
                                    </Typography>
                                </Box>
                            </Grid>
                        </>
                    )}
                </Grid>
            </Paper>

            {/* Data Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : allData.length === 0 ? (
                <Alert severity="warning">
                    No data available. Make sure backend is running.
                </Alert>
            ) : (
                <>
                    <TableContainer component={Paper} sx={{ borderRadius: '12px', mb: 3 }}>
                        <Table>
                            <TableHead sx={{ background: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Parameter</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Actual
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Predicted
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Error
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        Error (%)
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allData.map((row, idx) => (
                                    <TableRow key={idx} hover>
                                        <TableCell sx={{ fontSize: '12px', color: '#333' }}>
                                            {row.well_id}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: '#333' }}>
                                            {row.parameter}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#333' }}>
                                            {row.actual_2022.toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#333' }}>
                                            {row.predicted_2022.toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, color: '#333' }}>
                                            {row.difference.toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600, color: '#333' }}>
                                            {row.percent_change.toFixed(2)}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Load More Section */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 2 }}>
                            Showing {allData.length} of {totalRecords.toLocaleString()} records
                        </Typography>

                        {hasMore && (
                            <Button
                                variant="contained"
                                startIcon={loadingMore ? <CircularProgress size={20} /> : <Add />}
                                onClick={loadMoreData}
                                disabled={loadingMore}
                                sx={{ textTransform: 'none' }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More (20 rows)'}
                            </Button>
                        )}

                        {!hasMore && allData.length > 0 && (
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
                                ✅ All records loaded
                            </Typography>
                        )}
                    </Box>
                </>
            )}
        </Container>
    );
}
