import Link from "next/link";
import { notFound } from "next/navigation";
import { getDish } from "@/lib/data";
import { SOURCE_LABEL, PLATFORM_LABEL, PLATFORM_EMOJI, formatCompactNumber, formatRelativeDate } from "@/lib/format";
import ScoreBadge from "@/components/ScoreBadge";
import Stars from "@/components/Stars";

const SENTIMENT_STYLE: Record<string, string> = {
  POSITIVE: "bg-emerald-100 text-emerald-700",
  NEUTRAL: "bg-stone-100 text-stone-600",
  NEGATIVE: "bg-red-100 text-red-700",
};

export default async function DishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dish = await getDish(id);
  if (!dish) notFound();

  const { score } = dish;
  const sortedReviews = [...dish.reviews].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  const sortedMentions = [...dish.mentions].sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <Link href={`/restaurant/${dish.restaurant.id}`} className="text-sm text-muted hover:text-accent-dark">
        ← {dish.restaurant.name}
      </Link>

      <div className="mt-3 flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-card border border-border text-4xl">
          {dish.imageUrl}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{dish.name}</h1>
          <p className="mt-1 text-muted">{dish.description}</p>
          <p className="mt-1 text-sm text-muted">
            {dish.category} · ${dish.price.toFixed(2)}
          </p>
        </div>
        <ScoreBadge score={score.overall} size="lg" />
      </div>

      {/* Score breakdown */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Review score</h2>
            <span className="text-sm font-medium text-muted">{Math.round(score.reviews.score100)}/100</span>
          </div>
          {score.reviews.count > 0 ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <Stars rating={score.reviews.bayesianAverage} />
                <span className="text-sm text-muted">
                  {score.reviews.bayesianAverage.toFixed(1)} · {score.reviews.count} reviews
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Recency-weighted average is {score.reviews.weightedAverage.toFixed(2)}, shrunk toward the
                site-wide average to avoid a handful of reviews swinging the score.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(score.reviews.bySource).map(([source, s]) => (
                  <li key={source} className="flex justify-between text-muted">
                    <span>{SOURCE_LABEL[source] ?? source}</span>
                    <span>
                      {s.average.toFixed(1)}★ ({s.count})
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">No reviews yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Social buzz score</h2>
            <span className="text-sm font-medium text-muted">{Math.round(score.buzz.score100)}/100</span>
          </div>
          {score.buzz.count > 0 ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm">
                  {score.buzz.count} mentions · {formatCompactNumber(score.buzz.totalEngagement)} total engagement
                </span>
                {score.buzz.trending && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-accent-dark">
                    🔥 Trending
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                Buzz is weighted toward recent posts and positive sentiment, and scaled on a log
                curve so one viral post doesn&apos;t dominate the whole dataset.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {Object.entries(score.buzz.byPlatform).map(([platform, s]) => (
                  <li key={platform} className="flex justify-between text-muted">
                    <span>
                      {PLATFORM_EMOJI[platform]} {PLATFORM_LABEL[platform] ?? platform}
                    </span>
                    <span>
                      {formatCompactNumber(s.engagement)} eng. ({s.count})
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">No social buzz yet.</p>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Reviews ({sortedReviews.length})</h2>
        <div className="space-y-3">
          {sortedReviews.slice(0, 12).map((review) => (
            <div key={review.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="font-medium text-sm">{review.authorName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="rounded bg-background px-1.5 py-0.5 border border-border">
                    {SOURCE_LABEL[review.source] ?? review.source}
                  </span>
                  <span>{formatRelativeDate(review.publishedAt)}</span>
                </div>
              </div>
              <p className="mt-2 text-sm">{review.text}</p>
            </div>
          ))}
          {sortedReviews.length === 0 && <p className="text-sm text-muted">No reviews yet.</p>}
        </div>
      </section>

      {/* Social mentions */}
      <section className="mt-10 mb-12">
        <h2 className="text-lg font-semibold mb-3">Social mentions ({sortedMentions.length})</h2>
        <div className="space-y-3">
          {sortedMentions.slice(0, 12).map((mention) => (
            <div key={mention.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{PLATFORM_EMOJI[mention.platform]}</span>
                  <span className="font-medium text-sm">{mention.authorHandle}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SENTIMENT_STYLE[mention.sentiment]}`}>
                    {mention.sentiment.toLowerCase()}
                  </span>
                </div>
                <span className="text-xs text-muted">{formatRelativeDate(mention.postedAt)}</span>
              </div>
              <p className="mt-2 text-sm">{mention.caption}</p>
              <div className="mt-2 flex gap-4 text-xs text-muted">
                <span>❤️ {formatCompactNumber(mention.likeCount)}</span>
                <span>💬 {formatCompactNumber(mention.commentCount)}</span>
                <span>↗️ {formatCompactNumber(mention.shareCount)}</span>
                <span>👁️ {formatCompactNumber(mention.viewCount)}</span>
              </div>
            </div>
          ))}
          {sortedMentions.length === 0 && <p className="text-sm text-muted">No social buzz yet.</p>}
        </div>
      </section>
    </div>
  );
}
