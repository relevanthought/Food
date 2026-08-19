/**
 * Thin client for the Places API (New): https://developers.google.com/maps/documentation/places/web-service
 *
 * Only covers what this app needs: finding a real restaurant by name/address
 * (Text Search) and pulling its rating, review count, and up to 5 real
 * reviews (Place Details). Places has no menu/dish endpoint — dish-level
 * data isn't available from this or any other review platform's public API.
 */

const BASE_URL = "https://places.googleapis.com/v1";

export class GooglePlacesError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GooglePlacesError";
  }
}

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new GooglePlacesError(
      "GOOGLE_PLACES_API_KEY is not set. Get a key at https://console.cloud.google.com/apis/credentials " +
        "with the Places API (New) enabled, then add it to .env.",
    );
  }
  return key;
}

async function placesFetch(path: string, fieldMask: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getApiKey(),
      "X-Goog-FieldMask": fieldMask,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GooglePlacesError(`Places API request failed (${res.status}): ${body}`, res.status);
  }

  return res.json();
}

export interface PlaceSummary {
  id: string;
  name: string;
  formattedAddress: string;
}

/** Text Search — finds the best-matching real place for a free-text query like "Luigi's Trattoria, Boston MA". */
export async function searchPlace(query: string): Promise<PlaceSummary | null> {
  const data = await placesFetch("/places:searchText", "places.id,places.displayName,places.formattedAddress", {
    method: "POST",
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });

  const place = data.places?.[0];
  if (!place) return null;

  return {
    id: place.id,
    name: place.displayName?.text ?? query,
    formattedAddress: place.formattedAddress ?? "",
  };
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishedAt: Date;
}

export interface PlaceDetails {
  id: string;
  name: string;
  formattedAddress: string;
  googleMapsUri: string | null;
  rating: number | null;
  userRatingCount: number | null;
  priceTier: number | null; // mapped to this app's 1-4 scale
  reviews: PlaceReview[];
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/** Place Details — rating, review count, price level, and up to 5 of Google's "most relevant" reviews. */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "googleMapsUri",
    "rating",
    "userRatingCount",
    "priceLevel",
    "reviews",
  ].join(",");

  const data = await placesFetch(`/places/${placeId}`, fieldMask);

  const reviews: PlaceReview[] = (data.reviews ?? []).map(
    (r: {
      authorAttribution?: { displayName?: string };
      rating?: number;
      text?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
    }) => ({
      authorName: r.authorAttribution?.displayName ?? "Google user",
      rating: r.rating ?? 0,
      text: r.text?.text ?? "",
      relativeTime: r.relativePublishTimeDescription ?? "",
      publishedAt: r.publishTime ? new Date(r.publishTime) : new Date(),
    }),
  );

  return {
    id: data.id,
    name: data.displayName?.text ?? "",
    formattedAddress: data.formattedAddress ?? "",
    googleMapsUri: data.googleMapsUri ?? null,
    rating: data.rating ?? null,
    userRatingCount: data.userRatingCount ?? null,
    priceTier: data.priceLevel ? (PRICE_LEVEL_MAP[data.priceLevel] ?? null) : null,
    reviews,
  };
}
