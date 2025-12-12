/* eslint-disable */
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Grid,
  Chip,
} from '@mui/material';
import { Add, NotificationsActive } from '@mui/icons-material';
import SubscriptionModal from '@/components/SubscriptionModal';

interface DistrictData {
  Well_ID: string | null;
  State: string;
  District: string;
  Block: string | null;
  Village: string | null;
  Latitude: number | null;
  Longitude: number | null;
  Year: number;
  pH: number | string | null;
  EC: number | string | null;
  CO3: number | string | null;
  HCO3: number | null;
  Cl: number | null;
  SO4: number | string | null;
  NO3: number | null;
  PO4: string | null;
  TH: number | null;
  Ca: number | null;
  Mg: number | string | null;
  Na: number | null;
  K: number | string | null;
  F: number | string | null;
  TDS: number | string | null;
  SiO2: number | null;
}

export default function DistrictPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2019);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [data, setData] = useState<DistrictData[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Rename to fetchError to avoid lint conflicts
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Log errors for debugging (and to satisfy linter)
  useEffect(() => {
    if (fetchError) console.error('District Page Error:', fetchError);
  }, [fetchError]);

  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [openSubscriptionModal, setOpenSubscriptionModal] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<'district' | 'state'>('district');

  const LIMIT = 50;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://omdidolkar-groundwater-backend.hf.space';

  // Helper function to safely format numbers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatNumber = (value: any, decimals: number = 2): string => {
    if (value === null || value === undefined || value === '' || value === 'BDL' || value === 'Nil') return '-';
    const num = typeof value === 'number' ? value : Number(value);
    return isNaN(num) ? String(value) : num.toFixed(decimals);
  };

  // Fetch available years
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const res = await fetch(`${API_URL}/api/available-years`);
        if (!res.ok) throw new Error('Failed to fetch years');
        const result = await res.json();
        setAvailableYears(result.years || []);
        if (result.years && result.years.length > 0) {
          setSelectedYear(result.years[0]);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Error fetching years:', err);
      }
    };

    fetchAvailableYears();
  }, [API_URL]);

  // Fetch data when year changes
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    setData([]);
    setOffset(0);

    try {
      let url = `${API_URL}/api/district-data?year=${selectedYear}&offset=0&limit=${LIMIT}`;

      if (stateFilter) {
        url += `&state=${encodeURIComponent(stateFilter)}`;
      }
      if (districtFilter) {
        url += `&district=${encodeURIComponent(districtFilter)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch data');
      const result = await res.json();

      setData(result.data || []);
      setTotalRecords(result.total_records || 0);
      setOffset(LIMIT);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setFetchError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      let url = `${API_URL}/api/district-data?year=${selectedYear}&offset=${offset}&limit=${LIMIT}`;

      if (stateFilter) {
        url += `&state=${encodeURIComponent(stateFilter)}`;
      }
      if (districtFilter) {
        url += `&district=${encodeURIComponent(districtFilter)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load more');
      const result = await res.json();

      setData((prev) => [...prev, ...(result.data || [])]);
      setOffset((prev) => prev + LIMIT);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = offset < totalRecords;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
          📊 Area-Level Data
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#666' }}>
          Detailed groundwater quality measurements by district
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '12px' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Select Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                label="Select Year"
              >
                {availableYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Filter by State"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              placeholder="e.g. Himachal Pradesh"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Filter by District"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              placeholder="e.g. Solan"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              onClick={fetchData}
              sx={{ height: '56px' }}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>

        <Box sx={{
          mt: 2,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' }
        }}>
          <Chip
            label={`Total Records: ${totalRecords.toLocaleString()}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Showing: ${data.length}`}
            color="secondary"
            variant="outlined"
          />
          {districtFilter ? (
            <Button
              variant="outlined"
              startIcon={<NotificationsActive />}
              onClick={() => {
                setSubscriptionType('district');
                setOpenSubscriptionModal(true);
              }}
              color="secondary"
            >
              Subscribe to {districtFilter}
            </Button>
          ) : stateFilter ? (
            <Button
              variant="outlined"
              startIcon={<NotificationsActive />}
              onClick={() => {
                setSubscriptionType('state');
                setOpenSubscriptionModal(true);
              }}
              color="primary"
            >
              Subscribe to {stateFilter}
            </Button>
          ) : null}
        </Box>
      </Paper>

      <SubscriptionModal
        open={openSubscriptionModal}
        onClose={() => setOpenSubscriptionModal(false)}
        locationName={districtFilter || stateFilter}
        subscriptionType={subscriptionType}
      />

      {/* Error Alert */}
      {fetchError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
      )}

      {/* Data Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: '12px', mb: 3, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1500 }}>
              <TableHead sx={{ background: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>Well ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>District</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>Block</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '11px' }}>Village</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px' }}>
                    pH
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px' }}>
                    EC
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px' }}>
                    Cl
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px' }}>
                    NO3
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px' }}>
                    F
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px' }}>
                    TH
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px' }}>
                    TDS
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '10px', maxWidth: '120px', overflow: 'hidden' }}>
                      {row.Well_ID || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '11px' }}>{row.State}</TableCell>
                    <TableCell sx={{ fontSize: '11px' }}>{row.District}</TableCell>
                    <TableCell sx={{ fontSize: '11px' }}>{row.Block || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '11px' }}>{row.Village || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '11px' }}>
                      {formatNumber(row.pH)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '11px' }}>
                      {row.EC || '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '11px' }}>
                      {row.Cl || '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '11px' }}>
                      {row.NO3 || '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '11px' }}>
                      {formatNumber(row.F)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '11px' }}>
                      {row.TH || '-'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '11px' }}>
                      {row.TDS || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Load More Button */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            {hasMore && (
              <Button
                variant="contained"
                startIcon={loadingMore ? <CircularProgress size={20} /> : <Add />}
                onClick={loadMore}
                disabled={loadingMore}
                sx={{ textTransform: 'none' }}
              >
                {loadingMore ? 'Loading...' : `Load More (${LIMIT} rows)`}
              </Button>
            )}

            {!hasMore && data.length > 0 && (
              <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                ✅ All records loaded
              </Typography>
            )}
          </Box>
        </>
      )}
    </Container>
  );
}
