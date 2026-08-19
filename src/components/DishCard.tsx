import Link from "next/link";
import type { DishWithScore } from "@/lib/data";
import ScoreBadge from "@/components/ScoreBadge";
import Stars from "@/components/Stars";

export default function DishCard({ dish }: { dish: DishWithScore }) {
  return (
    <Link
      href={`/dish/${dish.id}`}
      className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-accent hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-background text-3xl">
        {dish.imageUrl}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight truncate group-hover:text-accent-dark">{dish.name}</h3>
            <p className="text-sm text-muted truncate">{dish.restaurant.name} · {dish.restaurant.city}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm">
          {dish.score.reviews.count > 0 ? (
            <span className="flex items-center gap-1">
              <Stars rating={dish.score.reviews.bayesianAverage} />
              <span className="text-muted">({dish.score.reviews.count})</span>
            </span>
          ) : (
            <span className="text-muted">No reviews yet</span>
          )}
          {dish.score.buzz.trending && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-accent-dark">
              🔥 Trending
            </span>
          )}
        </div>
      </div>
      <ScoreBadge score={dish.score.overall} size="sm" />
    </Link>
  );
}
