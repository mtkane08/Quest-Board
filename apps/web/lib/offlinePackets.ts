'use client';

/**
 * Section 30: "Clearly show what is available offline, packet age, and
 * information that may have changed." Packets live in this browser's
 * localStorage only — per-device, not synced anywhere — which is the
 * correct scope for "downloaded for offline use on this phone." Every
 * read/write is wrapped defensively: localStorage can throw (private
 * browsing, disabled storage) and the app must degrade to "nothing saved"
 * rather than crash.
 */
const STORAGE_KEY = 'qb:offline-packets';

export interface StoredPacket {
  questId: string;
  title: string;
  generatedAt: string;
  packet: Record<string, unknown>;
}

function readAll(): Record<string, StoredPacket> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(packets: Record<string, StoredPacket>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packets));
  } catch {
    // Storage unavailable or full — the save silently fails; the caller's
    // UI should treat "did it actually save?" as re-checkable via listPackets.
  }
}

export function savePacket(questId: string, title: string, packet: Record<string, unknown>): void {
  const all = readAll();
  all[questId] = { questId, title, generatedAt: String(packet.generatedAt ?? new Date().toISOString()), packet };
  writeAll(all);
}

export function listPackets(): StoredPacket[] {
  return Object.values(readAll()).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export function getPacket(questId: string): StoredPacket | null {
  return readAll()[questId] ?? null;
}

export function removePacket(questId: string): void {
  const all = readAll();
  delete all[questId];
  writeAll(all);
}

export function packetAgeLabel(generatedAt: string): string {
  const ms = Date.now() - new Date(generatedAt).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
