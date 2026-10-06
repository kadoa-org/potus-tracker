import type { Metadata } from "next";
import { AboutPage as KitAboutPage } from "@/kit";

export const metadata: Metadata = {
  title: "About the Data | POTUS Tracker",
  description:
    "A live view of the presidency: White House actions, Truth Social posts scored by impact, and the president's public schedule. Collected with Kadoa, open source on GitHub.",
  alternates: { canonical: "https://www.kadoa.com/potus/about" },
};

const REPO = "https://github.com/kadoa-org/potus-tracker";

// The root layout already wraps every page in .dk-container, so the page renders the kit component directly.
export default function AboutPage() {
  return (
    <KitAboutPage
      dataset="potus"
      lede="White House actions, Trump's Truth Social posts and the president's public schedule, in one live record."
      sources={[
        { name: "White House", href: "https://www.whitehouse.gov/news/", what: "News, executive orders and other actions" },
        { name: "Trump's Truth", href: "https://www.trumpstruth.org/", what: "Archive of Truth Social posts" },
        { name: "Factbase", href: "https://rollcall.com/factbase/trump/topic/calendar/", what: "The president's public schedule" },
      ]}
      steps={[
        { title: "Monitor", text: "Kadoa checks the White House, Truth Social and the public schedule for new items." },
        { title: "Extract", text: "It pulls out each action, post and event with its date and link." },
        { title: "Enrich", text: "AI summarizes each action, rates each post's impact and places each event on the map." },
        { title: "Link", text: "Every item links back to its original source." },
      ]}
      methods={[
        {
          title: "Limits",
          body: [
            "New items can take a while to appear.",
            "The schedule lists only public events, and some have no time.",
            "Summaries, impact ratings and locations come from AI and can be wrong. Check the linked source.",
          ],
        },
        {
          title: "Impact ratings",
          body: [
            "Each Truth Social post is rated high, medium or low by its real-world effect, not its tone.",
            "High is a concrete action or a statement that moves markets or foreign relations now, such as a tariff with terms or a firing. Medium is a credible sign of coming action or real policy comment. Low covers campaign posts, praise, attacks and reposts.",
          ],
        },
        {
          title: "Travel map",
          body: [
            "A flight is a move of more than 80 km between arrivals. Stops within 80 km count as one place, so Joint Base Andrews is Washington.",
            "A night is the place of the last event that day, Eastern time, carried forward over days with no events. The map covers the last 365 nights.",
          ],
        },
      ]}
      corrections={
        <>
          Found an error? <a href={`${REPO}/issues`}>Open an issue on GitHub</a>.
        </>
      }
    />
  );
}
