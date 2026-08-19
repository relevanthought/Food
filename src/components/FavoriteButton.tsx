import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toggleFavoriteAction } from "@/lib/actions/favorites";

export default async function FavoriteButton({ dishId }: { dishId: string }) {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link
        href="/login"
        aria-label="Log in to save this dish"
        title="Log in to save"
        className="text-xl text-stone-300 hover:text-accent leading-none"
      >
        ♡
      </Link>
    );
  }

  const favorite = await db.favorite.findUnique({
    where: { userId_dishId: { userId: session.user.id, dishId } },
  });

  return (
    <form action={toggleFavoriteAction.bind(null, dishId)}>
      <button
        type="submit"
        aria-label={favorite ? "Remove from favorites" : "Save to favorites"}
        title={favorite ? "Remove from favorites" : "Save to favorites"}
        className={`text-xl leading-none ${favorite ? "text-accent" : "text-stone-300 hover:text-accent"}`}
      >
        {favorite ? "♥" : "♡"}
      </button>
    </form>
  );
}
