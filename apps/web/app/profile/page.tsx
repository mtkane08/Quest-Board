'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiClientError, apiClient, API_BASE_URL_FOR_LINKS } from '@/lib/apiClient';

/**
 * Section 46's "Chronicle/profile/progression" screen — level/rank/XP,
 * streak, badges, and saved quests in one place for Gate 5. No ranks
 * leaderboard or category-mastery breakdown yet (Section 19's fuller
 * progression system) — this is the core XP/level/badge/streak loop only.
 */
export default function ProfilePage() {
  const [progression, setProgression] = useState<{
    totalXp: number; level: number; rank: string; nextLevelXp: number | null;
    currentStreakDays: number; badges: Array<{ badge_key: string; earned_at: string }>;
  } | null>(null);
  const [savedQuests, setSavedQuests] = useState<Array<{ quest_id: string; title: string; overall_tier: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ageSaved, setAgeSaved] = useState(false);
  const [eraseConfirming, setEraseConfirming] = useState(false);
  const [eraseError, setEraseError] = useState<string | null>(null);
  const [regionProgress, setRegionProgress] = useState<{ totalTilesDiscovered: number; regions: unknown[] } | null>(null);
  const [explorationError, setExplorationError] = useState<string | null>(null);
  const [exploring, setExploring] = useState(false);

  useEffect(() => {
    Promise.all([apiClient.getProgression(), apiClient.savedQuests(), apiClient.getRegionProgress()])
      .then(([p, s, r]) => {
        setProgression(p);
        setSavedQuests(s.quests);
        setRegionProgress(r);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Could not load your profile — are you logged in?'));
  }, []);

  // Section 20: opt-in, foreground-only — this is a single explicit
  // "reveal where I am right now" action, not continuous background
  // tracking (which this build never requests permission for).
  async function handleRevealArea() {
    setExplorationError(null);
    setExploring(true);
    try {
      if (!('geolocation' in navigator)) {
        setExplorationError('Location is not available in this browser.');
        return;
      }
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      const { sessionId } = await apiClient.startExplorationSession();
      await apiClient.pingExploration(sessionId, position.coords.latitude, position.coords.longitude, 'walk');
      await apiClient.stopExplorationSession(sessionId);
      setRegionProgress(await apiClient.getRegionProgress());
    } catch {
      setExplorationError('Could not reveal your area — location permission may have been denied.');
    } finally {
      setExploring(false);
    }
  }

  async function handleClearFogHistory() {
    try {
      await apiClient.deleteExplorationHistory();
      setRegionProgress(await apiClient.getRegionProgress());
    } catch {
      setExplorationError('Could not clear fog history.');
    }
  }

  async function handleAgeAttestation(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiClient.submitAgeAttestation(dateOfBirth);
      setAgeSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save your birth date.');
    }
  }

  async function handleErase() {
    if (!eraseConfirming) {
      setEraseConfirming(true);
      return;
    }
    try {
      await apiClient.eraseAccount();
      window.location.href = '/';
    } catch (err) {
      setEraseError(err instanceof ApiClientError ? err.message : 'Could not erase your account.');
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p role="alert" className="text-danger">
          {error} <Link href="/login" className="text-accent focus-ring">Log in</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-accent">Chronicle</h1>

      {progression ? (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <p className="text-lg">
            Level {progression.level} — <span className="text-accent">{progression.rank}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {progression.totalXp} XP
            {progression.nextLevelXp !== null ? ` · ${progression.nextLevelXp - progression.totalXp} XP to next level` : ' · Max level'}
          </p>
          <p className="mt-1 text-sm text-muted">Current streak: {progression.currentStreakDays} day(s)</p>
          {progression.badges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {progression.badges.map((b) => (
                <span key={b.badge_key} className="rounded-full border border-accent px-3 py-1 text-xs text-accent">
                  {b.badge_key.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No badges yet — complete a quest to earn your first one.</p>
          )}
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="font-display text-lg">Saved quests</h2>
        {savedQuests && savedQuests.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing saved yet — <Link href="/discover" className="text-accent focus-ring">browse The Realm</Link>.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {savedQuests?.map((q) => (
              <li key={q.quest_id} className="flex items-center justify-between rounded border border-border bg-surface p-3">
                <Link href={`/quests/${q.quest_id}`} className="focus-ring text-text hover:text-accent">
                  {q.title}
                </Link>
                <span className="text-xs uppercase text-muted">{q.overall_tier}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-lg">Exploration (Section 20, opt-in)</h2>
        <p className="mt-1 text-sm text-muted">
          {regionProgress ? `${regionProgress.totalTilesDiscovered} area(s) discovered` : 'Loading…'}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={handleRevealArea} disabled={exploring}
            className="focus-ring rounded border border-border px-4 py-1.5 text-sm text-text hover:border-accent disabled:opacity-60">
            {exploring ? 'Revealing…' : 'Reveal my current area'}
          </button>
          <button type="button" onClick={handleClearFogHistory}
            className="focus-ring text-sm text-muted hover:text-danger hover:underline">
            Clear fog history
          </button>
        </div>
        {explorationError ? <p role="alert" className="mt-2 text-sm text-danger">{explorationError}</p> : null}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-lg">Privacy &amp; account (Section 26, QB-183)</h2>

        <form onSubmit={handleAgeAttestation} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="dob" className="text-xs text-muted">
              Birth date (for age-restricted content — never shown publicly)
            </label>
            <input id="dob" type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
              className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
          </div>
          <button type="submit" className="focus-ring rounded border border-border px-4 py-1.5 text-sm text-text hover:border-accent">
            Save
          </button>
          {ageSaved ? <span className="text-sm text-success">Saved.</span> : null}
        </form>

        <a
          href={`${API_BASE_URL_FOR_LINKS}/api/v1/me/export`}
          target="_blank"
          rel="noreferrer"
          className="focus-ring mt-4 inline-block text-sm text-accent"
        >
          Export my data
        </a>

        <div className="mt-4 border-t border-border pt-4">
          <button type="button" onClick={handleErase} className="focus-ring text-sm text-danger hover:underline">
            {eraseConfirming ? 'Click again to permanently erase your account' : 'Erase my account'}
          </button>
          {eraseError ? <p role="alert" className="mt-2 text-sm text-danger">{eraseError}</p> : null}
        </div>
      </section>
    </main>
  );
}
