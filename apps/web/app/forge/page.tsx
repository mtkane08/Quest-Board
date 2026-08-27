'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/apiClient';

const FACTOR_LABELS: Record<string, string> = {
  time_commitment: 'Time commitment',
  physical_effort: 'Physical effort',
  mental_challenge: 'Mental challenge',
  travel_complexity: 'Travel complexity',
  cost_burden: 'Cost burden',
  preparation: 'Preparation / equipment',
  required_skill: 'Required skill',
  objective_complexity: 'Objective complexity',
  group_coordination: 'Group coordination',
};

const DEFAULT_FACTOR_SCORES = Object.fromEntries(Object.keys(FACTOR_LABELS).map((k) => [k, 3]));

const ACCESSIBILITY_KEYS = ['wheelchair', 'low_walking', 'sensory_friendly', 'service_animal', 'restroom_access'];

interface FormState {
  title: string;
  plainSummary: string;
  guildKey: string;
  objectives: string;
  completionMethods: string[];
  riskRating: 'low' | 'moderate' | 'high' | 'severe';
  safetyNotes: string;
  durationMinMinutes: string;
  costMinCents: string;
  ageAdultContent: boolean;
  accessibility: Record<string, string>;
  factorScores: Record<string, number>;
}

const INITIAL_FORM: FormState = {
  title: '',
  plainSummary: '',
  guildKey: '',
  objectives: '',
  completionMethods: ['honor_system'],
  riskRating: 'low',
  safetyNotes: '',
  durationMinMinutes: '',
  costMinCents: '',
  ageAdultContent: false,
  accessibility: Object.fromEntries(ACCESSIBILITY_KEYS.map((k) => [k, 'unknown'])),
  factorScores: DEFAULT_FACTOR_SCORES,
};

/**
 * Section 14.1 (Quest Forge): plain idea → AI draft (editable) → structured
 * quest → feasibility gate → moderation/publish. This is a single-page,
 * function-first implementation of that flow (Gate 4) — the polish items
 * from the full spec (lock fields, compare variants, tone rewrite) are
 * explicitly deferred; see docs/gate-4/00-forge-report.md.
 */
