'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat'; // Import heatmap plugin

interface MapData {
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  avg_wqi: number;
  avg_tds: number;
  risk_category: string;
  sample_count: number;
}

interface MapViewProps {
  data?: MapData[];
  showHeatmap?: boolean;
}

const INDIA_BOUNDS = {
  north: 37.5,
  south: 7.5,
  east: 98.0,
  west: 67.5,
};

export default function MapView({ data, showHeatmap }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.FeatureGroup | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heatLayer = useRef<any>(null);

  // Get color based on WQI value - FIXED to match backend
  const getColorByWQI = (wqi: number) => {
    if (wqi < 25) return '#4caf50';        // Dark Green - Excellent
    if (wqi < 50) return '#8bc34a';        // Light Green - Good
    if (wqi < 100) return '#ff9800';       // Orange - Poor
    if (wqi < 150) return '#ff5722';       // Deep Orange/Red - Very Poor
    return '#d32f2f';                      // Dark Red - Unsuitable
  };

  // Get WQI category label - FIXED to match backend
  const getWQICategory = (wqi: number) => {
    if (wqi < 25) return 'Excellent';
    if (wqi < 50) return 'Good';
    if (wqi < 100) return 'Poor';
    if (wqi < 150) return 'Very Poor';
    return 'Unsuitable';
  };

  // Check if point is within India bounds
  const isWithinIndia = (lat: number, lng: number) => {
    return (
      lat >= INDIA_BOUNDS.south &&
      lat <= INDIA_BOUNDS.north &&
      lng >= INDIA_BOUNDS.west &&
      lng <= INDIA_BOUNDS.east
    );
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    if (!map.current) {
      map.current = L.map(mapContainer.current, {
        maxBounds: [
          [5, 65],
          [40, 100],
        ],
        maxBoundsViscosity: 1.0,
      }).setView([20.5937, 78.9629], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);

      markersGroup.current = L.featureGroup().addTo(map.current);
    }

    // Clear existing layers
    if (markersGroup.current) {
      markersGroup.current.clearLayers();
    }
    if (heatLayer.current) {
      map.current?.removeLayer(heatLayer.current);
      heatLayer.current = null;
    }

    if (!data || data.length === 0) {
      return;
    }

    if (showHeatmap) {
      // --- HEATMAP MODE ---
      const heatPoints = data
        .filter(item =>
          item.latitude && item.longitude &&
          isWithinIndia(item.latitude, item.longitude)
        )
        .map(item => [
          item.latitude,
          item.longitude,
          // Intensity based on WQI. High WQI (bad) = High Intensity
          // Normalize WQI roughly 0-200 to 0-1 range for intensity
          Math.min(item.avg_wqi / 150, 1.0)
        ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((L as any).heatLayer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        heatLayer.current = (L as any).heatLayer(heatPoints, {
          radius: 25,
          blur: 15,
          maxZoom: 8,
          max: 1.0,
          gradient: {
            0.2: 'blue',
            0.4: 'cyan',
            0.6: 'lime',
            0.8: 'yellow',
            1.0: 'red'
          }
        }).addTo(map.current);
      } else {
        console.warn("Leaflet.heat plugin not loaded");
      }

    } else {
      // --- MARKER MODE ---
      data.forEach((item) => {
        // Validate coordinates
        if (!item.latitude || !item.longitude) {
          return;
        }

        if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') {
          return;
        }

        if (
          item.latitude < -90 ||
          item.latitude > 90 ||
          item.longitude < -180 ||
          item.longitude > 180
        ) {
          return;
        }

        // Check India bounds
        if (!isWithinIndia(item.latitude, item.longitude)) {
          return;
        }

        // Get color based on WQI
        const color = getColorByWQI(item.avg_wqi);
        const category = getWQICategory(item.avg_wqi);

        // Create marker with larger size for visibility
        const markerHtml = `
          <div style="
            background-color: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'"></div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          iconSize: [24, 24],
          className: 'custom-marker-wqi',
        });

        const marker = L.marker([item.latitude, item.longitude], { icon })
          .bindPopup(
            `
            <div style="font-family: 'Arial', sans-serif; font-size: 13px; min-width: 240px; padding: 8px;">
              <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 8px; border-bottom: 2px solid ${color}; padding-bottom: 4px;">
                ${item.district}
              </div>
              <div style="margin: 6px 0;">
                <strong style="color: #555;">State:</strong>
                <span style="color: #333;">${item.state}</span>
              </div>
              <div style="margin: 6px 0;">
                <strong style="color: #555;">WQI Score:</strong>
                <span style="font-weight: bold; color: ${color}; font-size: 15px;">${item.avg_wqi.toFixed(2)}</span>
              </div>
              <div style="margin: 6px 0;">
                <strong style="color: #555;">Quality:</strong>
                <span style="color: ${color}; font-weight: bold; font-size: 14px;">${category}</span>
              </div>
              <div style="margin: 6px 0;">
                <strong style="color: #555;">Risk:</strong>
                <span style="color: #333;">${item.risk_category}</span>
              </div>
              <div style="margin: 6px 0; font-size: 11px; color: #888;">
                📍 ${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}
              </div>
            </div>
          `,
            {
              maxWidth: 280,
              className: 'custom-popup',
            }
          );

        if (markersGroup.current) {
          marker.addTo(markersGroup.current);
        }
      });
    }

    // Fit bounds if layers exist
    if (markersGroup.current && markersGroup.current.getLayers().length > 0) {
      map.current?.fitBounds(markersGroup.current.getBounds(), { padding: [50, 50] });
    } else if (showHeatmap) {
      // Just set default view for heatmap
      map.current?.setView([20.5937, 78.9629], 5);
    }
  }, [data, showHeatmap]);

  return (
    <>
      <style jsx global>{`
        .custom-marker-wqi {
          background: none !important;
          border: none !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
      `}</style>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '600px',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      />
    </>
  );
}
