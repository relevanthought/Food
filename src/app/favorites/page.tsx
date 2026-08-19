import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFavoriteDishes } from "@/lib/data";
import DishCard from "@/components/DishCard";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dishes = await getFavoriteDishes(session.user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Your favorites</h1>
      <p className="mt-1 text-muted">Dishes you&apos;ve saved.</p>

      {dishes.length === 0 ? (
        <p className="mt-10 text-muted">
          No favorites yet. Tap the ♡ on any dish to save it —{" "}
          <Link href="/" className="text-accent-dark font-medium">
            browse today&apos;s top dishes
          </Link>
          .
        </p>
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
