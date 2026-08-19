import { getFilterOptions, getTopDishes } from "@/lib/data";
import DishCard from "@/components/DishCard";
import FilterBar from "@/components/FilterBar";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ cuisine?: string; city?: string }>;
}) {
  const params = await searchParams;
  const [dishes, filterOptions] = await Promise.all([
    getTopDishes({ cuisine: params.cuisine, city: params.city }),
    getFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Today&apos;s top dishes</h1>
        <p className="mt-1 text-muted">
          Ranked by a blend of critic reviews and social media buzz — see the full breakdown on
          any dish.
        </p>
      </div>

      <FilterBar cuisines={filterOptions.cuisines} cities={filterOptions.cities} />

      {dishes.length === 0 ? (
        <p className="mt-10 text-muted">No dishes match those filters.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
    </div>
  );
}
