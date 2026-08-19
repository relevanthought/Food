import Link from "next/link";
import { auth } from "@/auth";
import { logOutAction } from "@/lib/actions/auth";

export default async function AuthNav() {
  const session = await auth();

  if (!session?.user) {
    return (
      <>
        <Link href="/login" className="text-muted hover:text-foreground">
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-dark"
        >
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/favorites" className="text-muted hover:text-foreground">
        ♥ Favorites
      </Link>
      <span className="hidden sm:inline text-muted">{session.user.name}</span>
      <form action={logOutAction}>
        <button type="submit" className="text-muted hover:text-foreground">
          Log out
        </button>
      </form>
    </>
  );
}
