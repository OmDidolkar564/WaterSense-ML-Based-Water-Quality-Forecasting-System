'use client';

import { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { WaterDrop, Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Predict', href: '/predict' },
    { label: 'Map', href: '/map' },
    { label: 'Districts', href: '/district' },
    { label: 'Treatment', href: '/treatment' },
    { label: 'Forecast', href: '/forecast' },
];

export default function Navigation() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <Box sx={{ p: 2, height: '100%', bgcolor: '#f5f7fa' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#00695c' }}>
                    Menu
                </Typography>
                <IconButton onClick={handleDrawerToggle}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <List>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <ListItem key={item.href} disablePadding href={item.href} component={Link} onClick={handleDrawerToggle}>
                            <ListItemButton sx={{
                                borderRadius: 2,
                                mb: 1,
                                bgcolor: isActive ? 'rgba(0, 105, 92, 0.1)' : 'transparent',
                                color: isActive ? '#00695c' : 'inherit'
                            }}>
                                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isActive ? 700 : 500 }} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <AppBar
            position="sticky"
            sx={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                zIndex: 1200,
            }}
        >
            <Toolbar
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: { xs: '0 16px', md: '0 24px' },
                }}
            >
                {/* Mobile Menu Icon - Left Aligned */}
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2, display: { md: 'none' }, color: '#00695c' }}
                >
                    <MenuIcon />
                </IconButton>

                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                    <WaterDrop sx={{ fontSize: 28, color: '#00695c' }} />
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: '18px', md: '22px' },
                            background: 'linear-gradient(135deg, #00695c 0%, #0288d1 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px',
                        }}
                    >
                        GroundWater ML
                    </Typography>
                </Link>

                {/* Desktop Menu */}
                <Box
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        gap: 1,
                        alignItems: 'center',
                    }}
                >
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    sx={{
                                        color: isActive ? '#fff' : '#455a64',
                                        background: isActive ? 'linear-gradient(135deg, #00695c 0%, #4db6ac 100%)' : 'transparent',
                                        textTransform: 'capitalize',
                                        fontSize: '15px',
                                        fontWeight: isActive ? 600 : 500,
                                        padding: '8px 16px',
                                        borderRadius: '24px',
                                        transition: 'all 0.3s ease',
                                        boxShadow: isActive ? '0 4px 12px rgba(0, 105, 92, 0.3)' : 'none',
                                        '&:hover': {
                                            backgroundColor: isActive ? 'inherit' : 'rgba(0, 105, 92, 0.08)',
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </Box>
            </Toolbar>

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                anchor="left"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
                }}
            >
                {drawer}
            </Drawer>
        </AppBar>
    );
}
