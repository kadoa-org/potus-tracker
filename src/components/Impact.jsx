
// Single source of truth for how a Truth Social post's classification is
// labelled and coloured, shared by the Today dashboard and the /truth feed so
// the two never drift. Impact = how much the post matters in the real world
// (the level says how much); category = impact on WHAT.

export const SIG = {
  high: { label: "High impact", short: "High", rank: 3 },
  medium: { label: "Medium impact", short: "Medium", rank: 2 },
  low: { label: "Low impact", short: "Low", rank: 1 },
};

// Order drives the filter bar. Keys match the backend `category` enum.
export const CATEGORY_LABEL = {
  market_moving: "Markets",
  foreign_policy: "Foreign policy",
  policy_action: "Policy action",
  legal: "Legal",
  personnel: "Personnel",
  media_attack: "Personal attack",
  campaign: "Campaign",
  other: "Other",
};

// Impact as a GOV.UK tag: "High impact", "Medium impact", "Low impact". GOV.UK advises against icons on public
// pages (one icon reads as different things to different people) and uses tags for a status like this, as the UKHSA
// dashboard does for its trends. The tag names what is measured, so it reads on its own: a single word such as
// "Minor" did not say minor what. Colour is a second cue, never the only one; low stays grey because it means noise.
const TONE = { high: "red", medium: "orange", low: "grey" };
// `full` names the measure ("Medium impact") for a tag that stands alone, without a key next to it.
export function ImpactMeter({ signal, full = false }) {
  const level = SIG[signal];
  if (!level) return null;
  return <strong className={`gov-tag gov-tag--${TONE[signal]}`}>{full ? level.label : level.short}</strong>;
}

// The card footer, one quiet line: topic and who the post mentions on the left, the link to the original on the right.
// Impact sits on the timeline next to the date, so it is not repeated here.
export function PostProperties({ post }) {
  const mentions = Array.isArray(post.entities) ? post.entities.map((e) => e.name).filter(Boolean) : [];
  const rows = [
    post.category && ["Topic", CATEGORY_LABEL[post.category] ?? "Other"],
    mentions.length > 0 && ["Mentions", mentions.join(", ")],
  ].filter(Boolean);
  const link = post.original_post_link;
  if (!rows.length && !link) return null;
  return (
    <div className="post-card__footer">
      {rows.length > 0 && (
        <p className="post-card__props">
          {rows.map(([key, value], i) => (
            <span key={key}>
              {i > 0 && " · "}
              {key === "Mentions" ? <span className="dk-visually-hidden">Mentions: </span> : null}
              {value}
            </span>
          ))}
        </p>
      )}
      {/* Historical rows may still carry the aggregator URL, and the label must not promise Truth Social when the link
          goes elsewhere. */}
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="dk-link post-card__source">
          {/truthsocial\.com/.test(link) ? "View on Truth Social" : "View the original post"}
          <span className="dk-visually-hidden"> (opens in a new tab)</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}
