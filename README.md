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
- **Real restaurant data via Google Places** (opt-in, per restaurant) —
  real rating, review count, and actual review text, shown in its own
  section on the restaurant page. See [Real data](#real-data-google-places) below.

## Stack

- **Next.js 16** (App Router, Server Components) + TypeScript + Tailwind CSS
- **Prisma 7** + **Postgres** (via the `@prisma/adapter-pg` driver adapter)
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

Needs a Postgres database. Easiest local option is Docker:

```bash
docker compose up -d       # starts Postgres on localhost:5432
cp .env.example .env       # DATABASE_URL already matches docker-compose.yml
npm install                # also runs `prisma generate` via postinstall
npx prisma migrate deploy  # applies the schema
npm run db:seed            # populates it with mock restaurants/dishes/reviews
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No Docker? Point `DATABASE_URL` in `.env` at any Postgres instance
(a local install, or a free hosted one — see [Deploying](#deploying) below)
and skip the `docker compose` step.

`.env.example`'s `AUTH_SECRET` is a placeholder — generate your own with
`openssl rand -base64 32` for anything beyond a throwaway local run.

### Database

To wipe and reseed from scratch at any point:

```bash
npm run db:reset   # drops, recreates, and reseeds the database
```

Seed data lives in `prisma/seed.ts` — 6 restaurants across different
cuisines/cities, ~4 dishes each, with varied review/buzz profiles (viral
favorites, hidden gems, overhyped-but-mediocre dishes, quiet classics with
no social presence, etc.) so the scoring differences are visible.

## Deploying

Built for Vercel + any hosted Postgres (Vercel Postgres/Neon, plain Neon,
Supabase, etc.) — `pg`/`@prisma/adapter-pg` work over a normal TCP
connection, no native bindings, so there's nothing serverless-unfriendly
in the dependency tree.

1. **Get a Postgres database.** Easiest: in the Vercel dashboard, open your
   project → **Storage** → **Create Database** → Postgres (this provisions
   a Neon database and wires `DATABASE_URL` into your project automatically).
   Or create one directly at [neon.tech](https://neon.tech) or
   [supabase.com](https://supabase.com) and copy its connection string.
2. **Import the repo on Vercel**: [vercel.com/new](https://vercel.com/new),
   pick this GitHub repo/branch. Vercel auto-detects Next.js.
3. **Set environment variables** (Project Settings → Environment Variables):
   - `DATABASE_URL` — from step 1 (skip if you used Vercel's own Postgres,
     it's set automatically)
   - `AUTH_SECRET` — a real secret (`openssl rand -base64 32`), not the
     `.env.example` placeholder
   - `GOOGLE_PLACES_API_KEY` — optional, only needed for `google:lookup`
4. **Deploy.** Vercel automatically uses the `vercel-build` script
   (`prisma migrate deploy && next build`) instead of `build` when it's
   present in `package.json`, so migrations apply on every deploy — no
   separate migration step needed.
5. **Seed it** (optional, once): run `npm run db:seed` locally with
   `DATABASE_URL` pointed at the production database, or connect via the
   Vercel/Neon dashboard's SQL console. There's no seed button in the UI —
   this is a deliberate one-time CLI step, not something that should run
   automatically on every deploy.

## Real data: Google Places

Google Places (the "New" Places API) can only give real **restaurant**-level
data — rating, review count, real review text, price level. It has no menu
endpoint, so it can't tell you what dishes a restaurant serves or how those
specific dishes are reviewed. That gap is architectural, not a shortcut: to
keep this honest, real Google data lives in its own `RestaurantReview` model
and its own section on the restaurant page ("What Google reviewers say"),
completely separate from the per-dish `Review`/scoring system, which stays
mock-generated until a dish-level extraction pass exists (see below).

To try it:

1. Get a key at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   with **Places API (New)** enabled on the project, and set
   `GOOGLE_PLACES_API_KEY` in `.env`.
2. Preview a match with no DB writes:
   ```bash
   npm run google:lookup -- --query "Katz's Delicatessen, New York, NY"
   ```
3. Sync it onto one of our (fictional) seeded restaurants — note this will
   usually find nothing or the wrong place, since the seed restaurants
   aren't real; this is mainly useful once you're pointing it at a
   restaurant that's actually in the catalog *because* it's real:
   ```bash
   npm run google:lookup -- --query "..." --restaurant-id <id>
   ```

This has been built and typechecked/linted/build-verified, but **not yet
run against the live API** — it needs a real key, which wasn't provided in
this session.

## Project structure

```
docker-compose.yml           Local Postgres for development
prisma/schema.prisma        Restaurant / Dish / Review / SocialMention / User / Favorite / RestaurantReview models
prisma/seed.ts               Mock data generator
scripts/google-places-sync.ts Google Places lookup/sync CLI
src/lib/googlePlaces.ts       Places API (New) client
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

- **Google Places is wired up** (see above) for real restaurant-level
  rating/review data; Yelp Fusion would be the next source in the same
  restaurant-level shape.
- **Dish-level extraction** is the real gap: matching review text to a
  specific menu item needs its own pass (e.g. an LLM classifier over
  review text), since Google/Yelp reviews are per-restaurant, not
  per-dish. Until that exists, per-dish scoring stays mock-generated even
  for restaurants with real Google data attached.
- **Social buzz** is the hardest to source legally: X/Instagram/TikTok
  don't offer public APIs for this use case, so real integration likely
  means either a licensed data partner (e.g. Nosto, Trendspottr-style
  vendors) or manual curation, not scraping.
