"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

// date-fns' relative "x ago" depends on the current time, which differs between
// the server render and the client hydration → a hydration mismatch. So we render
// a DETERMINISTIC absolute label (fixed ET timezone) on the first paint, identical
// on server and client, then upgrade to relative time client-side after mount.
const ABS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function RelativeTime({ iso }) {
  const [rel, setRel] = useState(null);

  useEffect(() => {
    if (!iso) return undefined;
    const tick = () => setRel(formatDistanceToNow(new Date(iso), { addSuffix: true }));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [iso]);

  if (!iso) return null;
  // suppressHydrationWarning: time text is inherently client-variable (and Intl
  // output can differ by ICU version between server and browser). We render a
  // deterministic absolute label first, so any difference is cosmetic and gone
  // after the effect swaps in relative time — this just silences the warning.
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {rel ?? ABS.format(new Date(iso))}
    </time>
  );
}
