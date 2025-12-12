'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#00695c', // Deep Ocean Teal
            light: '#4db6ac',
            dark: '#003d33',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#0288d1', // Ocean Blue
            light: '#5eb8ff',
            dark: '#005b9f',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f4f6f8', // Soft Gray-Blue
            paper: '#ffffff',
        },
        text: {
            primary: '#1a2027',
            secondary: '#455a64',
        },
    },
    typography: {
        fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
            fontSize: '2.5rem',
            letterSpacing: '-0.02em',
        },
        h2: {
            fontWeight: 700,
            fontSize: '2rem',
            letterSpacing: '-0.01em',
        },
        h6: {
            fontWeight: 600,
            letterSpacing: '0.02em',
        },
        button: {
            textTransform: 'none', // Modern feel
            fontWeight: 600,
            borderRadius: '8px',
        },
    },
    shape: {
        borderRadius: 12, // Softer corners
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '50px', // Pill shape for primary actions
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #00695c 0%, #00897b 100%)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Remove default dark mode overlay if switched
                },
                elevation1: {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                },
            },
        },
    },
});

export default theme;
