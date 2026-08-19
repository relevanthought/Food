import { searchDishes } from "@/lib/data";
import DishCard from "@/components/DishCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const dishes = q ? await searchDishes(q) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight">
        {q ? (
          <>
            Results for <span className="text-accent-dark">&ldquo;{q}&rdquo;</span>
          </>
        ) : (
          "Search"
        )}
      </h1>
      <p className="mt-1 text-muted">
        {q ? `${dishes.length} dish${dishes.length === 1 ? "" : "es"} found` : "Search by dish, restaurant, cuisine, or city."}
      </p>

      {q && dishes.length === 0 ? (
        <p className="mt-10 text-muted">No dishes match &ldquo;{q}&rdquo;.</p>
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
