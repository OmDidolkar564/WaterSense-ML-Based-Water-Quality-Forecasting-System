// components/TemporalChart.tsx
'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, CircularProgress } from '@mui/material';
import useSWR from 'swr';
import api from '@/lib/api';

export default function TemporalChart() {
  const { data, isLoading, error } = useSWR('/api/temporal', api.getTemporalTrends);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map(item => ({
      year: item.year,
      WQI: parseFloat(item.avg_wqi.toFixed(2)),
      TDS: parseFloat((item.avg_tds / 10).toFixed(2)), // Scale down for visibility
      NO3: parseFloat(item.avg_no3.toFixed(2)),
      F: parseFloat(item.avg_f.toFixed(2)),
      // Potability: parseFloat((item.potability_rate * 100).toFixed(2))
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <Box>Error loading temporal trends</Box>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="year" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="WQI" stroke="#ff9800" strokeWidth={2} name="WQI" />
        <Line type="monotone" dataKey="TDS" stroke="#2196f3" strokeWidth={2} name="TDS (÷10)" />
        <Line type="monotone" dataKey="NO3" stroke="#f44336" strokeWidth={2} name="NO3" />
        <Line type="monotone" dataKey="F" stroke="#9c27b0" strokeWidth={2} name="Fluoride" />
        {/* <Line type="monotone" dataKey="Potability" stroke="#4caf50" strokeWidth={2} name="Potability %" /> */}
      </LineChart>
    </ResponsiveContainer>
  );
}