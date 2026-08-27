import type { AiGenerationProvider, QuestForgeInput, QuestForgeOutput } from './AiGenerationProvider.js';

/**
 * Runs whenever no AI provider is configured (Gate 2 default). Never
 * fabricates a quest — it returns `critical_unknown` confidence and echoes
 * the input back, so the manual quest editor is the only path forward
 * until a real provider is wired in (Section 14's "offline/static
 * fallbacks when AI is unavailable").
 */
export class StubAiProvider implements AiGenerationProvider {
  readonly isConfigured = false;

  async generateQuestDraft(input: QuestForgeInput): Promise<QuestForgeOutput> {
    return {
      title: input.ideaText.slice(0, 80),
      description: input.ideaText,
      objectives: [],
      confidence: 'critical_unknown',
    };
  }
}

export function createAiProvider(apiKey: string | undefined): AiGenerationProvider {
  if (!apiKey) return new StubAiProvider();
  throw new Error(
    'A real AiGenerationProvider implementation is not yet wired in (ADR-006) — ' +
      'set AI_PROVIDER_API_KEY only once a vendor is selected at Gate 2 hardening.',
  );
}
