import { geoAzimuthalEquidistantRaw, geoCircle, geoGraticule10, geoPath, geoProjection } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-50m.json";
import { addDays, km } from "@/lib/travel";

// "The world as seen from the White House": an azimuthal map centred on Washington, true to scale out to 1,600 km and
// log-compressed beyond, so the East Coast shuttle and the foreign trips fit one map. Flights out of Washington are
// straight spokes. Glow area is proportional to nights; the ring around the map is the year, one segment per night.

const TEXT = "#0b0c0c";
const SECONDARY = "#505a5f";
const BORDER = "#b1b4b6";
const INK = "#0b0c0c";
export const COLORS = {
  washington: { ring: "#e8eaec", glow: "#b1b4b6" },
  maralago: { ring: "#e2560f", glow: "#e2560f" },
  bedminster: { ring: "#00857a", glow: "#00857a" },
  property: { ring: "#f5a66f", glow: "#f08a3e" },
  us: { ring: "#a8b4c0", glow: "#7d8a97" },
  abroad: { ring: "#12436d", glow: "#12436d" },
};

const EARTH_KM = 6371;
const C1 = 1600 / EARTH_KM;
const CMAX = (142 * Math.PI) / 180;
const INNER = 0.4;
// Beyond C1 the radius grows as C1 + a*ln(1 + (c - C1)/a), which meets the linear part with the same slope; a is
// solved so the true-scale disc takes INNER of the map radius.
const outer = (a) => C1 + a * Math.log1p((CMAX - C1) / a);
const A = (() => {
  let lo = 1e-4, hi = 10;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (outer(m) > C1 / INNER) hi = m;
    else lo = m;
  }
  return (lo + hi) / 2;
})();
const RMAX = outer(A);
const rOf = (c) => (c <= C1 ? c : C1 + A * Math.log1p((c - C1) / A));
const raw = (l, p) => {
  const [x, y] = geoAzimuthalEquidistantRaw(l, p);
  const c = Math.hypot(x, y);
  if (!c) return [0, 0];
  const r = rOf(c);
  return [(x / c) * r, (y / c) * r];
};

const S = 1000;
const MR = 425;
const DC = [-77.04, 38.9];
const proj = geoProjection(raw).rotate([77.04, -38.9]).clipAngle(142).scale(MR / RMAX).translate([S / 2, S / 2]).precision(0.1);
const path = geoPath(proj);
const land = path(feature(world, world.objects.countries));
const graticule = path(geoGraticule10());
const ring = (kmRadius) => path(geoCircle().center(DC).radius(kmRadius / 111.195).precision(1)());
const ringY = (kmRadius, top) => {
  const r = (rOf(kmRadius / EARTH_KM) / RMAX) * MR;
  return top ? S / 2 - r + 15 : S / 2 + r - 5;
};

const GLOW_K = 34 / Math.sqrt(52); // 52 nights get a 34 px radius
const glowRadius = (nights) => Math.max(5, GLOW_K * Math.sqrt(nights)) * 1.2;
const legStyle = (a, b) =>
  a.category === "maralago" || b.category === "maralago"
    ? [COLORS.maralago.ring, 0.5, 1.6]
    : a.category === "bedminster" || b.category === "bedminster"
      ? [COLORS.bedminster.ring, 0.55, 1.6]
      : [INK, 0.15, 1.1];

const nightsText = (n) => `${n} night${n === 1 ? "" : "s"}`;
const charWidth = (text, size) => text.length * size * 0.6;

