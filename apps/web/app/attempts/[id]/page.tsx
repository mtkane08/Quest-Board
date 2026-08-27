'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

/**
 * Section 46's "Active quest/navigation/checkpoints" and "Pause/abandon/
 * complete and evidence" screens, combined into one page for Gate 5 — no
 * map/checkpoint navigation UI yet (that needs the multi-stop route work
 * deferred since Gate 3), just objective tracking and the state actions.
 *
 * Uses `useParams()` rather than a `params` prop: since Next 15, the page
 * prop is a Promise (meant for async Server Components), which a
 * synchronous Client Component page can't `await`. `useParams()` gives the
 * resolved segment directly.
 */
export default function AttemptPage() {
  const params = useParams<{ id: string }>();
  const attemptId = params.id;
  const [attempt, setAttempt] = useState<{ state: string } | null>(null);
  const [objectives, setObjectives] = useState<Array<{ id: string; text: string; completedAt: string | null }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ state: string; xpAwarded: number; newBadges: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState({ enjoyment: 5, accuracy: 5, tierAccuracy: 5, wouldRecommend: 5 });
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  async function load() {
    try {
      const res = await apiClient.getAttempt(attemptId);
      setAttempt(res.attempt);
      setObjectives(res.objectives);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load this attempt.');
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount: `load` sets state after an awaited
    // request, not synchronously in the effect body. `attemptId` comes
    // from the URL and doesn't change without a full navigation/remount,
    // so there's no rapid-refire race for this rule's cancellation
    // concern to apply to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  async function markObjective(objectiveId: string) {
    setBusy(true);
    setError(null);
    try {
      await apiClient.addEvidence(attemptId, objectiveId, 'honor_system');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not record evidence.');
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: 'pause' | 'resume' | 'abandon' | 'complete') {
    setBusy(true);
    setError(null);
    try {
      if (action === 'complete') {
        const res = await apiClient.completeAttempt(attemptId);
        setResult(res);
      } else if (action === 'pause') await apiClient.pauseAttempt(attemptId);
      else if (action === 'resume') await apiClient.resumeAttempt(attemptId);
      else await apiClient.abandonAttempt(attemptId);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : `Could not ${action} this attempt.`);
    } finally {
      setBusy(false);
    }
  }

  async function submitRating() {
    setBusy(true);
    setError(null);
    try {
      await apiClient.submitRating(attemptId, { ...rating, reviewText: null });
      setRatingSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not submit your rating.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !attempt) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p role="alert" className="text-danger">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-accent">Active Quest</h1>
      <p className="mt-1 text-sm text-muted">
        Status: <strong>{attempt?.state ?? 'loading…'}</strong>
      </p>

      <ul className="mt-6 space-y-2">
        {objectives.map((o) => (
          <li key={o.id} className="flex items-center gap-3 rounded border border-border bg-surface p-3">
            <input
              type="checkbox"
              checked={o.completedAt !== null}
              disabled={busy || o.completedAt !== null || attempt?.state !== 'active'}
              onChange={() => markObjective(o.id)}
              className="focus-ring"
            />
            <span className={o.completedAt ? 'text-muted line-through' : 'text-text'}>{o.text}</span>
          </li>
        ))}
      </ul>

      {attempt?.state === 'active' || attempt?.state === 'paused' ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {attempt.state === 'active' ? (
            <button type="button" disabled={busy} onClick={() => runAction('pause')}
              className="focus-ring rounded border border-border px-4 py-1.5 text-sm text-text hover:border-accent">
              Pause
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => runAction('resume')}
              className="focus-ring rounded border border-border px-4 py-1.5 text-sm text-text hover:border-accent">
              Resume
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => runAction('abandon')}
            className="focus-ring rounded border border-border px-4 py-1.5 text-sm text-text hover:border-danger hover:text-danger">
            Abandon
          </button>
          {attempt.state === 'active' ? (
            <button type="button" disabled={busy} onClick={() => runAction('complete')}
              className="focus-ring rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast">
              Complete
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}

      {result ? (
        <section className="mt-6 rounded-lg border border-accent bg-surface p-5">
          <h2 className="font-display text-lg">
            {result.state === 'completed' ? 'Quest complete!' : 'Quest partially complete'}
          </h2>
          <p className="mt-1 text-sm text-text">+{result.xpAwarded} XP</p>
          {result.newBadges.length > 0 ? (
            <p className="mt-1 text-sm text-accent">New badge: {result.newBadges.join(', ')}</p>
          ) : null}
          <Link href="/profile" className="focus-ring mt-3 inline-block text-sm text-accent">
            View your progress
          </Link>

          {ratingSubmitted ? (
            <p className="mt-4 text-sm text-muted">Thanks for rating this quest!</p>
          ) : (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Rate this quest (Section 23)</h3>
              {(['enjoyment', 'accuracy', 'tierAccuracy', 'wouldRecommend'] as const).map((key) => (
                <div key={key} className="mt-2 flex items-center justify-between gap-2">
                  <label htmlFor={key} className="text-sm capitalize text-text">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <input
                    id={key}
                    type="number"
                    min={1}
                    max={5}
                    value={rating[key]}
                    onChange={(e) => setRating({ ...rating, [key]: Number(e.target.value) })}
                    className="focus-ring w-16 rounded border border-border bg-bg px-2 py-1 text-sm text-text"
                  />
                </div>
              ))}
              <button type="button" disabled={busy} onClick={submitRating}
                className="focus-ring mt-3 rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast">
                Submit rating
              </button>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
