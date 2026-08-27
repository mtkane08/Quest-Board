import { notFound } from 'next/navigation';
import { QuestActions } from '@/components/QuestActions';
import { ReportButton } from '@/components/ReportButton';
import { SaveOfflineButton } from '@/components/SaveOfflineButton';
import { getQuest, isApiError } from '@/lib/api';
import { CONFIDENCE_LABEL, formatCost, formatDuration, formatTrustBadge } from '@/lib/format';

const ACCESSIBILITY_LABEL: Record<string, string> = {
  confirmed: 'Confirmed accessible',
  reported: 'Reported accessible',
  partially: 'Partially accessible',
  not_accessible: 'Not accessible',
  unknown: 'Unknown — not confirmed either way',
};

/**
 * QB-031 / Section 9: everything a user needs before starting — safety,
 * accessibility, cost, time, travel, equipment, age restrictions,
 * completion methods — is visible here regardless of spoilers. Objectives
 * are shown too (this build doesn't hide them), since the spec only
 * requires *these specific fields* be spoiler-free, not that every detail
 * must be hidden.
 */
export default async function QuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getQuest(id);

  if (isApiError(result)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p role="alert" className="text-danger">
          Could not load this quest: {result.message}
        </p>
      </main>
    );
  }

  const quest = result.quest;
  if (!quest) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs uppercase tracking-wide text-muted">
        {quest.guildDisplayName ?? 'Uncategorized'} · {quest.overallTier}
      </p>
      <h1 className="font-display mt-1 text-3xl text-accent">{quest.title}</h1>
      <p className="mt-2 text-muted">{quest.plainSummary}</p>
      {quest.narratedDescription ? <p className="mt-3 italic text-text">{quest.narratedDescription}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <QuestActions questId={quest.questId} />
        <SaveOfflineButton questId={quest.questId} title={quest.title} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {quest.trustBadges.map((badge) => (
          <span key={badge} className="rounded border border-border px-2 py-0.5 text-muted">
            {formatTrustBadge(badge)}
          </span>
        ))}
        <span className="rounded border border-border px-2 py-0.5 text-muted">
          {CONFIDENCE_LABEL[quest.feasibilityConfidence] ?? quest.feasibilityConfidence}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Time</dt>
          <dd>{formatDuration(quest.durationMinMinutes, quest.durationMaxMinutes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Cost</dt>
          <dd>{formatCost(quest.costMinCents, quest.costMaxCents)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Risk</dt>
          <dd className="capitalize">{quest.riskRating}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Travel mode</dt>
          <dd className="capitalize">{quest.travelMode ?? 'Not specified'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Physical intensity</dt>
          <dd>{quest.physicalIntensity ?? '—'} / 5</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Mental challenge</dt>
          <dd>{quest.mentalIntensity ?? '—'} / 5</dd>
        </div>
      </dl>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-lg">Accessibility</h2>
        <p className="mt-1 text-xs text-muted">
          &ldquo;Unknown&rdquo; means we have no data either way — it is never shown as
          accessible by default (spec Principle 10).
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {Object.entries(quest.accessibilityProfile).map(([key, value]) => (
            <li key={key} className="flex justify-between gap-2">
              <span className="capitalize text-muted">{key.replace(/_/g, ' ')}</span>
              <span>{ACCESSIBILITY_LABEL[value] ?? value}</span>
            </li>
          ))}
        </ul>
      </section>

      {(quest.ageRestrictions.adult_content || quest.ageRestrictions.alcohol || quest.ageRestrictions.gambling) && (
        <section className="mt-6 rounded-lg border border-warning bg-surface p-5">
          <h2 className="font-display text-lg text-warning">Age restrictions</h2>
          <ul className="mt-2 text-sm text-text">
            {quest.ageRestrictions.min_age ? <li>Minimum age: {quest.ageRestrictions.min_age}+</li> : null}
            {quest.ageRestrictions.alcohol ? <li>Involves alcohol</li> : null}
            {quest.ageRestrictions.gambling ? <li>Involves gambling</li> : null}
          </ul>
        </section>
      )}

      {quest.safetyNotes ? (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-lg">Safety notes</h2>
          <p className="mt-2 text-sm text-text">{quest.safetyNotes}</p>
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="font-display text-lg">Before you start</h2>
        <ul className="mt-2 space-y-1 text-sm text-text">
          <li>
            <strong>Required equipment:</strong>{' '}
            {quest.requiredEquipment.length > 0 ? quest.requiredEquipment.join(', ') : 'None'}
          </li>
          <li>
            <strong>Completion method(s):</strong> {quest.completionMethods.join(', ')}
          </li>
          {quest.lastVerificationAt ? (
            <li>
              <strong>Last verified:</strong> {new Date(quest.lastVerificationAt).toLocaleDateString()}
            </li>
          ) : (
            <li className="text-muted">Not yet independently verified.</li>
          )}
        </ul>
      </section>

      {quest.objectives.length > 0 ? (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-lg">Objectives</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text">
            {quest.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {quest.places.length > 0 ? (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-lg">Location{quest.places.length > 1 ? 's' : ''}</h2>
          <ul className="mt-2 space-y-1 text-sm text-text">
            {quest.places.map((place, i) => (
              <li key={i}>{place.placeName ?? 'Unnamed location'}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">This is an at-home quest — no travel required.</p>
      )}

      {quest.aggregateRating.isDisplayable && quest.aggregateRating.averages ? (
        <section className="mt-6 rounded-lg border border-border bg-surface p-5">
          <h2 className="font-display text-lg">Community rating ({quest.aggregateRating.responseCount} responses)</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-text">
            <li>Enjoyment: {quest.aggregateRating.averages.enjoyment.toFixed(1)} / 5</li>
            <li>Accuracy: {quest.aggregateRating.averages.accuracy.toFixed(1)} / 5</li>
            <li>Tier accuracy: {quest.aggregateRating.averages.tierAccuracy.toFixed(1)} / 5</li>
            <li>Would recommend: {quest.aggregateRating.averages.wouldRecommend.toFixed(1)} / 5</li>
          </ul>
        </section>
      ) : quest.aggregateRating.responseCount > 0 ? (
        <p className="mt-6 text-sm text-muted">
          Not enough ratings yet to show a reliable average ({quest.aggregateRating.responseCount} so far).
        </p>
      ) : null}

      <ReportButton questVersionId={quest.versionId} />
    </main>
  );
}
