import { Suspense } from 'react';
import { DiscoveryFilters } from '@/components/DiscoveryFilters';
import { QuestCard } from '@/components/QuestCard';
import { getDiscoveryList, isApiError } from '@/lib/api';

interface SearchParams {
  lat?: string;
  lng?: string;
  place?: string;
  guild?: string;
  tier?: string;
  maxDurationMinutes?: string;
  wheelchairAccessible?: string;
}

async function resolveLocation(
  searchParams: SearchParams,
): Promise<{ lat?: number; lng?: number; degradedMessage?: string }> {
  if (searchParams.lat && searchParams.lng) {
    return { lat: Number(searchParams.lat), lng: Number(searchParams.lng) };
  }
  if (!searchParams.place) return {};

  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001';
  try {
    const res = await fetch(`${apiBase}/api/v1/discovery/geocode?query=${encodeURIComponent(searchParams.place)}`, {
      cache: 'no-store',
    });
    const body = (await res.json()) as { result: { lat: number; lng: number } | null; degraded: boolean; message?: string };
    if (body.degraded) {
      return { degradedMessage: body.message ?? 'Location search is unavailable right now.' };
    }
    if (!body.result) {
      return { degradedMessage: `No location found for "${searchParams.place}".` };
    }
    return { lat: body.result.lat, lng: body.result.lng };
  } catch {
    return { degradedMessage: 'Could not reach the location search service.' };
  }
}

// This page's job is the "accessible list parity" requirement itself
// (Section 8/45): it is the list view, and it is what any future map view
// must match filter-for-filter — see docs/gate-1/10-wireflows-and-screens.md.
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const location = await resolveLocation(resolvedSearchParams);

  const result = await getDiscoveryList({
    lat: location.lat,
    lng: location.lng,
    guild: resolvedSearchParams.guild || undefined,
    tier: resolvedSearchParams.tier || undefined,
    maxDurationMinutes: resolvedSearchParams.maxDurationMinutes ? Number(resolvedSearchParams.maxDurationMinutes) : undefined,
    // Must be undefined (not `false`) when unchecked, or toQueryString sends
    // a literal "false" string the API would otherwise need to parse correctly.
    wheelchairAccessible: resolvedSearchParams.wheelchairAccessible === 'true' || undefined,
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-accent">The Realm</h1>
      <p className="mt-1 text-sm text-muted">
        Map view isn&apos;t wired up yet — no Google Maps browser key is configured in this
        environment, so this is the accessible list, which is functionally complete on its own
        (Section 8: every map result must also be available as a list).
      </p>

      <div className="mt-6">
        <Suspense fallback={<div className="h-24 rounded-lg border border-border bg-surface" aria-hidden />}>
          <DiscoveryFilters />
        </Suspense>
      </div>

      {location.degradedMessage ? (
        <p role="status" className="mt-6 rounded border border-warning px-4 py-2 text-sm text-warning">
          {location.degradedMessage} Showing results without a location filter.
        </p>
      ) : null}

      <section className="mt-6">
        {isApiError(result) ? (
          <p role="alert" className="text-danger">
            Could not load quests: {result.message}
          </p>
        ) : result.results.length === 0 ? (
          <p className="text-muted">No quests match those filters yet. Try widening your search.</p>
        ) : (
          <ul className="space-y-4">
            {result.results.map((quest) => (
              <QuestCard key={quest.questId} quest={quest} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
