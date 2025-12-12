'use client';

import { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Science,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import api from '@/lib/api';
import type { WaterQualityInput, PredictionResponse } from '@/types';

const MotionPaper = motion(Paper);

interface FormData {
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
}

const PRESETS = {
  excellent: {
    pH: '7.5',
    EC: '300',
    TDS: '200',
    TH: '100',
    Ca: '30',
    Mg: '15',
    Na: '50',
    K: '5',
    Cl: '50',
    SO4: '30',
    NO3: '5',
    F: '0.5',
  },
  poor: {
    pH: '8.5',
    EC: '2000',
    TDS: '1500',
    TH: '500',
    Ca: '150',
    Mg: '100',
    Na: '300',
    K: '30',
    Cl: '400',
    SO4: '250',
    NO3: '80',
    F: '2.0',
  },
};

export default function PredictPage() {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      pH: '7.5',
      EC: '500',
      TDS: '300',
      TH: '200',
      Ca: '50',
      Mg: '30',
      Na: '100',
      K: '10',
      Cl: '100',
      SO4: '50',
      NO3: '20',
      F: '0.8',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const inputData: WaterQualityInput = {
        pH: parseFloat(data.pH),
        EC: parseFloat(data.EC),
        TDS: parseFloat(data.TDS),
        TH: parseFloat(data.TH),
        Ca: parseFloat(data.Ca),
        Mg: parseFloat(data.Mg),
        Na: parseFloat(data.Na),
        K: parseFloat(data.K),
        Cl: parseFloat(data.Cl),
        SO4: parseFloat(data.SO4),
        NO3: parseFloat(data.NO3),
        F: parseFloat(data.F),
        year: new Date().getFullYear(),
        latitude: 20.5937,
        longitude: 78.9629,
      };

      const result = await api.predict(inputData);

      // FIX: Ensure consistent logic - if WQI > 100, cannot be potable
      if (result.wqi > 100) {
        result.potable = false;
        result.safe_for_use = false;
      }

      setPrediction(result);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    Object.entries(preset).forEach(([key, value]) => {
      setValue(key as keyof FormData, value);
    });
  };

  const parameters = [
    {
      name: 'pH',
      label: 'pH',
      unit: '',
      min: 0,
      max: 14,
      step: 0.1,
      group: 'Primary',
    },
    {
      name: 'EC',
      label: 'Electrical Conductivity',
      unit: 'μS/cm',
      min: 0,
      max: 5000,
      step: 10,
      group: 'Primary',
    },
    {
      name: 'TDS',
      label: 'Total Dissolved Solids',
      unit: 'mg/L',
      min: 0,
      max: 3000,
      step: 10,
      group: 'Primary',
    },
    {
      name: 'TH',
      label: 'Total Hardness',
      unit: 'mg/L',
      min: 0,
      max: 1000,
      step: 10,
      group: 'Hardness',
    },
    {
      name: 'Ca',
      label: 'Calcium',
      unit: 'mg/L',
      min: 0,
      max: 200,
      step: 1,
      group: 'Hardness',
    },
    {
      name: 'Mg',
      label: 'Magnesium',
      unit: 'mg/L',
      min: 0,
      max: 100,
      step: 1,
      group: 'Hardness',
    },
    {
      name: 'Na',
      label: 'Sodium',
      unit: 'mg/L',
      min: 0,
      max: 500,
      step: 1,
      group: 'Ions',
    },
    {
      name: 'K',
      label: 'Potassium',
      unit: 'mg/L',
      min: 0,
      max: 50,
      step: 1,
      group: 'Ions',
    },
    {
      name: 'Cl',
      label: 'Chloride',
      unit: 'mg/L',
      min: 0,
      max: 1000,
      step: 10,
      group: 'Anions',
    },
    {
      name: 'SO4',
      label: 'Sulfate',
      unit: 'mg/L',
      min: 0,
      max: 500,
      step: 10,
      group: 'Anions',
    },
    {
      name: 'NO3',
      label: 'Nitrate',
      unit: 'mg/L',
      min: 0,
      max: 100,
      step: 1,
      group: 'Anions',
    },
    {
      name: 'F',
      label: 'Fluoride',
      unit: 'mg/L',
      min: 0,
      max: 5,
      step: 0.1,
      group: 'Other',
    },
  ];

  const groupedParameters = parameters.reduce(
    (acc, param) => {
      if (!acc[param.group]) acc[param.group] = [];
      acc[param.group].push(param);
      return acc;
    },
    {} as Record<string, typeof parameters>
  );

  const getWQICategory = (wqi: number) => {
    if (wqi < 50) return '✅ Excellent Quality';
    if (wqi < 100) return '✅ Good Quality';
    if (wqi < 150) return '⚠️ Moderate Quality';
    if (wqi < 200) return '⚠️ Poor Quality';
    return '❌ Very Poor Quality - Unsuitable';
  };

  const getWQIColor = (wqi: number) => {
    if (wqi < 50) return '#4caf50';
    if (wqi < 100) return '#8bc34a';
    if (wqi < 150) return '#ff9800';
    if (wqi < 200) return '#ff5722';
    return '#f44336';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 3,
        px: 2,
        background: '#f5f7fa',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🧪 Water Quality Predictor
        </Typography>
        <Typography variant="subtitle2" sx={{ color: '#666' }}>
          Enter water chemical parameters to get instant WQI prediction
        </Typography>
      </Box>

      {/* MAIN LAYOUT - FULL HEIGHT */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 3,
          minHeight: 'calc(100vh - 200px)',
          flexWrap: 'wrap',
        }}
      >
        {/* LEFT SIDE - INPUT FORM (FULL HEIGHT WITH INTERNAL SCROLL) */}
        <Paper
          sx={{
            width: '100%',
            maxWidth: '450px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* FIXED HEADER */}
          <Box
            sx={{
              p: 2.5,
              borderBottom: '1px solid #eee',
              background: '#fff',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
              📝 Input Parameters
            </Typography>

            {/* Quick Presets */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => applyPreset('excellent')}
                sx={{ flex: 1, fontSize: '12px' }}
              >
                Excellent Water
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => applyPreset('poor')}
                sx={{ flex: 1, fontSize: '12px' }}
              >
                Poor Water
              </Button>
            </Box>
          </Box>

          {/* SCROLLABLE CONTENT */}
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',

              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#ccc',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#999',
              },
            }}
          >
            {Object.entries(groupedParameters).map(([group, params]) => (
              <Box key={group} sx={{ mb: 2.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: '#667eea',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '1px',
                  }}
                >
                  {group} Parameters
                </Typography>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  {params.map((param) => (
                    <Grid item xs={12} key={param.name}>
                      <Controller
                        name={param.name as keyof FormData}
                        control={control}
                        render={({ field }) => (
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                fontWeight: 600,
                                color: '#333',
                                mb: 0.5,
                                fontSize: '12px',
                              }}
                            >
                              {param.label}
                              {param.unit && (
                                <span style={{ color: '#999', fontWeight: 400 }}>
                                  {' '}
                                  ({param.unit})
                                </span>
                              )}
                            </Typography>
                            <TextField
                              {...field}
                              type="number"
                              size="small"
                              fullWidth
                              variant="outlined"
                              inputProps={{
                                min: param.min,
                                max: param.max,
                                step: param.step,
                              }}
                              error={!!errors[param.name as keyof FormData]}
                              sx={{
                                '& .MuiInputBase-root': {
                                  fontSize: '13px',
                                },
                              }}
                            />
                          </Box>
                        )}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}


            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>

          {/* FIXED FOOTER - BUTTONS */}
          <Box
            sx={{
              p: 2.5,
              borderTop: '1px solid #eee',
              background: '#fff',
              display: 'flex',
              gap: 1.5,
            }}
          >
            <Button
              type="submit"
              variant="contained"
              fullWidth
              onClick={handleSubmit(onSubmit)}
              startIcon={
                loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Science />
                )
              }
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'capitalize',
                fontWeight: 600,
                py: 1.2,
              }}
            >
              {loading ? 'Analyzing...' : 'Predict'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                reset();
                setPrediction(null);
                setError(null);
              }}
              startIcon={<Refresh sx={{ fontSize: 20 }} />}
              sx={{
                textTransform: 'capitalize',
                fontWeight: 600,
                py: 1.2,
              }}
            >
              Reset
            </Button>
          </Box>
        </Paper>

        {/* RIGHT SIDE - RESULTS (FULL HEIGHT WITH INTERNAL SCROLL) */}
        {prediction ? (
          <MotionPaper
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            sx={{
              width: '100%',
              maxWidth: '450px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
            }}
          >
            {/* FIXED HEADER */}
            <Box
              sx={{
                p: 2.5,
                borderBottom: '1px solid #ddd',
                background: '#fff',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                📊 Results
              </Typography>
            </Box>

            {/* SCROLLABLE CONTENT */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 2.5,

                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#ccc',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#999',
                },
              }}
            >
              {/* WQI Score - PROMINENT */}
              <Card
                sx={{
                  mb: 2,
                  background: `linear-gradient(135deg, ${getWQIColor(
                    prediction.wqi
                  )} 0%, ${prediction.wqi < 100
                    ? '#8bc34a'
                    : prediction.wqi < 150
                      ? '#ffa726'
                      : '#ef5350'
                    } 100%)`,
                  color: '#fff',
                  textAlign: 'center',
                  boxShadow: `0 8px 24px ${getWQIColor(prediction.wqi)}40`,
                }}
              >
                <CardContent>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 500 }}>
                    Water Quality Index (WQI)
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700, my: 1 }}>
                    {prediction.wqi.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.95 }}>
                    {getWQICategory(prediction.wqi)}
                  </Typography>
                </CardContent>
              </Card>

              {/* WQI Explanation */}
              {prediction.wqi > 100 && (
                <Alert severity="warning" sx={{ mb: 2, fontSize: '12px' }}>
                  <strong>WQI {prediction.wqi.toFixed(1)} indicates</strong> water
                  quality exceeds safe limits. Treatment required.
                </Alert>
              )}

              {/* Status Indicators */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Card
                    sx={{
                      background: prediction.potable ? '#e8f5e9' : '#ffebee',
                      border: `2px solid ${prediction.potable ? '#4caf50' : '#f44336'
                        }`,
                      textAlign: 'center',
                      py: 2.5,
                      px: 1.5,
                      borderRadius: '10px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ mb: 1 }}>
                      {prediction.potable ? (
                        <CheckCircle sx={{ color: '#4caf50', fontSize: '32px' }} />
                      ) : (
                        <ErrorIcon sx={{ color: '#f44336', fontSize: '32px' }} />
                      )}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Potable
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {prediction.potable ? 'Yes ✓' : 'No ✗'}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card
                    sx={{
                      background: prediction.safe_for_use ? '#e8f5e9' : '#ffebee',
                      border: `2px solid ${prediction.safe_for_use ? '#4caf50' : '#f44336'
                        }`,
                      textAlign: 'center',
                      py: 2.5,
                      px: 1.5,
                      borderRadius: '10px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box sx={{ mb: 1 }}>
                      {prediction.safe_for_use ? (
                        <CheckCircle sx={{ color: '#4caf50', fontSize: '32px' }} />
                      ) : (
                        <Warning sx={{ color: '#ff9800', fontSize: '32px' }} />
                      )}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Safe for Use
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {prediction.safe_for_use ? 'Yes ✓' : 'No ✗'}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>


              <Divider sx={{ my: 2 }} />

              {/* Parameter Status - TABLE FORMAT (COMPACT) */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                ⚗️ Parameter Analysis
              </Typography>
              <TableContainer
                sx={{ mb: 2, border: '1px solid #ddd', borderRadius: '8px' }}
              >
                <Table size="small">
                  <TableHead sx={{ background: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>
                        Parameter
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(prediction.parameter_status).map(
                      ([param, status]) => {
                        const isWarning = status.includes('Exceeds');
                        const isSafe = status.includes('Safe') || status.includes('Within');
                        return (
                          <TableRow
                            key={param}
                            hover
                            sx={{
                              background: isWarning ? '#fff3e0' : isSafe ? '#f1f8e9' : '#fff',
                            }}
                          >
                            <TableCell sx={{ fontSize: '11px', fontWeight: 500 }}>
                              {param}
                            </TableCell>
                            <TableCell sx={{ fontSize: '11px' }}>
                              <Chip
                                label={status}
                                size="small"
                                color={
                                  isWarning
                                    ? 'warning'
                                    : isSafe
                                      ? 'success'
                                      : 'error'
                                }
                                variant="filled"
                                sx={{ fontSize: '10px' }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              {/* Recommendations */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                💡 Recommendations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {prediction.recommendations.slice(0, 4).map((rec, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      p: 1,
                      background: '#fff',
                      borderRadius: '6px',
                      alignItems: 'flex-start',
                      fontSize: '11px',
                      border: '1px solid #eee',
                    }}
                  >
                    {rec.includes('✓') ? (
                      <CheckCircle
                        sx={{
                          color: '#4caf50',
                          fontSize: '14px',
                          mt: '2px',
                          flexShrink: 0,
                        }}
                      />
                    ) : rec.includes('⚠') ? (
                      <Warning
                        sx={{
                          color: '#ff9800',
                          fontSize: '14px',
                          mt: '2px',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <ErrorIcon
                        sx={{
                          color: '#f44336',
                          fontSize: '14px',
                          mt: '2px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography sx={{ flex: 1, lineHeight: 1.3 }}>
                      {rec}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </MotionPaper>
        ) : (
          <Paper
            sx={{
              width: '100%',
              maxWidth: '450px',
              borderRadius: '12px',
              textAlign: 'center',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
            }}
          >
            <Science sx={{ fontSize: '64px', color: '#ccc', mb: 2 }} />
            <Typography variant="subtitle1" sx={{ color: '#999', fontWeight: 500 }}>
              Enter parameters and click &quot;Predict&quot;
            </Typography>
            <Typography variant="caption" sx={{ color: '#bbb', mt: 1 }}>
              Results will appear here
            </Typography>
          </Paper>
        )}
      </Box>

      {/* WQI Reference Info */}
      <Paper
        sx={{
          mt: 4,
          p: 2,
          borderRadius: '12px',
          background: '#fff',
          border: '1px solid #e0e0e0',
          maxWidth: '1000px',
          mx: 'auto',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          📚 WQI Scale Reference
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          {[
            { range: '0 - 50', category: 'Excellent', color: '#4caf50' },
            { range: '50 - 100', category: 'Good', color: '#8bc34a' },
            { range: '100 - 150', category: 'Moderate', color: '#ff9800' },
            { range: '150 - 200', category: 'Poor', color: '#ff5722' },
            { range: '200+', category: 'Very Poor', color: '#f44336' },
          ].map((item) => (
            <Grid item xs={6} sm={4} md={2} key={item.range}>
              <Box
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  borderRadius: '8px',
                  background: `${item.color}20`,
                  border: `2px solid ${item.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '80px',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: item.color,
                    textAlign: 'center',
                    width: '100%',
                  }}
                >
                  {item.range}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    mt: 0.8,
                    textAlign: 'center',
                    width: '100%',
                  }}
                >
                  {item.category}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

    </Box>
  );
}
