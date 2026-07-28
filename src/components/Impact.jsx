import { Tag } from "../kit";

// Single source of truth for how a Truth Social post's classification is
// labelled and coloured, shared by the Today dashboard and the /truth feed so
// the two never drift. Impact = how much the post matters in the real world
// (the level says how much); category = impact on WHAT.

export const SIG = {
  high: { label: "High impact", bars: 3, rank: 3 },
  medium: { label: "Medium impact", bars: 2, rank: 2 },
  low: { label: "Low impact", bars: 1, rank: 1 },
};

// Order drives the filter bar. Keys match the backend `category` enum.
export const CATEGORY_LABEL = {
  market_moving: "Markets",
  foreign_policy: "Foreign policy",
  policy_action: "Policy action",
  legal: "Legal",
  personnel: "Personnel",
  media_attack: "Attack",
  campaign: "Campaign",
  other: "General",
};

// Entity chip colour by type. Grounded types get distinct tones so a scan of
// the feed reads structure (who / where / which market) without labels.
const ENTITY_TONE = {
  person: "slate",
  company: "blue",
  ticker: "green",
  organization: "purple",
  agency: "teal",
  country: "orange",
  place: "yellow",
  other: "grey",
};

// The 3-bar impact meter (red = high, amber = medium, faint = low). Decorative;
// the text label beside it carries the meaning for screen readers.
export function SignalMini({ signal }) {
  const bars = SIG[signal]?.bars ?? 1;
  return (
    <span className={`sig3 sig-${signal}`} aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`sig-bar ${n <= bars ? "on" : ""}`} />
      ))}
    </span>
  );
}

// Impact meter + level label + category, on one line. Used at the top of each
// feed post and in the dashboard's Truth Social panel.
export function ImpactBadge({ signal, category }) {
  if (!signal) return null;
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <SignalMini signal={signal} />
      <span className="text-[12px] font-semibold text-[#505a5f]">{SIG[signal]?.label}</span>
      {category && <span className="dk-hint text-[12px]">· {CATEGORY_LABEL[category] ?? "General"}</span>}
    </span>
  );
}

// A row of entity chips. Renders nothing when there are no entities.
export function EntityTags({ entities }) {
  if (!Array.isArray(entities) || entities.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entities.map((e, i) => (
        <Tag key={`${e.type}:${e.name}:${i}`} tone={ENTITY_TONE[e.type] ?? "grey"}>
          <span title={e.type}>{e.name}</span>
        </Tag>
      ))}
    </div>
  );
}
