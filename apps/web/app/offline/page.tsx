'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listPackets, packetAgeLabel, removePacket, type StoredPacket } from '@/lib/offlinePackets';

/**
 * Section 30: shows exactly what's downloaded, how stale it is, and lets
 * the user remove it — no pretending a packet is fresher than it is.
 */
export default function OfflinePage() {
  const [packets, setPackets] = useState<StoredPacket[] | null>(null);
  const [selected, setSelected] = useState<StoredPacket | null>(null);

  useEffect(() => {
    // Must run in an effect, not a lazy useState initializer: `listPackets`
    // reads `localStorage`, which doesn't exist during server rendering —
    // this is exactly the "synchronize with an external system" case
    // React's own effect guidance describes as appropriate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPackets(listPackets());
  }, []);

  function handleRemove(questId: string) {
    removePacket(questId);
    setPackets(listPackets());
    if (selected?.questId === questId) setSelected(null);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-accent">Offline Quests</h1>
      <p className="mt-1 text-sm text-muted">
        Saved on this device only — from a quest&apos;s page, click &ldquo;Save for offline.&rdquo;
      </p>

      {packets && packets.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Nothing saved yet — <Link href="/discover" className="text-accent focus-ring">browse The Realm</Link>.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {packets?.map((p) => (
            <li key={p.questId} className="flex items-center justify-between rounded border border-border bg-surface p-3">
              <button type="button" onClick={() => setSelected(p)} className="focus-ring text-left text-text hover:text-accent">
                {p.title}
                <span className="ml-2 text-xs text-muted">saved {packetAgeLabel(p.generatedAt)}</span>
              </button>
              <button type="button" onClick={() => handleRemove(p.questId)} className="focus-ring text-sm text-danger hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <section className="mt-6 rounded-lg border border-accent bg-surface p-5">
          <h2 className="font-display text-lg">{selected.title}</h2>
          <p className="mt-1 text-xs text-muted">
            Generated {packetAgeLabel(selected.generatedAt)} — information may have changed since then.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-text">
            {(selected.packet.objectives as string[] | undefined)?.map((o) => <li key={o}>{o}</li>)}
          </ul>
          {selected.packet.safetyNotes ? (
            <p className="mt-3 text-sm text-warning">Safety: {String(selected.packet.safetyNotes)}</p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
