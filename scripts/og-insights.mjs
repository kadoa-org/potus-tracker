// Link previews for the insight pages, built from the same data the pages use, with the shared layout in og-insight.mjs.
// Vercel builds have no Chrome, so run `npm run og` locally and commit public/og/<slug>.png. The travel numbers change
// daily: each run is a snapshot of the past year as the schedule stood when it ran.
import { join, resolve } from 'node:path';
import { renderOgImages } from './og-insight.mjs';
import { INSIGHTS } from '../src/lib/insights.js';
import { nightsByCategory } from '../src/lib/travel.js';
import { loadTravel } from '../src/lib/travelData.js';
import trades from '../src/data/trump-trades.json' with { type: 'json' };

const out = (slug) => join(resolve(import.meta.dirname, '..'), 'public/og', `${slug}.png`);
const title = (slug) => INSIGHTS.find((i) => i.slug === slug).title;
const fmt = (n) => n.toLocaleString('en-US');
// The pages' own colours: C in TradeCharts.jsx, RECENT_BLUE in TravelGlobe.jsx and COLORS in travelColors.js.
const TRUMP = '#0072B2', CONGRESS = '#505a5f', FLIGHT = '#1d70b8', MARALAGO = '#e2560f';
const images = [];

const t = trades.totals;
images.push({
  out: out('trump-trades'), title: title('trump-trades'), source: 'OGE, House and Senate disclosures, Truth Social',
  key: "Disclosed trades, January 2025 to August 2026. His accounts' trades before his posts match random dates.",
  figures: [
    { value: fmt(t.trump), label: `Trump's ${t.accounts} accounts`, colour: TRUMP },
    { value: fmt(t.congress), label: `${t.members} members of Congress`, colour: CONGRESS },
  ],
});

const travel = await loadTravel();
const nights = nightsByCategory(travel);
const owned = nights.maralago + nights.bedminster + nights.property;
images.push({
  out: out('travel-map'), title: title('travel-map'), source: 'Factbase public schedule',
  key: `The past year: ${fmt(Math.round(travel.totalKm / 1.609))} miles flown and ${travel.calendar.length} nights.`,
  figures: [
    { value: fmt(travel.flights.length), label: 'Flights', colour: FLIGHT },
    { value: fmt(nights.washington), label: 'Nights in Washington' },
    { value: fmt(owned), label: 'Nights at his properties', colour: MARALAGO },
  ],
});

renderOgImages({ name: 'POTUS Tracker', url: 'kadoa.com/potus' }, images);
