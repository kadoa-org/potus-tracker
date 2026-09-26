
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
export function ImpactMeter({ signal }) {
  const level = SIG[signal];
  if (!level) return null;
  return <strong className={`gov-tag gov-tag--${TONE[signal]}`}>{level.short}</strong>;
}

// A post's properties as a GOV.UK summary list, the design system's pattern for a set of key and value pairs, in its
// compact form without row borders: impact, topic, who the post mentions and its source, one row each.
export function PostProperties({ post }) {
  const mentions = Array.isArray(post.entities) ? post.entities.map((e) => e.name).filter(Boolean) : [];
  const rows = [
    post.signal && ["Impact", <ImpactMeter signal={post.signal} />],
    post.category && ["Topic", CATEGORY_LABEL[post.category] ?? "Other"],
    mentions.length > 0 && ["Mentions", mentions.join(", ")],
    // Where the post was published is a property of it like the rest, so its link is a row rather than a loose link
    // under the list. Historical rows may still carry the aggregator URL, and the label must not promise Truth Social
    // when the link goes elsewhere.
    post.original_post_link && [
      "Source",
      <a href={post.original_post_link} target="_blank" rel="noreferrer" className="dk-link inline-flex items-center gap-1">
        {/truthsocial\.com/.test(post.original_post_link) ? "Truth Social" : "Original post"}
        <span className="dk-visually-hidden"> (opens in a new tab)</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>,
    ],
  ].filter(Boolean);
  if (!rows.length) return null;
  return (
    <dl className="gov-summary-list">
      {rows.map(([key, value]) => (
        <div className="gov-summary-list__row" key={key}>
          <dt className="gov-summary-list__key">{key}</dt>
          <dd className="gov-summary-list__value">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
