import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import { NotificationsActive } from '@mui/icons-material';

interface SubscriptionModalProps {
    open: boolean;
    onClose: () => void;
    locationName: string;
    subscriptionType?: 'district' | 'state';
}

export default function SubscriptionModal({
    open,
    onClose,
    locationName,
    subscriptionType = 'district'
}: SubscriptionModalProps) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async () => {
        if (!email || !email.includes('@')) {
            setMessage('Please enter a valid email address');
            setStatus('error');
            return;
        }

        setStatus('loading');
        try {
            const res = await fetch('http://localhost:8000/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    location: locationName,
                    type: subscriptionType
                }),
            });

            if (res.ok) {
                setStatus('success');
                setMessage(`Subscribed to alerts for ${locationName}`);
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                    setEmail('');
                }, 2000);
            } else {
                const data = await res.json();
                setStatus('error');
                setMessage(data.detail || 'Failed to subscribe');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsActive color="primary" />
                Subscribe to Alerts
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Get notified when water quality in <strong>{locationName}</strong> reaches critical levels.
                </Typography>

                {status === 'success' ? (
                    <Alert severity="success">{message}</Alert>
                ) : (
                    <>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Email Address"
                            type="email"
                            fullWidth
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={status === 'error'}
                            helperText={status === 'error' ? message : ''}
                        />
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                {status !== 'success' && (
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? <CircularProgress size={24} /> : 'Subscribe'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
