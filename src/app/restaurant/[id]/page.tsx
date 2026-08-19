import { notFound } from "next/navigation";
import { getRestaurant } from "@/lib/data";
import { priceTierLabel } from "@/lib/format";
import DishCard from "@/components/DishCard";

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
        </div>
      </div>

      <h2 className="mt-8 mb-4 text-lg font-semibold">Dishes, ranked</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {restaurant.dishes.map((dish) => (
          <DishCard key={dish.id} dish={{ ...dish, restaurant }} />
        ))}
      </div>
    </div>
  );
}
