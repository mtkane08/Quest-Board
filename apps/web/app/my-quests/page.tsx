'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

/**
 * Section 46's "Submission/moderation status" screen, in minimal form —
 * lists the current status of every quest the logged-in user owns.
 */
export default function MyQuestsPage() {
  const [quests, setQuests] = useState<Array<{ quest_id: string; title: string; status: string; feasibility_confidence: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .myQuests()
      .then((res) => setQuests(res.quests))
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Could not load your quests — are you logged in?'));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-accent">My Quests</h1>
      {error ? (
        <p role="alert" className="mt-4 text-danger">
          {error} <Link href="/login" className="text-accent focus-ring">Log in</Link>
        </p>
      ) : quests && quests.length === 0 ? (
        <p className="mt-4 text-muted">
          Nothing yet — <Link href="/forge" className="text-accent focus-ring">start one in the Forge</Link>.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {quests?.map((q) => (
            <li key={q.quest_id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
              <span>{q.title}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
                {q.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
