import { getGuilds, getHealth } from '@/lib/api';

function StatusDot({ state }: { state: 'ok' | 'degraded' | 'error' }) {
  const color =
    state === 'ok' ? 'bg-success' : state === 'degraded' ? 'bg-warning' : 'bg-danger';
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span>{state}</span>
    </span>
  );
}

export default async function HomePage() {
  const [health, guildsResult] = await Promise.all([getHealth(), getGuilds()]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl text-accent">Quest Board</h1>
      <p className="mt-2 text-muted">
        Gate 2 Foundation vertical slice — this page is a server component fetching from
        the API, proving the web → API → Postgres/Redis path works end to end.
      </p>

      <section className="mt-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl">API health</h2>
        {'error' in health ? (
          <p className="mt-2 text-danger">Could not reach the API: {health.message}</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(health.checks).map(([key, state]) => (
              <li key={key} className="flex items-center justify-between">
                <span>{key}</span>
                <StatusDot state={state} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl">Guilds (seeded taxonomy, spec Section 8)</h2>
        {'error' in guildsResult ? (
          <p className="mt-2 text-danger">Could not load guilds: {guildsResult.message}</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {guildsResult.guilds.map((guild) => (
              <li key={guild.stable_key}>
                <p className="font-semibold">{guild.display_name}</p>
                <p className="text-muted">{guild.plain_subtitle}</p>
                {guild.safety_metadata?.requires_age_gate ? (
                  <p className="mt-1 text-xs text-warning">Requires age gate</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
