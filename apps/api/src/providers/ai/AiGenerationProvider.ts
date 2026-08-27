/**
 * ADR-006 / docs/gate-1/07-ai-service-schemas.md: one vendor-agnostic
 * interface for every AI-backed service (Quest Forge, conversational
 * guide, feasibility evaluator, etc.). No concrete model vendor is wired
 * in at Gate 2 — see docs/gate-0/06-decision-log.md DL-008 (cost budgets)
 * and docs/gate-0/04-provider-licensing-questions.md Q11-12, both still
 * open. `StubAiProvider` is what actually runs until those are resolved
 * and a real implementation is added.
 */
export interface QuestForgeInput {
  ideaText: string;
  constraints?: Record<string, unknown>;
}

export interface QuestForgeOutput {
  title: string;
  description: string;
  objectives: string[];
  confidence: 'high' | 'medium' | 'low' | 'critical_unknown';
}

export interface AiGenerationProvider {
  readonly isConfigured: boolean;
  generateQuestDraft(input: QuestForgeInput): Promise<QuestForgeOutput>;
}
