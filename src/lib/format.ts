export const SOURCE_LABEL: Record<string, string> = {
  GOOGLE: "Google",
  YELP: "Yelp",
  OPENTABLE: "OpenTable",
  TRIPADVISOR: "TripAdvisor",
};

export const PLATFORM_LABEL: Record<string, string> = {
  X: "X",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export const PLATFORM_EMOJI: Record<string, string> = {
  X: "𝕏",
  INSTAGRAM: "📷",
  TIKTOK: "🎵",
};

export function priceTierLabel(tier: number): string {
  return "$".repeat(Math.max(1, Math.min(4, tier)));
}

export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatRelativeDate(date: Date): string {
  const days = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}
