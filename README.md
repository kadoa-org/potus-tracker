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

Next.js 15 (App Router), React 19, Tailwind, Leaflet. The app is a thin read layer: its API routes serve data from a Supabase project, so it needs the two `NEXT_PUBLIC_SUPABASE_*` values in `.env.local` (see `.env.example`).

## Data pipeline

This repo is display-only. The feed, news, schedule, and sentiment/summary data are aggregated by a separate service that writes to Supabase:

- **Truth Social** — Trump's Truth RSS, with Gemini sentiment + topic extraction
- **White House news** — collected via [kadoa.com](https://kadoa.com), with AI summaries
- **Schedule** — FactBase calendar, geocoded to lat/lng

That aggregator lives in the Kadoa backend (`services/custom/datasets/potus`) and runs on a schedule. Want structured feeds like this for your own use case? [Get in touch](https://www.kadoa.com/contact/sales).

## License

MIT. Data sourced from public feeds (Truth Social, White House, FactBase).
