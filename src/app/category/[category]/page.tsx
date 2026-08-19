import { notFound } from "next/navigation";
import { getTopDishes, getCategories } from "@/lib/data";
import DishCard from "@/components/DishCard";

const CATEGORY_TITLE: Record<string, string> = {
  Appetizer: "Best appetizers",
  Entree: "Best entrees",
  Dessert: "Best desserts",
  Drink: "Best drinks",
};

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: raw } = await params;
  const category = decodeURIComponent(raw);

  const [dishes, allCategories] = await Promise.all([getTopDishes({ category }), getCategories()]);
  if (!allCategories.includes(category)) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight">{CATEGORY_TITLE[category] ?? `Best ${category.toLowerCase()}s`}</h1>
      <p className="mt-1 text-muted">
        {dishes.length} dish{dishes.length === 1 ? "" : "es"}, ranked by review &amp; buzz score.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
    </div>
  );
}
