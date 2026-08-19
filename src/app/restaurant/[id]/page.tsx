import { notFound } from "next/navigation";
import { getRestaurant } from "@/lib/data";
import { priceTierLabel, formatCompactNumber, formatRelativeDate } from "@/lib/format";
import DishCard from "@/components/DishCard";
import Stars from "@/components/Stars";

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  if (!restaurant) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-card border border-border text-4xl">
          {restaurant.imageUrl}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
          <p className="mt-1 text-muted">
            {restaurant.cuisine} · {restaurant.city} · {priceTierLabel(restaurant.priceTier)}
          </p>
          <p className="text-sm text-muted">{restaurant.address}</p>
          {restaurant.googlePlaceId && restaurant.googleRating != null && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
                <Stars rating={restaurant.googleRating} />
                <span className="font-medium">{restaurant.googleRating.toFixed(1)}</span>
                <span className="text-muted">
                  on Google ({formatCompactNumber(restaurant.googleUserRatingCount ?? 0)})
                </span>
              </span>
              {restaurant.googleMapsUri && (
                <a
                  href={restaurant.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-dark hover:underline"
                >
                  View on Google Maps ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-8 mb-4 text-lg font-semibold">Dishes, ranked</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {restaurant.dishes.map((dish) => (
          <DishCard key={dish.id} dish={{ ...dish, restaurant }} />
        ))}
      </div>

      {restaurant.googleReviews.length > 0 && (
        <section className="mt-10 mb-12">
          <h2 className="text-lg font-semibold mb-1">What Google reviewers say</h2>
          <p className="text-sm text-muted mb-4">
            Real reviews of the restaurant as a whole, via the Google Places API — not tied to a
            specific dish (Google doesn&apos;t expose per-dish review data).
          </p>
          <div className="space-y-3">
            {restaurant.googleReviews.map((review) => (
              <div key={review.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stars rating={review.rating} />
                    <span className="font-medium text-sm">{review.authorName}</span>
                  </div>
                  <span className="text-xs text-muted">
                    {review.relativeTime || formatRelativeDate(review.publishedAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{review.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
