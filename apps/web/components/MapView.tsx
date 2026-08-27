'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/loadGoogleMaps';

export interface MapPin {
  questId: string;
  title: string;
  overallTier: string;
  lat: number;
  lng: number;
}

const BOSTON_FALLBACK_CENTER = { lat: 42.3601, lng: -71.0589 };

/**
 * Renders pins alongside — never instead of — the accessible list (Section
 * 8/45 requires every map result to also be a list result, not the other
 * way around); the caller is responsible for keeping both views built from
 * the same filtered `/discovery` response.
 */
export function MapView({ pins, apiKey }: { pins: MapPin[]; apiKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: google.maps.Map | null = null;
    // Classic Marker, not AdvancedMarkerElement — the latter requires a
    // separately-provisioned Google Cloud "Map ID" beyond just an API key,
    // which would turn "paste your key" into a two-step setup for no
    // visible benefit here (no custom map styling in play).
    const markers: google.maps.Marker[] = [];

    loadGoogleMaps(apiKey)
      .then((google) => {
        if (cancelled || !containerRef.current) return;

        const bounds = new google.maps.LatLngBounds();
        for (const pin of pins) bounds.extend({ lat: pin.lat, lng: pin.lng });

        map = new google.maps.Map(containerRef.current, {
          center: pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : BOSTON_FALLBACK_CENTER,
          zoom: pins.length > 0 ? 12 : 10,
        });

        if (pins.length > 1) map.fitBounds(bounds);

        const infoWindow = new google.maps.InfoWindow();
        for (const pin of pins) {
          const marker = new google.maps.Marker({
            map,
            position: { lat: pin.lat, lng: pin.lng },
            title: pin.title,
          });
          marker.addListener('click', () => {
            infoWindow.setContent(
              `<div style="font-family: system-ui, sans-serif;"><strong>${escapeHtml(pin.title)}</strong><br/><a href="/quests/${pin.questId}">View quest</a></div>`,
            );
            infoWindow.open({ map, anchor: marker });
          });
          markers.push(marker);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      for (const marker of markers) marker.setMap(null);
    };
  }, [apiKey, pins]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Map could not load: {error}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-96 w-full rounded-lg border border-border"
      role="application"
      aria-label="Map of quest locations"
    />
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
