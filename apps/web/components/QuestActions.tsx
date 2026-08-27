'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

/**
 * Section 46's "Start/preflight checklist" screen collapses into this one
 * button for Gate 5 — the preflight information itself (safety, cost,
 * accessibility, etc.) is already fully rendered above this on the quest
 * detail page (QB-031); this button is only the action, not a separate
 * confirmation screen, since nothing here is destructive or hard to undo
 * (an attempt can always be abandoned).
 */
export function QuestActions({ questId }: { questId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      const { attemptId } = await apiClient.startAttempt(questId);
      router.push(`/attempts/${attemptId}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.status === 401
            ? 'Log in to start this quest.'
            : err.message
          : 'Could not start this quest.',
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleSave() {
    setError(null);
    try {
      await apiClient.saveQuest(questId);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save this quest.');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleStart}
        disabled={starting}
        className="focus-ring rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast disabled:opacity-60"
      >
        {starting ? 'Starting…' : 'Start quest'}
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={saved}
        className="focus-ring rounded border border-border px-4 py-2 text-sm text-text hover:border-accent disabled:opacity-60"
      >
        {saved ? 'Saved' : 'Save for later'}
      </button>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
