'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { savePacket } from '@/lib/offlinePackets';

/**
 * No account required — offline packets are a device-local convenience,
 * not a durable reward (Section 6 only gates "durable rewards" behind an
 * account), and no auth is needed to read a published quest's packet.
 */
export function SaveOfflineButton({ questId, title }: { questId: string; title: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    try {
      const { packet } = await apiClient.getQuestPacket(questId);
      savePacket(questId, title, packet);
      setSaved(true);
    } catch {
      setError('Could not save this quest for offline use.');
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={handleSave}
        disabled={saved}
        className="focus-ring rounded border border-border px-4 py-2 text-sm text-text hover:border-accent disabled:opacity-60"
      >
        {saved ? 'Saved offline' : 'Save for offline'}
      </button>
      {error ? <span className="ml-2 text-sm text-danger">{error}</span> : null}
    </span>
  );
}
