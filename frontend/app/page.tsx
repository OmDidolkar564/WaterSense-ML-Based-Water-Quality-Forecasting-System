'use client';

// import { useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  WaterDrop,
  Public,
  TrendingDown,
  BarChart as BarChartIcon,
  ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import api from '@/lib/api';
// import type { StatsResponse } from '@/types';
import TemporalChart from '@/components/TemporalChart';
import Link from 'next/link';

const MotionPaper = motion(Paper);
const MotionTypography = motion(Typography);

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transition: { type: 'spring', stiffness: 100 } as any,
  },
};

export default function HomePage() {
  const { data: stats, error, isLoading } = useSWR(
    '/api/stats',
    api.getStats,
    { refreshInterval: 60000 }
  );

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error.message || 'Failed to load data'}
        </Alert>
      </Container>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Samples',
      value: stats.total_samples.toLocaleString(),
      icon: <WaterDrop sx={{ fontSize: 40 }} />,
      color: '#0288d1', // Secondary Blue
      gradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    },
    {
      title: 'Average WQI',
      value: stats.avg_wqi.toFixed(2),
      icon: <TrendingDown sx={{ fontSize: 40 }} />,
      color: stats.avg_wqi < 50 ? '#2e7d32' : stats.avg_wqi < 100 ? '#ed6c02' : '#d32f2f',
      gradient: stats.avg_wqi < 50
        ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
        : stats.avg_wqi < 100
          ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'
          : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
    },
    {
      title: 'States Covered',
      value: stats.states_count?.toString() || '28',
      icon: <Public sx={{ fontSize: 40 }} />,
      color: '#7b1fa2', // Purple
      gradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    },
    {
      title: 'Districts Covered',
      value: stats.districts_count?.toString() || '759',
      icon: <BarChartIcon sx={{ fontSize: 40 }} />,
      color: '#0097a7', // Cyan
      gradient: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
    },
  ];

  return (
    <Container maxWidth="lg">

      {/* HERO SECTION */}
      <Box
        sx={{
          py: { xs: 4, md: 8 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <MotionTypography
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          variant="h3"
          sx={{
            fontWeight: 800,
            mb: 2,
            fontSize: { xs: '2rem', md: '3rem' },
            background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px',
          }}
        >
          Groundwater Intelligence for a Sustainable Future
        </MotionTypography>

        <MotionTypography
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          variant="h6"
          sx={{ color: '#546e7a', maxWidth: '800px', mx: 'auto', mb: 4, fontWeight: 400 }}
        >
          Leveraging advanced machine learning to predict, map, and analyze water quality across India.
        </MotionTypography>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/map">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
            >
              Explore Map
            </Button>
          </Link>
        </motion.div>
      </Box>

      {/* STATS GRID */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {statCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <MotionPaper
                variants={itemVariants}
                whileHover={{ y: -8, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
                sx={{
                  p: 3,
                  background: card.gradient,
                  borderRadius: '16px',
                  // border: `1px solid ${card.color}20`,
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Decorative circle */}
                <Box sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                  zIndex: 0
                }} />

                <Box sx={{ color: card.color, mb: 1.5, zIndex: 1, p: 1.5, borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }}>
                  {card.icon}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#37474f', zIndex: 1 }}>
                  {card.value}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: '#546e7a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', zIndex: 1 }}>
                  {card.title}
                </Typography>
              </MotionPaper>
            </Grid>
          ))}
        </Grid>
      </motion.div>

      {/* CHARTS & INSIGHTS */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} lg={8}>
          <MotionPaper
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            sx={{ p: 4, height: '100%', borderRadius: '24px' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <TrendingDown sx={{ color: '#00695c', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Temporal Trends (2019-2023)
              </Typography>
            </Box>
            <Box sx={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <TemporalChart />
            </Box>
          </MotionPaper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <MotionPaper
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            sx={{
              p: 4,
              height: '100%',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #00695c 0%, #004d40 100%)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center' }}>
              💡 Key Insights
            </Typography>

            <Box sx={{ mb: 4, background: 'rgba(255,255,255,0.1)', p: 2, borderRadius: '12px' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Status: {stats.avg_wqi < 100 ? 'Moderate to Good' : 'Poor'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                National average WQI is <strong>{stats.avg_wqi.toFixed(1)}</strong>.
                {stats.avg_wqi < 100
                  ? ' This indicates generally acceptable water quality, though localized contamination exists.'
                  : ' Immediate attention is required in high-risk zones.'}
              </Typography>
            </Box>

            <Box sx={{ background: 'rgba(255,255,255,0.1)', p: 2, borderRadius: '12px' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Coverage
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                Comprehensive analysis across <strong>{stats.states_count}</strong> states and <strong>{stats.districts_count}</strong> districts, providing a robust dataset for ML predictions.
              </Typography>
            </Box>

          </MotionPaper>
        </Grid>
      </Grid>
    </Container>
  );
}
