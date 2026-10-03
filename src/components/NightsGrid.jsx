import { COLORS } from "@/lib/travelColors";

// Where he slept each night, in the layout of a GitHub contribution graph: one column per week (Sunday first), one
// row per weekday, so the Saturday row reads as the weekends.
const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 18;
const WEEKDAYS = { 1: "Mon", 3: "Wed", 5: "Fri", 6: "Sat" };

const dow = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
const fmt = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function NightsGrid({ travel }) {
  const offset = dow(travel.from);
  const cells = travel.calendar.map((n, i) => ({ ...n, col: Math.floor((i + offset) / 7), row: (i + offset) % 7 }));
  const cols = cells.at(-1).col + 1;
  const months = cells.filter((c) => c.date.endsWith("-01") || c === cells[0]).filter((c, i, list) => i === 0 || c.col - list[i - 1].col >= 3);
  const width = LEFT + cols * STEP;
  const height = TOP + 7 * STEP;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Calendar of where the president slept each night" style={{ display: "block", fontVariantNumeric: "tabular-nums" }}>
        {months.map((c) => (
          <text key={c.date} x={LEFT + c.col * STEP} y={11} fontSize="11" fill="#505a5f">
            {new Date(`${c.date}T12:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" })}
          </text>
        ))}
        {Object.entries(WEEKDAYS).map(([row, label]) => (
          <text key={row} x={0} y={TOP + Number(row) * STEP + CELL - 2} fontSize="11" fill="#505a5f">
            {label}
          </text>
        ))}
        {cells.map((c) => {
          const place = travel.places[c.place];
          return (
            <rect key={c.date} x={LEFT + c.col * STEP} y={TOP + c.row * STEP} width={CELL} height={CELL} rx="2" fill={COLORS[place.category].cell}>
              <title>{`${fmt(c.date)}: ${place.label}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
