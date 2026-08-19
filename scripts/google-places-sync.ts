/**
 * Look up a real restaurant on Google Places and, optionally, sync its
 * real rating/review-count/reviews onto an existing Restaurant row.
 *
 * Usage:
 *   npm run google:lookup -- --query "Katz's Delicatessen, New York, NY"
 *   npm run google:lookup -- --query "Katz's Delicatessen, New York, NY" --restaurant-id <id>
 *
 * Without --restaurant-id this only prints what it found (no DB writes) —
 * useful for confirming GOOGLE_PLACES_API_KEY works and previewing a match
 * before deciding which (if any) of our restaurants it corresponds to.
 */
import { db } from "../src/lib/db";
import { searchPlace, getPlaceDetails, GooglePlacesError } from "../src/lib/googlePlaces";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = value;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const query = args.query;
  if (!query) {
    console.error('Usage: npm run google:lookup -- --query "Restaurant Name, City, State" [--restaurant-id <id>]');
    process.exit(1);
  }

  console.log(`Searching Google Places for: "${query}"`);
  const found = await searchPlace(query);
  if (!found) {
    console.log("No match found.");
    return;
  }
  console.log(`Matched: ${found.name} — ${found.formattedAddress} (${found.id})`);

  const details = await getPlaceDetails(found.id);
  console.log(`Rating: ${details.rating} (${details.userRatingCount} reviews) · Price tier: ${details.priceTier ?? "unknown"}`);
  console.log(`Fetched ${details.reviews.length} reviews:`);
  for (const r of details.reviews) {
    console.log(`  ${r.rating}★ ${r.authorName} (${r.relativeTime}): ${r.text.slice(0, 80)}${r.text.length > 80 ? "…" : ""}`);
  }

  if (!args["restaurant-id"]) {
    console.log("\nNo --restaurant-id given — dry run only, nothing written to the database.");
    return;
  }

  const restaurant = await db.restaurant.findUnique({ where: { id: args["restaurant-id"] } });
  if (!restaurant) {
    console.error(`No restaurant with id ${args["restaurant-id"]} in the database.`);
    process.exit(1);
  }

  await db.restaurantReview.deleteMany({ where: { restaurantId: restaurant.id } });
  await db.restaurant.update({
    where: { id: restaurant.id },
    data: {
      googlePlaceId: details.id,
      googleMapsUri: details.googleMapsUri,
      googleRating: details.rating,
      googleUserRatingCount: details.userRatingCount,
      googleSyncedAt: new Date(),
      googleReviews: {
        create: details.reviews.map((r) => ({
          authorName: r.authorName,
          rating: r.rating,
          text: r.text,
          relativeTime: r.relativeTime,
          publishedAt: r.publishedAt,
        })),
      },
    },
  });

  console.log(`\nSynced real Google data onto "${restaurant.name}" (${restaurant.id}).`);
}

main()
  .catch((err) => {
    if (err instanceof GooglePlacesError) {
      console.error(`Google Places error: ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
