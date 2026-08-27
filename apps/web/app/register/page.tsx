'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.register({ email, username, password });
      router.push('/forge');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-display text-2xl text-accent">Create an account</h1>
      <p className="mt-1 text-sm text-muted">
        Needed to publish quests and use the Forge (Section 6: guests can browse and try one
        private AI quest, but persistence and publishing require an account).
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs text-muted">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="username" className="text-xs text-muted">Username</label>
          <input id="username" type="text" required minLength={3} value={username} onChange={(e) => setUsername(e.target.value)}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs text-muted">Password (10+ characters)</label>
          <input id="password" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <button type="submit" disabled={submitting}
          className="focus-ring w-full rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast disabled:opacity-60">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  );
}
