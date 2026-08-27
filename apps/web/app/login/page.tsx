'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.login({ emailOrUsername, password });
      router.push('/forge');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-display text-2xl text-accent">Log in</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="emailOrUsername" className="text-xs text-muted">Email or username</label>
          <input id="emailOrUsername" type="text" required value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs text-muted">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <button type="submit" disabled={submitting}
          className="focus-ring w-full rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast disabled:opacity-60">
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        No account? <Link href="/register" className="text-accent focus-ring">Create one</Link>
      </p>
    </main>
  );
}
