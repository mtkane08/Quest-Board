import Link from 'next/link';
import type { QuestCard as QuestCardData } from '@/lib/api';
import { CONFIDENCE_LABEL, formatCost, formatDistance, formatDuration, formatTrustBadge } from '@/lib/format';

/**
 * Section 45's quest card minimum content, one component shared by the
 * discovery list, the map pin popup, and search — so accessibility and
 * trust-badge correctness only need verifying once (see
 * docs/gate-1/10-wireflows-and-screens.md's cross-cutting UI rule).
 */
export function QuestCard({ quest }: { quest: QuestCardData }) {
  const distance = formatDistance(quest.distanceMeters);
  const isAdult = quest.ageRestrictions.adult_content || quest.ageRestrictions.alcohol || quest.ageRestrictions.gambling;
  const accessibilityUnknown = Object.values(quest.accessibilityHighlights).every(
    (v) => v === 'unknown' || v === undefined,
  );

  return (
    <li className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent">
      <Link href={`/quests/${quest.questId}`} className="focus-ring block">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg text-text">{quest.title}</h3>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
            {quest.overallTier}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{quest.plainSummary}</p>

        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <div>
            <dt className="sr-only">Time</dt>
            <dd>{formatDuration(quest.durationMinMinutes, quest.durationMaxMinutes)}</dd>
          </div>
          <div>
            <dt className="sr-only">Cost</dt>
            <dd>{formatCost(quest.costMinCents, quest.costMaxCents)}</dd>
          </div>
          {distance ? (
            <div>
              <dt className="sr-only">Distance</dt>
              <dd>{distance}</dd>
            </div>
          ) : null}
          {quest.primaryPlaceName ? (
            <div>
              <dt className="sr-only">Location</dt>
              <dd>{quest.primaryPlaceName}</dd>
            </div>
          ) : (
            <div>
              <dd>At home</dd>
            </div>
          )}
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {quest.trustBadges.map((badge) => (
            <span key={badge} className="rounded border border-border px-2 py-0.5 text-muted">
              {formatTrustBadge(badge)}
            </span>
          ))}
          <span
            className="rounded border border-border px-2 py-0.5 text-muted"
            title="Feasibility confidence — see docs/gate-1/07-ai-service-schemas.md"
          >
            {CONFIDENCE_LABEL[quest.feasibilityConfidence] ?? quest.feasibilityConfidence}
          </span>
        </div>

        {(isAdult || accessibilityUnknown) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {isAdult && (
              <span className="rounded border border-warning px-2 py-0.5 text-warning" role="note">
                Age-restricted
              </span>
            )}
            {accessibilityUnknown && (
              <span className="rounded border border-border px-2 py-0.5 text-muted" role="note">
                Accessibility: unknown — not confirmed either way
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}