// Greedy label placement: each label tries the right, left, above and below of its dot and is skipped when every
// position overlaps an earlier label. Skipped places still appear in the table under the map.
function placeLabels(candidates) {
  const boxes = [];
  const out = [];
  const hits = (b) => boxes.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  const inside = (b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].every(([x, y]) => Math.hypot(x - S / 2, y - S / 2) < MR - 2);
  for (const c of candidates) {
    const w = charWidth(c.text, c.size) + (c.sub ? charWidth(` ${c.sub}`, c.size) : 0);
    const h = c.size + 2;
    const options = [
      { x: c.x + 9, y: c.y - h / 2, anchor: "start" },
      { x: c.x - 9 - w, y: c.y - h / 2, anchor: "end" },
      { x: c.x - w / 2, y: c.y - h - 8, anchor: "middle" },
      { x: c.x - w / 2, y: c.y + 8, anchor: "middle" },
    ];
    const pick = options.find((o) => {
      const b = { x: o.x, y: o.y, w, h };
      return !hits(b) && inside(b);
    });
    if (!pick && !c.force) continue;
    const o = pick ?? options[0];
    boxes.push({ x: o.x, y: o.y, w, h });
    const tx = o.anchor === "start" ? o.x : o.anchor === "end" ? o.x + w : o.x + w / 2;
    out.push({ ...c, tx, ty: o.y + h - 3, anchor: o.anchor });
  }
  return out;
}