export default function ForgePage() {
  const [guilds, setGuilds] = useState<Array<{ stable_key: string; display_name: string }>>([]);
  const [ideaText, setIdeaText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [questId, setQuestId] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [submitResult, setSubmitResult] = useState<{
    status: string;
    confidence: string;
    blockers: string[];
    warnings: string[];
    moderationCaseId: string | null;
  } | null>(null);
  const [published, setPublished] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getGuilds().then((res) => setGuilds(res.guilds)).catch(() => setGuilds([]));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setGenerationError(null);
    try {
      const { jobId } = await apiClient.generateQuestDraft(ideaText);
      // Simple poll loop — the stub provider resolves synchronously, but a
      // real provider (Section 38) may take longer, hence job-ID polling.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const { job } = await apiClient.getGenerationJob(jobId);
        if (job.status === 'succeeded' && job.output) {
          setForm((f) => ({
            ...f,
            title: job.output!.title,
            plainSummary: job.output!.description.slice(0, 300),
            objectives: job.output!.objectives.join('\n'),
          }));
          setAiConfidence(job.output.confidence);
          break;
        }
        if (job.status === 'failed') {
          setGenerationError(job.errorMessage ?? 'Generation failed — fill in the quest manually below.');
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      setGenerationError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not reach the generation service — fill in the quest manually below.',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSubmitResult(null);
    setPublished(false);
    try {
      const input = {
        title: form.title,
        plainSummary: form.plainSummary,
        guildKey: form.guildKey || null,
        factorScores: form.factorScores,
        riskRating: form.riskRating,
        safetyNotes: form.safetyNotes || null,
        accessibilityProfile: form.accessibility,
        ageRestrictions: { min_age: form.ageAdultContent ? 21 : null, adult_content: form.ageAdultContent, alcohol: false, gambling: false },
        objectives: form.objectives.split('\n').map((s) => s.trim()).filter(Boolean),
        completionMethods: form.completionMethods,
        durationMinMinutes: form.durationMinMinutes ? Number(form.durationMinMinutes) : null,
        costMinCents: form.costMinCents ? Number(form.costMinCents) : null,
        aiAssisted: aiConfidence !== null,
      };
      const result = await apiClient.createQuestDraft(input);
      setQuestId(result.questId);
      setTier(result.tier);
    } catch (err) {
      setSaveError(err instanceof ApiClientError ? err.message : 'Could not save this draft.');
    }
  }

  async function handleSubmitForReview() {
    if (!questId) return;
    setActionError(null);
    try {
      const result = await apiClient.submitQuest(questId);
      setSubmitResult({
        status: result.status,
        confidence: result.feasibility.overallConfidence,
        blockers: result.feasibility.blockers,
        warnings: result.feasibility.warnings,
        moderationCaseId: result.moderationCaseId,
      });
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Could not submit this quest.');
    }
  }

  async function handlePublish() {
    if (!questId) return;
    setActionError(null);
    try {
      await apiClient.publishQuest(questId);
      setPublished(true);
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : 'Could not publish this quest.');
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-accent">The Forge</h1>
      <p className="mt-1 text-sm text-muted">
        Start from a plain idea, or skip straight to the form below. Requires an account —{' '}
        <Link href="/login" className="text-accent focus-ring">log in</Link> or{' '}
        <Link href="/register" className="text-accent focus-ring">register</Link> first.
      </p>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <label htmlFor="ideaText" className="text-xs text-muted">Your idea</label>
        <textarea
          id="ideaText"
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          rows={3}
          placeholder="e.g. walk the arboretum and photograph three trees"
          className="focus-ring mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || ideaText.trim().length < 3}
          className="focus-ring mt-3 rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate a draft'}
        </button>
        {generationError ? <p role="alert" className="mt-2 text-sm text-warning">{generationError}</p> : null}
        {aiConfidence ? (
          <p className="mt-2 text-xs text-muted">
            AI draft confidence: <strong>{aiConfidence}</strong> — review and fill in every field below before
            submitting; nothing here is trusted until you confirm it.
          </p>
        ) : null}
      </section>

      <form onSubmit={handleSaveDraft} className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-lg">Structured quest</h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="text-xs text-muted">Title</label>
          <input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="plainSummary" className="text-xs text-muted">Plain one-line summary</label>
          <input id="plainSummary" required value={form.plainSummary} onChange={(e) => setForm({ ...form, plainSummary: e.target.value })}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="guildKey" className="text-xs text-muted">Guild</label>
          <select id="guildKey" value={form.guildKey} onChange={(e) => setForm({ ...form, guildKey: e.target.value })}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text">
            <option value="">Choose a guild</option>
            {guilds.map((g) => (
              <option key={g.stable_key} value={g.stable_key}>{g.display_name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="objectives" className="text-xs text-muted">Objectives (one per line)</label>
          <textarea id="objectives" rows={3} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })}
            className="focus-ring rounded border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>

        <fieldset>
          <legend className="text-xs text-muted">Factor scores (1 low – 5 high, spec Section 11)</legend>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(FACTOR_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <label htmlFor={key} className="text-sm text-text">{label}</label>
                <input
                  id={key}
                  type="number"
                  min={1}
                  max={5}
                  value={form.factorScores[key]}
                  onChange={(e) =>
                    setForm({ ...form, factorScores: { ...form.factorScores, [key]: Number(e.target.value) } })
                  }
                  className="focus-ring w-16 rounded border border-border bg-bg px-2 py-1 text-sm text-text"
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="riskRating" className="text-xs text-muted">Risk rating</label>
          <select id="riskRating" value={form.riskRating}
            onChange={(e) => setForm({ ...form, riskRating: e.target.value as FormState['riskRating'] })}
            className="focus-ring rounded border border-border bg-bg px-3 py-1.5 text-sm text-text">
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
            <option value="severe">Severe</option>
          </select>
        </div>

        {form.riskRating !== 'low' ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="safetyNotes" className="text-xs text-muted">
              Safety notes (required for moderate+ risk — spec Section 18)
            </label>
            <textarea id="safetyNotes" rows={2} value={form.safetyNotes} onChange={(e) => setForm({ ...form, safetyNotes: e.target.value })}
              className="focus-ring rounded border border-border bg-bg px-3 py-2 text-sm text-text" />
          </div>
        ) : null}

        <fieldset>
          <legend className="text-xs text-muted">
            Accessibility — leave &ldquo;unknown&rdquo; rather than guess (Principle 10)
          </legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ACCESSIBILITY_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <label htmlFor={key} className="text-sm capitalize text-text">{key.replace(/_/g, ' ')}</label>
                <select
                  id={key}
                  value={form.accessibility[key]}
                  onChange={(e) => setForm({ ...form, accessibility: { ...form.accessibility, [key]: e.target.value } })}
                  className="focus-ring rounded border border-border bg-bg px-2 py-1 text-sm text-text"
                >
                  <option value="unknown">Unknown</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="reported">Reported</option>
                  <option value="partially">Partially</option>
                  <option value="not_accessible">Not accessible</option>
                </select>
              </div>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={form.ageAdultContent}
            onChange={(e) => setForm({ ...form, ageAdultContent: e.target.checked })} className="focus-ring" />
          Contains adult content, alcohol, or gambling (21+)
        </label>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="durationMinMinutes" className="text-xs text-muted">Est. time (minutes)</label>
            <input id="durationMinMinutes" type="number" min={0} value={form.durationMinMinutes}
              onChange={(e) => setForm({ ...form, durationMinMinutes: e.target.value })}
              className="focus-ring w-32 rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="costMinCents" className="text-xs text-muted">Est. cost (cents)</label>
            <input id="costMinCents" type="number" min={0} value={form.costMinCents}
              onChange={(e) => setForm({ ...form, costMinCents: e.target.value })}
              className="focus-ring w-32 rounded border border-border bg-bg px-3 py-1.5 text-sm text-text" />
          </div>
        </div>

        {saveError ? <p role="alert" className="text-sm text-danger">{saveError}</p> : null}

        <button type="submit" className="focus-ring rounded bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast">
          Save draft
        </button>
      </form>

      {questId ? (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-lg">Draft saved</h2>
          <p className="mt-1 text-sm text-muted">
            Computed tier: <strong>{tier}</strong>
          </p>
          <button type="button" onClick={handleSubmitForReview}
            className="focus-ring mt-3 rounded border border-border px-4 py-1.5 text-sm text-text hover:border-accent">
            Submit for review
          </button>

          {submitResult ? (
            <div className="mt-4 rounded border border-border p-4 text-sm">
              <p>
                Status: <strong>{submitResult.status}</strong> · Feasibility confidence:{' '}
                <strong>{submitResult.confidence}</strong>
              </p>
              {submitResult.blockers.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-danger">
                  {submitResult.blockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              ) : null}
              {submitResult.warnings.length > 0 ? (
                <ul className="mt-2 list-inside list-disc text-warning">
                  {submitResult.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              ) : null}
              {submitResult.moderationCaseId ? (
                <p className="mt-2 text-muted">Sent to moderation review — you&apos;re not yet a trusted creator.</p>
              ) : null}
              {submitResult.status === 'approved' && !published ? (
                <button type="button" onClick={handlePublish}
                  className="focus-ring mt-3 rounded bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast">
                  Publish
                </button>
              ) : null}
              {published ? (
                <p className="mt-2">
                  Published! <Link href={`/quests/${questId}`} className="text-accent focus-ring">View it</Link>
                </p>
              ) : null}
            </div>
          ) : null}
          {actionError ? <p role="alert" className="mt-2 text-sm text-danger">{actionError}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
