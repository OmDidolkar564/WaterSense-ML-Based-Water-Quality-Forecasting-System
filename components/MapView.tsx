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
        preferCanvas: true, // CRITICAL: Use Canvas renderer for 10k+ points
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
          Math.min(item.avg_wqi / 150, 1.0)
        ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((L as any).heatLayer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        heatLayer.current = (L as any).heatLayer(heatPoints, {
          radius: 20,
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
      // --- MARKER MODE (OPTIMIZED) ---
      data.forEach((item) => {
        // Validate coordinates
        if (!item.latitude || !item.longitude || typeof item.latitude !== 'number') return;
        if (!isWithinIndia(item.latitude, item.longitude)) return;

        const color = getColorByWQI(item.avg_wqi);
        const category = getWQICategory(item.avg_wqi);

        // Use CircleMarker for performance (renders on Canvas)
        const marker = L.circleMarker([item.latitude, item.longitude], {
          radius: 6,
          fillColor: color,
          color: '#fff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });

        marker.bindPopup(
          `
            <div style="font-family: 'Arial', sans-serif; font-size: 13px; min-width: 200px; padding: 5px;">
              <div style="font-size: 15px; font-weight: bold; color: #333; margin-bottom: 5px; border-bottom: 2px solid ${color};">
                ${item.district}
              </div>
              <div><strong style="color: #666;">State:</strong> ${item.state}</div>
              <div><strong style="color: #666;">WQI:</strong> <b style="color:${color}">${item.avg_wqi.toFixed(1)}</b></div>
              <div><strong style="color: #666;">Quality:</strong> ${category}</div>
              <div style="margin-top:4px; font-size:10px; color:#999;">lat: ${item.latitude.toFixed(2)}, lng: ${item.longitude.toFixed(2)}</div>
            </div>
          `,
          {
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
      // Don't auto-fit on every update if it's annoying, but helpful for initial load
      // map.current?.fitBounds(markersGroup.current.getBounds(), { padding: [20, 20] });
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