export function TravelMap({ travel }) {
  const { places, flights, calendar } = travel;
  const pt = (p) => proj([p.lon, p.lat]);
  const slept = places.filter((p) => p.nights > 0).sort((a, b) => b.nights - a.nights);
  const legs = flights
    .map((f) => [places[f.from], places[f.to]])
    .sort(([a, b], [c, d]) => legStyle(a, b)[1] - legStyle(c, d)[1]);
  const seen = places.filter((p) => p.nights > 0 || p.visits > 0);

  const owned = new Set(["washington", "maralago", "bedminster", "property"]);
  const candidates = [
    ...seen.filter((p) => owned.has(p.category)).sort((a, b) => b.nights - a.nights),
    // Other places get a label only outside Washington's immediate area, where the East Coast labels already crowd.
    ...seen.filter((p) => !owned.has(p.category) && (p.category === "abroad" || p.nights >= 2) && km(p, places[0]) > 300).sort((a, b) => b.nights - a.nights || b.visits - a.visits),
  ]
    .map((p) => {
      const xy = pt(p);
      if (!xy) return null;
      const main = owned.has(p.category);
      return { id: p.id, x: xy[0], y: xy[1], text: p.label, sub: main && p.category !== "washington" && p.nights ? nightsText(p.nights) : null, size: main ? 16 : 14, bold: main, force: main };
    })
    .filter(Boolean);
  const labels = placeLabels(candidates);

  // The year ring: one segment per night, the first night at 12 o'clock, clockwise.
  const R0 = MR + 10;
  const R1 = MR + 34;
  const days = calendar.length;
  const polar = (r, a) => [S / 2 + r * Math.sin(a), S / 2 - r * Math.cos(a)];
  const segments = calendar.map((n, k) => {
    const a0 = (k / days) * 2 * Math.PI;
    const a1 = ((k + 1) / days) * 2 * Math.PI + 0.002;
    const [x0, y0] = polar(R0, a0), [x1, y1] = polar(R1, a0), [x2, y2] = polar(R1, a1), [x3, y3] = polar(R0, a1);
    const d = `M${x0.toFixed(2)},${y0.toFixed(2)}L${x1.toFixed(2)},${y1.toFixed(2)}A${R1},${R1} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}L${x3.toFixed(2)},${y3.toFixed(2)}A${R0},${R0} 0 0 0 ${x0.toFixed(2)},${y0.toFixed(2)}Z`;
    return <path key={n.date} d={d} fill={COLORS[places[n.place].category].ring} />;
  });
  const lastWeek = addDays(travel.to, -6);
  const ticks = calendar
    .map((n, k) => ({ ...n, k }))
    .filter((n) => n.k === 0 || (n.date.endsWith("-01") && n.date < lastWeek))
    .map((n) => {
      const a = (n.k / days) * 2 * Math.PI;
      const [xa, ya] = polar(R0 - 2, a), [xb, yb] = polar(R1 + 10, a), [xl, yl] = polar(R1 + 26, a + 0.06);
      const anchor = Math.sin(a) > 0.5 ? "start" : Math.sin(a) < -0.5 ? "end" : "middle";
      const x = xl - (anchor === "start" ? 8 : anchor === "end" ? -8 : 0);
      const month = new Date(`${n.date}T12:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      const year = n.date.slice(0, 4);
      return (
        <g key={n.date}>
          <line x1={xa} y1={ya} x2={xb} y2={yb} stroke={TEXT} strokeWidth="1" />
          <text x={x} y={yl + 4} textAnchor={anchor} className="tm-mon">
            {month}
            {n.k === 0 ? ` ${year}` : n.date.slice(5, 7) === "01" ? <tspan x={x} dy="17">{year}</tspan> : null}
          </text>
        </g>
      );
    });

  return (
    <svg viewBox="-40 -12 1080 1024" width="100%" role="img" aria-label="Map of the president's flights in the past year, centred on Washington, with a ring showing where he slept each night" className="tm-svg">
      <style>{`
        .tm-svg text{font-family:inherit;font-variant-numeric:tabular-nums}
        .tm-lab{font-size:14px;font-weight:600;fill:${TEXT};paint-order:stroke;stroke:#f8f8f8;stroke-opacity:.9;stroke-width:3px;stroke-linejoin:round}
        .tm-big{font-size:16px;font-weight:700}
        .tm-sub{font-weight:400;fill:${SECONDARY}}
        .tm-ring{font-size:12px;fill:${SECONDARY};paint-order:stroke;stroke:#f8f8f8;stroke-width:3px}
        .tm-mon{font-size:14px;fill:${SECONDARY}}
      `}</style>
      <defs>
        <clipPath id="tm-disc">
          <circle cx={S / 2} cy={S / 2} r={MR} />
        </clipPath>
        {Object.entries(COLORS).map(([key, { glow }]) => {
          const a = key === "washington" ? 0.8 : 1;
          return (
            <radialGradient key={key} id={`tm-glow-${key}`}>
              <stop offset="0" stopColor={glow} stopOpacity={0.5 * a} />
              <stop offset=".6" stopColor={glow} stopOpacity={0.36 * a} />
              <stop offset=".83" stopColor={glow} stopOpacity={0.24 * a} />
              <stop offset="1" stopColor={glow} stopOpacity="0" />
            </radialGradient>
          );
        })}
      </defs>
      <circle cx={S / 2} cy={S / 2} r={MR} fill="#f8f8f8" />
      <g clipPath="url(#tm-disc)">
        <path d={graticule} fill="none" stroke="#e9eaeb" strokeWidth=".6" />
        <path d={land} fill="#e5e6e7" stroke="#fff" strokeWidth=".7" />
      </g>
      <path d={ring(1600)} fill="none" stroke={SECONDARY} strokeWidth=".9" strokeDasharray="4 4" />
      {[5000, 10000].map((r) => (
        <path key={r} d={ring(r)} fill="none" stroke={BORDER} strokeWidth=".75" />
      ))}
      <text x={S / 2} y={ringY(1600, true)} textAnchor="middle" className="tm-ring">Zoomed in</text>
      <text x={S / 2} y={ringY(5000, false)} textAnchor="middle" className="tm-ring">5,000 km</text>
      <text x={S / 2} y={ringY(10000, false)} textAnchor="middle" className="tm-ring">10,000 km</text>
      {slept.map((p) => {
        const xy = pt(p);
        return xy ? <circle key={p.id} cx={xy[0]} cy={xy[1]} r={glowRadius(p.nights)} fill={`url(#tm-glow-${p.category})`} style={{ mixBlendMode: "multiply" }} /> : null;
      })}
      <g style={{ isolation: "isolate" }}>
        {legs.map(([a, b], i) => {
          const [color, opacity, width] = legStyle(a, b);
          return (
            <path key={i} d={path({ type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] })} stroke={color} strokeOpacity={opacity} strokeWidth={width} fill="none" style={{ mixBlendMode: "multiply" }} />
          );
        })}
      </g>
      {seen.map((p) => {
        const xy = pt(p);
        return xy ? <circle key={p.id} cx={xy[0]} cy={xy[1]} r="2" fill={INK} /> : null;
      })}
      {labels.map((l) => (
        <text key={l.id} x={l.tx} y={l.ty} textAnchor={l.anchor} className={l.bold ? "tm-lab tm-big" : "tm-lab"}>
          {l.text}
          {l.sub ? <tspan className="tm-sub"> {l.sub}</tspan> : null}
        </text>
      ))}
      {segments}
      {ticks}
    </svg>
  );
}
