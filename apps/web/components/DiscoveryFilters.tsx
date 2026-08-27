'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

/**
 * Section 42: "if location is denied, support manual city/ZIP/area
 * search." This is a plain, keyboard-operable form — no map interaction
 * required to use any filter here, which is also how Section 8/45's
 * "every map result is available through an accessible list" gets
 * satisfied on the client side, not just the API side.
 */
export function DiscoveryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [place, setPlace] = useState(searchParams.get('place') ?? '');
  const [guild, setGuild] = useState(searchParams.get('guild') ?? '');
  const [tier, setTier] = useState(searchParams.get('tier') ?? '');
  const [maxDuration, setMaxDuration] = useState(searchParams.get('maxDurationMinutes') ?? '');
  const [wheelchair, setWheelchair] = useState(searchParams.get('wheelchairAccessible') === 'true');
  const [locationError, setLocationError] = useState<string | null>(null);

  function buildParams(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    const values: Record<string, string> = {
      place,
      guild,
      tier,
      maxDurationMinutes: maxDuration,
      wheelchairAccessible: wheelchair ? 'true' : '',
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, v ?? ''])),
    };
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // A fresh place/geolocation search replaces any previously resolved lat/lng.
    if (overrides.place !== undefined || overrides.lat !== undefined) {
      if (!overrides.lat) params.delete('lat');
      if (!overrides.lat) params.delete('lng');
    }
    return params;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/discover?${buildParams({ place }).toString()}`);
  }

  function handleUseLocation() {
    setLocationError(null);
    if (!('geolocation' in navigator)) {
      setLocationError('Location is not available in this browser — use the search box instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = buildParams({
          place: '',
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
        });
        router.push(`/discover?${params.toString()}`);
      },
      () => {
        setLocationError('Location permission denied — search by city or ZIP below instead.');
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface p-5" aria-label="Discovery filters">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="place" className="text-xs text-muted">
            City, ZIP, or area
          </label>
          <input
            id="place"
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Boston, MA"
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text"
          />
        </div>
        <button
          type="button"
          onClick={handleUseLocation}
          className="focus-ring rounded border border-border px-3 py-1.5 text-sm text-text hover:border-accent"
        >
          Use my location
        </button>

        <div className="flex flex-col gap-1">
          <label htmlFor="tier" className="text-xs text-muted">
            Tier
          </label>
          <select
            id="tier"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text"
          >
            <option value="">Any</option>
            <option value="novice">Novice</option>
            <option value="adventurer">Adventurer</option>
            <option value="heroic">Heroic</option>
            <option value="legendary">Legendary</option>
            <option value="mythic">Mythic</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="maxDuration" className="text-xs text-muted">
            Max time (minutes)
          </label>
          <input
            id="maxDuration"
            type="number"
            min={0}
            value={maxDuration}
            onChange={(e) => setMaxDuration(e.target.value)}
            className="focus-ring w-28 rounded border border-border bg-bg px-3 py-1.5 text-sm text-text"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={wheelchair}
            onChange={(e) => setWheelchair(e.target.checked)}
            className="focus-ring"
          />
          Wheelchair accessible only
        </label>

        <button
          type="submit"
          className="focus-ring rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast"
        >
          Apply filters
        </button>
      </div>
      {locationError ? (
        <p role="alert" className="mt-3 text-sm text-warning">
          {locationError}
        </p>
      ) : null}
    </form>
  );
}
