# POTUS Tracker

Live tracker of the US President's public activity: a combined feed of Truth Social posts (with sentiment and topics), White House news (with AI summaries), and the daily schedule with a map of the President's latest known location.

**Live:** https://www.kadoa.com/potus

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

Open http://localhost:3000/potus.

## Stack

Next.js 15 (App Router), React 19, Tailwind, Leaflet. The app is a thin read layer: its API routes serve data from a Supabase project (server-side only — the browser never touches Supabase), so it needs the two `SUPABASE_*` values in `.env.local` (see `.env.example`).

## Data pipeline

This repo is display-only. All of the data — the feed, news, schedule, and sentiment/summary — is collected and normalized with [kadoa.com](https://kadoa.com) and written to Supabase by a separate aggregator service:

- **Truth Social** — Trump's Truth posts, with sentiment + topic extraction
- **White House news** — with AI summaries
- **Schedule** — geocoded to lat/lng for the President's latest location

That aggregator lives in the Kadoa backend (`services/custom/datasets/potus`) and runs on a schedule. Want structured feeds like this for your own use case? [Get in touch](https://www.kadoa.com/contact/sales).

## License

MIT. Data collected via [Kadoa](https://kadoa.com) from public sources.
