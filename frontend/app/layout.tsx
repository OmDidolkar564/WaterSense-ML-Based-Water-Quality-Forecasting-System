import { Box } from '@mui/material';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import ThemeRegistry from '../theme/ThemeRegistry';
import Navigation from '../components/Navigation';

export const metadata = {
  title: 'GroundWater ML Platform',
  description: 'Advanced ML-powered water quality analysis',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeRegistry>
          <Navigation />
          <Box
            component="main"
            sx={{
              minHeight: 'calc(100vh - 64px)',
              // Background pattern
              backgroundImage: `
                radial-gradient(at 0% 0%, hsla(189,100%,96%,1) 0, transparent 50%), 
                radial-gradient(at 50% 0%, hsla(225,100%,96%,1) 0, transparent 50%), 
                radial-gradient(at 100% 0%, hsla(189,100%,96%,1) 0, transparent 50%)
              `,
              backgroundAttachment: 'fixed',
              paddingTop: '24px',
              paddingBottom: '24px',
            }}
          >
            {children}
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
