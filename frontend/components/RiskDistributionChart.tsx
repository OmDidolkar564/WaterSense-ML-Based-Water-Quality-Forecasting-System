// components/RiskDistributionChart.tsx
'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

interface RiskDistributionChartProps {
  data: Record<string, number>;
}

const COLORS: Record<string, string> = {
  'Excellent': '#4caf50',
  'Good': '#8bc34a',
  'Poor': '#ff9800',
  'Very Poor': '#ff5722',
  'Unsuitable': '#f44336'
};

export default function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];

    return Object.entries(data).map(([name, value]) => ({
      name,
      value,
      color: COLORS[name] || '#9e9e9e'
    }));
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography color="text.secondary">No risk distribution data available</Typography>
      </Box>
    );
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Box>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              `${value} samples (${((value / total) * 100).toFixed(1)}%)`,
              'Count'
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <Box mt={2} px={2}>
        {chartData.map((item) => (
          <Box
            key={item.name}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: item.color
                }}
              />
              <Typography variant="body2">{item.name}</Typography>
            </Box>
            <Typography variant="body2" fontWeight="bold">
              {item.value.toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}