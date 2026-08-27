'use client';

import { useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

const CATEGORIES = [
  'closure', 'inaccessibility', 'unsafe_conditions', 'bad_directions', 'trespass_risk',
  'injury_emergency', 'harassment', 'fraudulent_rewards', 'inappropriate_child_content',
  'incorrect_restrictions',
] as const;

/**
 * Section 25: reporting paths, available without an account (the API
 * route has no auth requirement — see modules/reports/routes.ts).
 */
export function ReportButton({ questVersionId }: { questVersionId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('unsafe_conditions');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState<{ suppressionApplied: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await apiClient.submitReport({ targetId: questVersionId, category, severity, note: note || null });
      setSubmitted(result);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not submit this report.');
    }
  }

  if (submitted) {
    return (
      <p className="mt-6 text-sm text-muted" role="status">
        Thanks — this report has been recorded.{' '}
        {submitted.suppressionApplied ? 'The quest has been temporarily hidden pending review.' : ''}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="focus-ring mt-6 text-sm text-muted underline hover:text-danger">
        Report a problem with this quest
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="font-display text-lg">Report a problem</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-xs text-muted">What&apos;s wrong</label>
        <select id="category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}
          className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="severity" className="text-xs text-muted">Severity</label>
        <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}
          className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High — this seems unsafe or urgent</option>
          <option value="critical">Critical — emergency</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-xs text-muted">Details (optional)</label>
        <textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          className="focus-ring rounded border border-border bg-bg px-3 py-2 text-sm text-text" />
      </div>
      {severity === 'critical' ? (
        <p className="text-xs text-warning">
          This app is not an emergency service. If this is a life-threatening emergency, contact local emergency
          services directly.
        </p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <div className="flex gap-3">
        <button type="submit" className="focus-ring rounded bg-danger px-4 py-1.5 text-sm font-semibold text-white">
          Submit report
        </button>
        <button type="button" onClick={() => setOpen(false)} className="focus-ring text-sm text-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}
