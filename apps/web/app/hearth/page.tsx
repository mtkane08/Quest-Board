'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

/**
 * Section 16: Hearth is a first-class mode, not a weather filter. This
 * page ties together the typed inventory (new in Gate 5) with the
 * existing discovery list filtered to at-home/indoor quests — Gate 3's
 * `/discover?guild=hearth_and_home` already does the quest-listing half of
 * this, so Gate 5's actual new work here is just the inventory.
 */
export default function HearthPage() {
  const [items, setItems] = useState<Array<{ id: string; name: string; category: string | null; quantity: string | null }> | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiClient.getInventory();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load your inventory — are you logged in?');
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount — see the same note in app/attempts/[id]/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.addInventoryItem({ name, category: category || null, quantity: quantity || null });
      setName('');
      setCategory('');
      setQuantity('');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not add that item.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.deleteInventoryItem(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not remove that item.');
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-accent">The Hearth</h1>
      <p className="mt-1 text-sm text-muted">
        Rainy-day and at-home quests, plus what you have on hand. Private by default — see{' '}
        <Link href="/discover?guild=hearth_and_home" className="text-accent focus-ring">
          Hearth &amp; Home quests
        </Link>{' '}
        for the quest side of this mode.
      </p>

      {error ? <p role="alert" className="mt-4 text-danger">{error}</p> : null}

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs text-muted">Item</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-xs text-muted">Category</label>
          <input id="category" value={category} onChange={(e) => setCategory(e.target.value)}
            placeholder="pantry, craft, game…"
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="quantity" className="text-xs text-muted">Quantity</label>
          <input id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="focus-ring w-24 rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>
        <button type="submit" className="focus-ring rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast">
          Add
        </button>
      </form>

      <ul className="mt-6 space-y-2">
        {items?.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded border border-border bg-surface p-3">
            <span>
              {item.name}
              {item.quantity ? ` — ${item.quantity}` : ''}
              {item.category ? <span className="ml-2 text-xs text-muted">({item.category})</span> : null}
            </span>
            <button type="button" onClick={() => handleDelete(item.id)}
              className="focus-ring text-sm text-danger hover:underline">
              Remove
            </button>
          </li>
        ))}
        {items && items.length === 0 ? <p className="text-sm text-muted">Nothing in your inventory yet.</p> : null}
      </ul>
    </main>
  );
}
