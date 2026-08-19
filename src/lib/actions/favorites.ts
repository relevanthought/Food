"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function toggleFavoriteAction(dishId: string) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const existing = await db.favorite.findUnique({
    where: { userId_dishId: { userId: session.user.id, dishId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
  } else {
    await db.favorite.create({ data: { userId: session.user.id, dishId } });
  }

  revalidatePath("/", "layout");
}
