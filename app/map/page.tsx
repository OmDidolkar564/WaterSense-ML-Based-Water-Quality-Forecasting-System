'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import { PlayArrow, Pause, Map as MapIcon, Info, Layers } from '@mui/icons-material';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { motion } from 'framer-motion';

// Dynamically import map component (client-side only)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <CircularProgress />,
});

const MotionPaper = motion(Paper);
const MotionCard = motion(Card);

export default function MapPage() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);

  // New Features State
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed] = useState(1); // 1 = normal (2s), 2 = fast (1s)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omdidolkar-groundwater-backend.hf.space';

  // Fetch available years from RAW CSV files
  const { data: yearsData } = useSWR('/api/available-years-raw', async (url) => {
    const res = await fetch(
      `${API_URL}${url}`
    );
    if (!res.ok) throw new Error('Failed to fetch years');
    return res.json();
  });

  // Fetch map data from RAW CSV files
  const { data: mapData, isLoading } = useSWR(
    selectedYear ? `/api/map-data-raw?year=${selectedYear}` : null,
    async (url) => {
      const res = await fetch(
        `${API_URL}${url}`
      );
      if (!res.ok) throw new Error('Failed to fetch map data');
      return res.json();
    },
    {
      refreshInterval: 300000,
      shouldRetryOnError: false,
    }
  );

  // Update available years when data loads
  useEffect(() => {
    if (yearsData?.years) {
      setAvailableYears(yearsData.years);
      if (!selectedYear && yearsData.years.length > 0) {
        setSelectedYear(yearsData.years[0]);
      }
    }
  }, [yearsData, selectedYear]);

  // Time Lapse Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying && availableYears.length > 0) {
      interval = setInterval(() => {
        setAvailableYears((years) => { // Use callback to get latest years (though constant usually)
          // Find current index
          const currentIndex = years.indexOf(selectedYear || years[0]);
          const nextIndex = (currentIndex + 1) % years.length;
          const nextYear = years[nextIndex];

          setSelectedYear(nextYear);
          return years; // Return same array
        });
      }, 2000 / playbackSpeed);
    }

    return () => clearInterval(interval);
  }, [isPlaying, selectedYear, availableYears, playbackSpeed]);


  // Calculate summary statistics
  const stats =
    mapData && Array.isArray(mapData) && mapData.length > 0
      ? {
        total: mapData.length,
        avgWqi: (
          mapData.reduce((sum, item) => sum + item.avg_wqi, 0) / mapData.length
        ).toFixed(2),
        excellent: mapData.filter((item) =>
          ['Excellent', 'Good'].includes(item.risk_category)
        ).length,
        poor: mapData.filter((item) => item.risk_category === 'Poor').length,
        veryPoor: mapData.filter((item) => item.risk_category === 'Very Poor').length,
        unsuitable: mapData.filter((item) => item.risk_category === 'Unsuitable').length,
      }
      : null;

  // Filter logic
  const filteredMapData =
    filterType && mapData && Array.isArray(mapData)
      ? mapData.filter((item) => {
        if (filterType === 'good') return ['Excellent', 'Good'].includes(item.risk_category);
        if (filterType === 'poor') return item.risk_category === 'Poor';
        if (filterType === 'very_poor') return item.risk_category === 'Very Poor';
        if (filterType === 'unsuitable') return item.risk_category === 'Unsuitable';
        return true;
      })
      : mapData;

  const wqiCategories = [
    { key: 'good', label: 'Good Quality', count: stats?.excellent, color: '#2e7d32', bg: '#e8f5e9' },
    { key: 'poor', label: 'Poor', count: stats?.poor, color: '#ef6c00', bg: '#fff3e0' },
    { key: 'very_poor', label: 'Very Poor', count: stats?.veryPoor, color: '#d84315', bg: '#fbe9e7' },
    { key: 'unsuitable', label: 'Unsuitable', count: stats?.unsuitable, color: '#c62828', bg: '#ffebee' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 1,
            background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Groundwater Safety Map
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#546e7a' }}>
          Visualize water quality trends across India (2019 - 2023)
        </Typography>
      </Box>

      <Grid container spacing={3} direction={{ xs: 'column-reverse', lg: 'row' }}>
        {/* LEFT COLUMN: Controls & Stats */}
        <Grid item xs={12} lg={3}>
          <Box sx={{ position: { xs: 'static', lg: 'sticky' }, top: 100 }}>

            {/* CONTROL PANEL */}
            <MotionPaper
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MapIcon sx={{ color: '#00695c', mr: 1 }} />
                <Typography variant="h6" fontWeight={700}>Map Controls</Typography>
              </Box>

              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel>Filter by Year</InputLabel>
                <Select
                  value={selectedYear || ''}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setSelectedYear(e.target.value ? Number(e.target.value) : undefined);
                  }}
                  label="Filter by Year"
                  disabled={availableYears.length === 0}
                >
                  <MenuItem value="">All Years</MenuItem>
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, p: 1.5, background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>Time Lapse</Typography>
                  <Typography variant="caption" color="text.secondary">{isPlaying ? 'Playing...' : 'Paused'}</Typography>
                </Box>
                <Tooltip title={isPlaying ? "Pause" : "Play"}>
                  <IconButton
                    onClick={() => setIsPlaying(!isPlaying)}
                    sx={{
                      bgcolor: isPlaying ? '#ffcdd2' : '#c8e6c9',
                      color: isPlaying ? '#c62828' : '#2e7d32',
                      '&:hover': { bgcolor: isPlaying ? '#ef9a9a' : '#a5d6a7' }
                    }}
                  >
                    {isPlaying ? <Pause /> : <PlayArrow />}
                  </IconButton>
                </Tooltip>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Layers sx={{ fontSize: 20, mr: 1, color: '#546e7a' }} />
                    <Typography variant="body2" fontWeight={600}>Heatmap Mode</Typography>
                  </Box>
                }
                sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                labelPlacement="start"
              />
            </MotionPaper>

            {/* STATS PANEL */}
            {stats && (
              <Box>
                <MotionCard
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setFilterType(null)}
                  sx={{
                    mb: 2,
                    cursor: 'pointer',
                    background: filterType === null ? 'linear-gradient(135deg, #0288d1 0%, #03a9f4 100%)' : '#fff',
                    color: filterType === null ? '#fff' : 'inherit',
                    borderRadius: '16px'
                  }}
                >
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ opacity: 0.8 }}>Total Districts</Typography>
                      <Typography variant="h5" fontWeight={800}>{stats.total}</Typography>
                    </Box>
                    <Info sx={{ opacity: 0.5 }} />
                  </CardContent>
                </MotionCard>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {wqiCategories.map((cat) => (
                    <MotionCard
                      key={cat.key}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setFilterType(cat.key)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: '16px',
                        boxShadow: filterType === cat.key ? `0 0 0 2px ${cat.color}` : 'none',
                        background: cat.bg // Use pastel backgrounds
                      }}
                    >
                      <CardContent sx={{ p: '16px !important', textAlign: 'center' }}>
                        <Typography variant="caption" fontWeight={700} sx={{ color: cat.color }}>{cat.label}</Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#37474f' }}>{cat.count}</Typography>
                      </CardContent>
                    </MotionCard>
                  ))}
                </Box>
              </Box>
            )}

          </Box>
        </Grid>

        {/* RIGHT COLUMN: Map */}
        <Grid item xs={12} lg={9}>
          <Paper
            sx={{
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              background: '#fff',
              position: 'relative'
            }}
          >
            {/* Map Toolbar (Legend) */}
            <Box sx={{ p: 2, borderBottom: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                {showHeatmap ? '🔥 Heatmap Visualization' : `🗺️ Markers (${selectedYear || 'All'})`}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {['Excellent', 'Good', 'Poor', 'Very Poor', 'Unsuitable'].map((label, i) => (
                  <Tooltip key={label} title={label}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: ['#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#d32f2f'][i]
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {isLoading ? (
              <Box sx={{ height: { xs: '400px', md: '600px' }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : mapData && mapData.length > 0 ? (
              <Box sx={{ height: { xs: '400px', md: '600px' } }}>
                <MapView data={filteredMapData} showHeatmap={showHeatmap} />
              </Box>
            ) : (
              <Box sx={{ height: { xs: '400px', md: '600px' }, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <Typography color="text.secondary">No data found</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

    </Container>
  );
}
