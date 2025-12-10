'use client';

import { useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    Chip,
} from '@mui/material';
import {
    Science,
    AttachMoney,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

const TREATMENT_DATA = {
    high_ph: {
        title: 'High pH (> 8.5)',
        treatments: [
            {
                chemical: 'CO₂ Injection',
                dosage: '2-5 mg/L',
                mechanism: 'CO₂ + H₂O → H₂CO₃ (carbonic acid)',
                cost_per_kg: '₹15-25/kg',
                cost_per_m3: '₹100-250/m³',
                application: 'Acidification',
                advantages: 'Safe, natural, effective',
            },
            {
                chemical: 'Sulfuric Acid (H₂SO₄)',
                dosage: '0.5-2 mg/L',
                mechanism: 'Direct pH reduction',
                cost_per_kg: '₹5-15/kg',
                cost_per_m3: '₹50-150/m³',
                application: 'Industrial acidification',
                advantages: 'Cost-effective, fast acting',
            },
            {
                chemical: 'Hydrochloric Acid (HCl)',
                dosage: '0.5-1.5 mg/L',
                mechanism: 'pH reduction + chloride buffer',
                cost_per_kg: '₹8-18/kg',
                cost_per_m3: '₹60-180/m³',
                application: 'Water treatment plants',
                advantages: 'Precise control',
            },
        ],
    },
    low_ph: {
        title: 'Low pH (< 6.5)',
        treatments: [
            {
                chemical: 'Sodium Bicarbonate (NaHCO₃)',
                dosage: '50-200 mg/L',
                mechanism: 'HCO₃⁻ + H⁺ → H₂CO₃ → H₂O + CO₂',
                cost_per_kg: '₹20-40/kg',
                cost_per_m3: '₹500-800/m³',
                application: 'Household pH adjustment',
                advantages: 'Safe, food-grade',
            },
            {
                chemical: 'Sodium Hydroxide (NaOH)',
                dosage: '10-50 mg/L',
                mechanism: 'OH⁻ + H⁺ → H₂O',
                cost_per_kg: '₹12-25/kg',
                cost_per_m3: '₹300-500/m³',
                application: 'Industrial alkalinization',
                advantages: 'Strong base, effective',
            },
            {
                chemical: 'Calcium Hydroxide (Ca(OH)₂)',
                dosage: '20-100 mg/L',
                mechanism: 'Raises pH + reduces hardness',
                cost_per_kg: '₹8-15/kg',
                cost_per_m3: '₹200-400/m³',
                application: 'Water softening',
                advantages: 'Dual benefit, cost-effective',
            },
        ],
    },
    high_tds: {
        title: 'High TDS (> 500 mg/L)',
        treatments: [
            {
                chemical: 'Reverse Osmosis (RO)',
                dosage: 'N/A - Physical process',
                mechanism: 'Membrane filtration',
                cost_per_kg: 'Equipment: ₹15,000-50,000',
                cost_per_m3: '₹1-2/unit (power cost)',
                application: 'Household & industrial',
                advantages: 'Removes 95-99% TDS',
            },
            {
                chemical: 'Ion Exchange Resin',
                dosage: '100g per 20-30 L',
                mechanism: 'Ion exchange softening',
                cost_per_kg: '₹300-500/kg',
                cost_per_m3: '₹500-1000/m³',
                application: 'Water softening',
                advantages: 'Reusable, selective',
            },
            {
                chemical: 'Distillation',
                dosage: 'N/A - Thermal process',
                mechanism: 'Boiling & condensation',
                cost_per_kg: 'N/A',
                cost_per_m3: '₹5-10/m³ (fuel cost)',
                application: 'Laboratory/household',
                advantages: 'Removes all dissolved salts',
            },
        ],
    },
    high_hardness: {
        title: 'High Hardness (> 200 mg/L)',
        treatments: [
            {
                chemical: 'Sodium Carbonate (Na₂CO₃)',
                dosage: '50-150 mg/L',
                mechanism: 'CO₃²⁻ + Ca²⁺/Mg²⁺ → CaCO₃↓ + MgCO₃↓',
                cost_per_kg: '₹15-30/kg',
                cost_per_m3: '₹400-700/m³',
                application: 'Water softening',
                advantages: 'Effective, removes Ca²⁺ & Mg²⁺',
            },
            {
                chemical: 'Lime + Soda (CaCO₃ + Na₂CO₃)',
                dosage: '100-250 mg/L combined',
                mechanism: 'Precipitation softening',
                cost_per_kg: '₹10-20/kg (combined)',
                cost_per_m3: '₹300-600/m³',
                application: 'Large-scale treatment',
                advantages: 'Cost-effective for bulk',
            },
            {
                chemical: 'Polyphosphate (Sequestrant)',
                dosage: '1-2 mg/L',
                mechanism: 'Complexation of Ca²⁺ & Mg²⁺',
                cost_per_kg: '₹100-200/kg',
                cost_per_m3: '₹200-400/m³',
                application: 'Industrial boilers',
                advantages: 'No precipitate formation',
            },
        ],
    },
    high_nitrate: {
        title: 'High Nitrate (> 45 mg/L)',
        treatments: [
            {
                chemical: 'Anion Exchange Resin',
                dosage: '100g per 20 L',
                mechanism: 'NO₃⁻ exchange',
                cost_per_kg: '₹250-400/kg',
                cost_per_m3: '₹400-600/m³',
                application: 'Household RO units',
                advantages: 'Selective NO₃⁻ removal',
            },
            {
                chemical: 'Reverse Osmosis',
                dosage: 'N/A - Physical',
                mechanism: 'Membrane filtration',
                cost_per_kg: 'Equipment: ₹15,000-50,000',
                cost_per_m3: '₹1-2/unit',
                application: 'Household & community',
                advantages: 'Removes 95%+ NO₃⁻',
            },
            {
                chemical: 'Biological Denitrification',
                dosage: 'N/A - Biological',
                mechanism: 'Bacterial conversion: NO₃⁻ → N₂',
                cost_per_kg: 'System: ₹50,000+',
                cost_per_m3: '₹0.5-1/m³',
                application: 'Large-scale WTP',
                advantages: 'Complete removal, sustainable',
            },
        ],
    },
    high_fluoride: {
        title: 'High Fluoride (> 1.5 mg/L)',
        treatments: [
            {
                chemical: 'Activated Alumina',
                dosage: 'Filter bed',
                mechanism: 'Adsorption on Al₂O₃',
                cost_per_kg: '₹200-400/kg',
                cost_per_m3: '₹500-1000/m³',
                application: 'Household & community filters',
                advantages: 'Effective, reusable',
            },
            {
                chemical: 'Bone Char / Wood Charcoal',
                dosage: 'Filter bed',
                mechanism: 'Adsorption',
                cost_per_kg: '₹50-100/kg',
                cost_per_m3: '₹200-400/m³',
                application: 'Low-cost village filters',
                advantages: 'Very affordable',
            },
            {
                chemical: 'Reverse Osmosis',
                dosage: 'N/A - Physical',
                mechanism: 'Membrane filtration',
                cost_per_kg: 'Equipment: ₹15,000-50,000',
                cost_per_m3: '₹1-2/unit',
                application: 'Household RO units',
                advantages: 'Removes 85-95% fluoride',
            },
        ],
    },
};



export default function TreatmentPage() {
    const [tabValue, setTabValue] = useState(0);
    const [selectedTreatment, setSelectedTreatment] = useState<keyof typeof TREATMENT_DATA>('high_tds');
    const [volume, setVolume] = useState('1000'); // 1000 L

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const treatmentOptions = Object.entries(TREATMENT_DATA);
    const currentTreatment = TREATMENT_DATA[selectedTreatment];

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 700,
                        mb: 1,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    💊 Water Treatment Solutions
                </Typography>
                <Typography variant="subtitle1" sx={{ color: '#666' }}>
                    Treatment methods and costs for water quality issues
                </Typography>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3, borderRadius: '12px' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ p: 2 }}
                >
                    <Tab label=" Treatment Options" icon={<Science />} iconPosition="start" />
                    <Tab label=" Cost Calculator" icon={<AttachMoney />} iconPosition="start" />
                    {/* <Tab label="🏛️ Government Schemes" icon={<School />} iconPosition="start" /> */}
                </Tabs>
            </Paper>

            {/* Tab 1: Treatment Options */}
            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                    {/* Issue Selector */}
                    <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, borderRadius: '12px', position: 'sticky', top: 20 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                                Select Issue:
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {treatmentOptions.map(([key, value]) => (
                                    <Button
                                        key={key}
                                        variant={selectedTreatment === key ? 'contained' : 'outlined'}
                                        fullWidth
                                        onClick={() => setSelectedTreatment(key as keyof typeof TREATMENT_DATA)}
                                        sx={{
                                            justifyContent: 'flex-start',
                                            textTransform: 'capitalize',
                                        }}
                                    >
                                        {value.title}
                                    </Button>
                                ))}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Treatment Details */}
                    <Grid item xs={12} md={9}>
                        <MotionPaper
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            sx={{ p: 3, borderRadius: '12px' }}
                        >
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                                {currentTreatment.title}
                            </Typography>

                            <TableContainer sx={{ overflowX: 'auto' }}>
                                <Table>
                                    <TableHead sx={{ background: '#f5f5f5' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700 }}>Chemical</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Dosage</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Mechanism</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Cost/m³</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Application</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {currentTreatment.treatments.map((treatment, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell sx={{ fontWeight: 600, maxWidth: '150px' }}>
                                                    {treatment.chemical}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '12px' }}>{treatment.dosage}</TableCell>
                                                <TableCell sx={{ fontSize: '12px', maxWidth: '150px' }}>
                                                    {treatment.mechanism}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: '#d32f2f' }}>
                                                    {treatment.cost_per_m3}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '12px' }}>{treatment.application}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Details Cards */}
                            <Grid container spacing={2} sx={{ mt: 2 }}>
                                {currentTreatment.treatments.map((treatment, idx) => (
                                    <Grid item xs={12} sm={6} md={4} key={idx}>
                                        <Card sx={{ background: '#f9f9f9' }}>
                                            <CardContent>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                                    {treatment.chemical}
                                                </Typography>
                                                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                                                    <strong>Advantages:</strong> {treatment.advantages}
                                                </Typography>
                                                <Chip
                                                    label={treatment.cost_per_m3}
                                                    color="error"
                                                    size="small"
                                                    sx={{ mb: 1 }}
                                                />
                                                <Typography variant="caption" sx={{ display: 'block' }}>
                                                    Dosage: {treatment.dosage}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </MotionPaper>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* Tab 2: Cost Calculator */}
            <TabPanel value={tabValue} index={1}>
                <MotionPaper initial={{ opacity: 0 }} animate={{ opacity: 1 }} sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                        Treatment Cost Calculator
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                label="Water Volume"
                                type="number"
                                value={volume}
                                onChange={(e) => setVolume(e.target.value)}
                                fullWidth
                                variant="outlined"
                                helperText="in Liters"
                            />
                        </Grid>

                        {currentTreatment.treatments.slice(0, 3).map((treatment, idx) => {
                            const volumeM3 = parseFloat(volume) / 1000;
                            const costMatch = treatment.cost_per_m3.match(/₹([0-9]+)-([0-9]+)/);
                            const avgCost = costMatch
                                ? (parseInt(costMatch[1]) + parseInt(costMatch[2])) / 2
                                : 0;
                            const totalCost = volumeM3 * avgCost;

                            return (
                                <Grid item xs={12} md={4} key={idx}>
                                    <Card sx={{ background: '#e8f5e9', height: '100%' }}>
                                        <CardContent>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                                {treatment.chemical}
                                            </Typography>
                                            <Typography variant="caption" sx={{ display: 'block', mb: 2 }}>
                                                For {volume} L ({volumeM3.toFixed(3)} m³)
                                            </Typography>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 700, color: '#2e7d32', mb: 1 }}
                                            >
                                                ₹{totalCost.toFixed(2)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#666' }}>
                                                Cost/m³: {treatment.cost_per_m3}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </MotionPaper>
            </TabPanel>

            {/* Tab 3: Government Schemes */}
        </Container>
    );
}
