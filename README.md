# Forkcast

A dish rating & recommendation app: it ranks individual dishes (not just
restaurants) by blending critic reviews (Google, Yelp, OpenTable,
TripAdvisor) with social media buzz (X, Instagram, TikTok).

This MVP runs on **seeded mock data** so the full product — schema, scoring
engine, and UI — can be built and demoed without needing paid/rate-limited
review APIs or social platform access (most social platforms don't offer
public APIs for this use case). Swapping in real data sources later only
touches the seed/ingestion layer; the scoring engine and UI already consume
the same `Review` / `SocialMention` shapes real APIs would produce.

## Features

- **Ranked home feed**, filterable by cuisine/city, plus category chips
  ("Best desserts", "Best entrees", …) at `/category/[category]`
- **Search** across dish name/description/category and restaurant
  name/cuisine/city at `/search?q=`
- **Accounts** (email + password via NextAuth/Auth.js credentials) and
  **favorites** — save any dish with the ♡ and view them at `/favorites`

## Stack

- **Next.js 16** (App Router, Server Components) + TypeScript + Tailwind CSS
- **Prisma 7** + SQLite (via the `better-sqlite3` driver adapter) for local data
- **Auth.js (next-auth v5)** with a Credentials provider + JWT sessions

## How scoring works (`src/lib/scoring.ts`)

Each dish gets a single 0-100 score from two components, combined ~65/35:

- **Review score** — a Bayesian-shrunk, recency-weighted average rating
  (like IMDB's weighted rating), so a dish with 2 five-star reviews doesn't
  outrank one with 200 reviews averaging 4.6.
- **Buzz score** — social engagement (likes/comments/shares/views) weighted
  by recency (30-day half-life) and sentiment, then log-scaled against a
  fixed "viral" ceiling so one blown-up post doesn't dominate.

If a dish has data for only one signal, the score uses that signal alone
instead of being dragged down by a missing one. The dish detail page shows
the full breakdown (per-source review averages, per-platform buzz, whether
it's currently "trending").

## Getting started

```bash
npm install               # also runs `prisma generate` via postinstall
npx prisma migrate deploy # creates dev.db and applies the schema
npm run db:seed           # populates it with mock restaurants/dishes/reviews
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`.env` (gitignored) already has a generated `AUTH_SECRET` for local dev.
For any real deployment, copy `.env.example` to `.env` and replace it with
your own secret (e.g. `openssl rand -base64 32`).

### Database

To wipe and reseed from scratch at any point:

```bash
npm run db:reset   # drops, recreates, and reseeds dev.db
```

Seed data lives in `prisma/seed.ts` — 6 restaurants across different
cuisines/cities, ~4 dishes each, with varied review/buzz profiles (viral
favorites, hidden gems, overhyped-but-mediocre dishes, quiet classics with
no social presence, etc.) so the scoring differences are visible.

## Project structure

```
prisma/schema.prisma        Restaurant / Dish / Review / SocialMention / User / Favorite models
prisma/seed.ts               Mock data generator
src/auth.ts                  Auth.js config (Credentials provider, JWT sessions)
src/lib/scoring.ts            The scoring engine
src/lib/data.ts               Server-side data access (queries + score attach)
src/lib/actions/              Server actions (auth, favorites)
src/app/page.tsx              Home — top dishes, filterable by cuisine/city
src/app/category/[category]   Category browsing ("Best desserts", etc.)
src/app/search                Search results
src/app/restaurant/[id]       Restaurant detail — its dishes ranked
src/app/dish/[id]             Dish detail — score breakdown, reviews, mentions
src/app/login, /signup        Auth pages
src/app/favorites             Saved dishes (requires login)
```

## Next steps toward real data

- Google Places / Yelp Fusion have official APIs with free dev tiers and
  are the most realistic near-term source for review data.
- Dish-level extraction (matching a review's text to a specific menu item)
  needs its own pass — e.g. an LLM classifier over review text — since
  Google/Yelp reviews are per-restaurant, not per-dish.
- Social buzz is the hardest to source legally: X/Instagram/TikTok don't
  offer public APIs for this use case, so real integration likely means
  either a licensed data partner (e.g. Nosto, Trendspottr-style vendors)
  or manual curation, not scraping.
