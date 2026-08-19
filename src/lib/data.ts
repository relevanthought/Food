import { db } from "@/lib/db";
import { scoreDish, type DishScore } from "@/lib/scoring";
import type { Dish, Restaurant, Review, SocialMention } from "@/generated/prisma/client";

export type DishWithScore = Dish & {
  restaurant: Restaurant;
  reviews: Review[];
  mentions: SocialMention[];
  score: DishScore;
};

const dishInclude = {
  restaurant: true,
  reviews: true,
  mentions: true,
} as const;

function withScore<T extends { reviews: Review[]; mentions: SocialMention[] }>(dish: T): T & { score: DishScore } {
  return { ...dish, score: scoreDish(dish.reviews, dish.mentions) };
}

export interface DishFilters {
  cuisine?: string;
  city?: string;
}

export async function getTopDishes(filters: DishFilters = {}, limit = 50): Promise<DishWithScore[]> {
  const dishes = await db.dish.findMany({
    where: {
      restaurant: {
        ...(filters.cuisine ? { cuisine: filters.cuisine } : {}),
        ...(filters.city ? { city: filters.city } : {}),
      },
    },
    include: dishInclude,
  });

  return dishes
    .map(withScore)
    .sort((a, b) => b.score.overall - a.score.overall)
    .slice(0, limit);
}

export async function getFilterOptions(): Promise<{ cuisines: string[]; cities: string[] }> {
  const restaurants = await db.restaurant.findMany({ select: { cuisine: true, city: true } });
  return {
    cuisines: [...new Set(restaurants.map((r) => r.cuisine))].sort(),
    cities: [...new Set(restaurants.map((r) => r.city))].sort(),
  };
}

export async function getRestaurant(id: string) {
  const restaurant = await db.restaurant.findUnique({
    where: { id },
    include: { dishes: { include: dishInclude } },
  });
  if (!restaurant) return null;

  const dishes = restaurant.dishes.map(withScore).sort((a, b) => b.score.overall - a.score.overall);
  return { ...restaurant, dishes };
}

export async function getDish(id: string): Promise<DishWithScore | null> {
  const dish = await db.dish.findUnique({ where: { id }, include: dishInclude });
  if (!dish) return null;
  return withScore(dish);
}

export async function getAllDishIds(): Promise<string[]> {
  const dishes = await db.dish.findMany({ select: { id: true } });
  return dishes.map((d) => d.id);
}

export async function getAllRestaurantIds(): Promise<string[]> {
  const restaurants = await db.restaurant.findMany({ select: { id: true } });
  return restaurants.map((r) => r.id);
}
