import type { Review, SocialMention } from "@/generated/prisma/client";

/**
 * Turns raw reviews + social mentions into a single 0-100 recommendation
 * score, plus a breakdown so the UI can explain *why* a dish scored the
 * way it did.
 */

const GLOBAL_AVERAGE_RATING = 4.0; // prior used by the Bayesian adjustment
const MIN_VOTES_PRIOR = 8; // how many "average" reviews a new dish is assumed to carry
const REVIEW_HALF_LIFE_DAYS = 180; // a review from 6 months ago carries half the weight of a new one
const BUZZ_HALF_LIFE_DAYS = 30; // social buzz decays much faster than reviews
const VIRAL_ENGAGEMENT_CAP = 250_000; // weighted engagement treated as "maximally viral" for normalization
const REVIEW_WEIGHT = 0.65;
const BUZZ_WEIGHT = 0.35;

const SENTIMENT_MULTIPLIER: Record<SocialMention["sentiment"], number> = {
  POSITIVE: 1.15,
  NEUTRAL: 1.0,
  NEGATIVE: 0.7,
};

function recencyWeight(date: Date, halfLifeDays: number, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return Math.pow(0.5, ageDays / halfLifeDays);
}

export interface ReviewBreakdown {
  score100: number; // 0-100
  weightedAverage: number; // 0-5, recency-weighted, pre-Bayesian
  bayesianAverage: number; // 0-5, after shrinking toward the global average
  count: number;
  bySource: Record<string, { count: number; average: number }>;
}

export interface BuzzBreakdown {
  score100: number; // 0-100
  count: number;
  totalEngagement: number;
  weightedEngagement: number;
  byPlatform: Record<string, { count: number; engagement: number }>;
  trending: boolean; // meaningful buzz in the last 14 days
}

export interface DishScore {
  overall: number; // 0-100
  reviews: ReviewBreakdown;
  buzz: BuzzBreakdown;
}

export function scoreReviews(reviews: Review[], now: Date = new Date()): ReviewBreakdown {
  const bySource: Record<string, { count: number; average: number }> = {};
  for (const r of reviews) {
    const bucket = (bySource[r.source] ??= { count: 0, average: 0 });
    bucket.average = (bucket.average * bucket.count + r.rating) / (bucket.count + 1);
    bucket.count += 1;
  }

  if (reviews.length === 0) {
    return { score100: 0, weightedAverage: 0, bayesianAverage: GLOBAL_AVERAGE_RATING, count: 0, bySource };
  }

  let weightSum = 0;
  let weightedRatingSum = 0;
  for (const r of reviews) {
    const w = recencyWeight(r.publishedAt, REVIEW_HALF_LIFE_DAYS, now);
    weightSum += w;
    weightedRatingSum += w * r.rating;
  }
  const weightedAverage = weightedRatingSum / weightSum;

  // Bayesian shrinkage: dishes with few (or only very recent) reviews get
  // pulled toward the global average instead of swinging on 1-2 ratings.
  const bayesianAverage =
    (weightSum / (weightSum + MIN_VOTES_PRIOR)) * weightedAverage +
    (MIN_VOTES_PRIOR / (weightSum + MIN_VOTES_PRIOR)) * GLOBAL_AVERAGE_RATING;

  return {
    score100: (bayesianAverage / 5) * 100,
    weightedAverage,
    bayesianAverage,
    count: reviews.length,
    bySource,
  };
}

export function scoreBuzz(mentions: SocialMention[], now: Date = new Date()): BuzzBreakdown {
  const byPlatform: Record<string, { count: number; engagement: number }> = {};
  let totalEngagement = 0;
  let weightedEngagement = 0;
  let recentCount = 0;

  for (const m of mentions) {
    const engagement = m.likeCount + m.commentCount * 2 + m.shareCount * 3 + m.viewCount * 0.05;
    totalEngagement += engagement;

    const bucket = (byPlatform[m.platform] ??= { count: 0, engagement: 0 });
    bucket.count += 1;
    bucket.engagement += engagement;

    const w = recencyWeight(m.postedAt, BUZZ_HALF_LIFE_DAYS, now);
    weightedEngagement += engagement * w * SENTIMENT_MULTIPLIER[m.sentiment];

    if (recencyWeight(m.postedAt, 14, now) > 0.5) recentCount += 1;
  }

  // Log-scale against a fixed "viral" ceiling so the score doesn't drift
  // as more dishes are added to the dataset over time.
  const score100 =
    mentions.length === 0
      ? 0
      : (Math.log10(1 + weightedEngagement) / Math.log10(1 + VIRAL_ENGAGEMENT_CAP)) * 100;

  return {
    score100: Math.min(100, score100),
    count: mentions.length,
    totalEngagement: Math.round(totalEngagement),
    weightedEngagement: Math.round(weightedEngagement),
    byPlatform,
    trending: recentCount >= 3,
  };
}

export function scoreDish(reviews: Review[], mentions: SocialMention[], now: Date = new Date()): DishScore {
  const reviewBreakdown = scoreReviews(reviews, now);
  const buzzBreakdown = scoreBuzz(mentions, now);

  // If one signal is missing entirely, don't let it drag the score down —
  // renormalize the weights across whichever signals actually have data.
  const hasReviews = reviewBreakdown.count > 0;
  const hasBuzz = buzzBreakdown.count > 0;
  let overall: number;
  if (hasReviews && hasBuzz) {
    overall = REVIEW_WEIGHT * reviewBreakdown.score100 + BUZZ_WEIGHT * buzzBreakdown.score100;
  } else if (hasReviews) {
    overall = reviewBreakdown.score100;
  } else if (hasBuzz) {
    overall = buzzBreakdown.score100;
  } else {
    overall = 0;
  }

  return { overall: Math.round(overall * 10) / 10, reviews: reviewBreakdown, buzz: buzzBreakdown };
}
