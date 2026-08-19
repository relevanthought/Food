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
