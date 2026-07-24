import type { Metadata } from "next";
import { Today } from "@/components/Today";

// The "Today" dashboard is the front door: one page answering "where is the
// president / what's on today" with the schedule, Truth Social signal, location,
// and White House news at a glance. Date-stamped title for freshness + the top
// query family ("president schedule today", "where is trump today").
const todayLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

export const metadata: Metadata = {
  title: `Where is the President Today? Live Location & Schedule (${todayLabel})`,
  description:
    "Where is President Trump right now, what is on his schedule today, and what has he just said? Live location, public schedule, and Truth Social posts scored by relevance, updated in real time.",
  alternates: { canonical: "https://www.kadoa.com/potus" },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <Today />;
}
