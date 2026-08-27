import { describe, expect, it } from 'vitest';
import { createPlacesProvider } from '../src/providers/places/StubPlacesProvider.js';
import { createAiProvider } from '../src/providers/ai/StubAiProvider.js';

describe('provider adapters degrade gracefully when unconfigured (ADR-005, ADR-006)', () => {
  it('places provider reports not configured and returns no results rather than throwing', async () => {
    const provider = createPlacesProvider(undefined);
    expect(provider.isConfigured).toBe(false);
    await expect(provider.nearbySearch({ lat: 42.35, lng: -71.05, radiusMeters: 1000 })).resolves.toEqual(
      [],
    );
    await expect(provider.getPlaceDetails('anything')).resolves.toBeNull();
  });

  it('ai provider reports not configured and never fabricates a confident answer', async () => {
    const provider = createAiProvider(undefined);
    expect(provider.isConfigured).toBe(false);
    const result = await provider.generateQuestDraft({ ideaText: 'walk the arboretum' });
    expect(result.confidence).toBe('critical_unknown');
    expect(result.title).toContain('walk the arboretum');
  });
});
