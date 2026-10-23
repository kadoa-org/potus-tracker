// Charts for the trades insight: trades per month (Trump's accounts vs Congress), the random-date check, and posts that
// came days after a trade. Colours: Trump blue, Congress grey, purchases green, sales red (Okabe-Ito, checked for
// colour blindness; purchases and sales also differ by shape).
export const C = { trump: "#0072B2", congress: "#9aa0a6", congressText: "#505a5f", buy: "#009E73", buyText: "#00785A", sale: "#D55E00", ink: "#0b0c0c", muted: "#505a5f" };

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m) => `${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

// Paired bars per month. The last month is faded: its filings may not all be in yet.
export function MonthlyTrades({ months, totals }) {
  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-[16px]">
        <span className="flex items-center gap-2"><i className="block h-4 w-4 rounded-[2px]" style={{ background: C.trump }} />Trump&apos;s accounts <b>{totals.trump.toLocaleString("en-US")}</b></span>
        <span className="flex items-center gap-2"><i className="block h-4 w-4 rounded-[2px]" style={{ background: C.congress }} />Congress <b>{totals.congress.toLocaleString("en-US")}</b></span>
      </div>
      <div className="hidden sm:block"><Bars months={months} W={760} H={300} ticks={/(01|07)$/} /></div>
      <div className="sm:hidden"><Bars months={months} W={360} H={240} ticks={/01$/} /></div>
    </figure>
  );
}

function Bars({ months, W, H, ticks }) {
  const L = 44, T = 16, B = 30, YMAX = 3000;
  const n = months.length, gw = (W - L) / n, bw = gw * 0.36;
  const y = (v) => T + (1 - v / YMAX) * (H - T - B);
  return (
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Trades per month, Trump's accounts and Congress">
        {[0, 1000, 2000, 3000].map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke="rgba(0,0,0,.08)" />
            <text x={0} y={y(v) - 5} fontSize={13} fill={C.muted}>{v.toLocaleString("en-US")}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = L + i * gw + gw / 2, last = i === n - 1;
          return (
            <g key={m.month} opacity={last ? 0.45 : 1}>
              <rect x={cx - bw - 1} y={y(m.trump)} width={bw} height={y(0) - y(m.trump)} rx={1.5} fill={C.trump}>
                <title>{`${monthLabel(m.month)}: Trump's accounts ${m.trump.toLocaleString("en-US")}, Congress ${m.congress.toLocaleString("en-US")}${last ? " (incomplete)" : ""}`}</title>
              </rect>
              <rect x={cx + 1} y={y(m.congress)} width={bw} height={y(0) - y(m.congress)} rx={1.5} fill={C.congress}>
                <title>{`${monthLabel(m.month)}: Trump's accounts ${m.trump.toLocaleString("en-US")}, Congress ${m.congress.toLocaleString("en-US")}${last ? " (incomplete)" : ""}`}</title>
              </rect>
              {ticks.test(m.month) && <text x={cx} y={H - 8} fontSize={13} fill={C.muted} textAnchor="middle">{monthLabel(m.month)}</text>}
            </g>
          );
        })}
      </svg>
  );
}

// One row per test: the range random dates give (5th to 95th percentile of 1,000 shuffles), the typical value as a
// dashed line, and the real count as a bar in the trade's colour.
export function ChanceRows({ chance }) {
  const rows = [
    { label: "Bought in the week before praising a company", r: chance.praise, color: C.buy, text: C.buyText },
    { label: "Sold in the week before attacking a company", r: chance.attack, color: C.sale, text: C.sale },
  ];
  return (
    <div className="flex flex-col gap-6">
      {rows.map(({ label, r, color, text }) => {
        const x = (v) => 4 + ((v - r.lo) / (r.hi - r.lo)) * 92;
        return (
          <div key={label} className="grid items-center gap-x-6 gap-y-2 sm:grid-cols-[340px_minmax(0,1fr)_110px]">
            <div className="text-[17px] font-semibold">{label}</div>
            <div>
              <div className="relative h-9 rounded-md bg-[#e9eaeb]">
                <span className="absolute top-0 h-full border-l-2 border-dashed border-[#505a5f]" style={{ left: `${x(r.median)}%` }} />
                <span className="absolute -top-1 h-11 w-[6px] -translate-x-1/2 rounded-sm" style={{ left: `${x(r.real)}%`, background: color }} />
              </div>
              <div className="mt-1 text-[15px] text-[#505a5f]">Random dates: {r.lo} to {r.hi}, typically {r.median}</div>
            </div>
            <div className="text-[20px] font-bold" style={{ color: text }}>{r.real} of {r.n}</div>
          </div>
        );
      })}
    </div>
  );
}

const Tri = ({ x, y, up, color }) => (
  <polygon points={up ? `${x - 8},${y + 7} ${x + 8},${y + 7} ${x},${y - 7}` : `${x - 8},${y - 7} ${x + 8},${y - 7} ${x},${y + 7}`} fill={color} />
);

// Each post on a shared axis of days before it: trades as triangles, the post as a line, the quote after it.
export function PostTimeline({ examples }) {
  const W = 300, H = 40, tx = (d) => 14 + ((d + 7) * (W - 26)) / 7, mid = H / 2;
  const day = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const quote = (e) => {
    if (!e.bold || !e.quote.includes(e.bold)) return e.quote;
    const [a, b] = e.quote.split(e.bold);
    return <>{a}<b>{e.bold}</b>{b}</>;
  };
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[16px]">
        <span className="flex items-center gap-2"><svg width="18" height="16"><Tri x={9} y={8} up color={C.buy} /></svg>Purchase</span>
        <span className="flex items-center gap-2"><svg width="18" height="16"><Tri x={9} y={8} color={C.sale} /></svg>Sale</span>
      </div>
      <div className="grid gap-x-6 sm:grid-cols-[150px_300px_1fr]">
        <div className="hidden sm:block" />
        <div>
          <div className="text-[15px] text-[#505a5f]">Days before the post</div>
          <svg width={W} height={20} style={{ overflow: "visible" }}>
            {[-7, -6, -5, -4, -3, -2, -1].map((d) => <text key={d} x={tx(d)} y={15} fontSize={14} fill={C.muted} textAnchor="middle">{-d}</text>)}
            <text x={tx(0)} y={15} fontSize={14} fontWeight={600} fill={C.ink} textAnchor="middle">Post</text>
          </svg>
        </div>
      </div>
      {examples.map((e) => (
        <div key={e.company + e.date} className="grid items-center gap-x-6 gap-y-1 border-t border-[#e6e6e6] py-2 sm:grid-cols-[150px_300px_1fr]">
          <div>
            <div className="text-[17px] font-semibold">{e.company}</div>
            <div className="text-[15px] text-[#505a5f]">{day(e.date)}</div>
          </div>
          <svg width={W} height={H} className="max-w-full" role="img" aria-label={`${e.company}: purchases ${e.buys.map((d) => -d).join(", ") || "none"} and sales ${e.sales.map((d) => -d).join(", ") || "none"} days before the post`}>
            <line x1={tx(-7) - 8} x2={tx(0)} y1={mid} y2={mid} stroke="#c9cdd1" strokeWidth={1.5} />
            {[-7, -6, -5, -4, -3, -2, -1].map((d) => <line key={d} x1={tx(d)} x2={tx(d)} y1={mid - 4} y2={mid + 4} stroke="#c9cdd1" strokeWidth={1.5} />)}
            <line x1={tx(0)} x2={tx(0)} y1={2} y2={H - 2} stroke={C.ink} strokeWidth={3} />
            {e.buys.map((d) => <Tri key={`b${d}`} x={tx(d) - (e.sales.includes(d) ? 7 : 0)} y={mid - 2} up color={C.buy} />)}
            {e.sales.map((d) => <Tri key={`s${d}`} x={tx(d) + (e.buys.includes(d) ? 7 : 0)} y={mid + 2} color={C.sale} />)}
          </svg>
          <div className="text-[17px]">
            {e.url ? <a href={e.url} className="text-inherit no-underline hover:underline">&ldquo;{quote(e)}&rdquo;</a> : <>&ldquo;{quote(e)}&rdquo;</>}
          </div>
        </div>
      ))}
    </div>
  );
}
