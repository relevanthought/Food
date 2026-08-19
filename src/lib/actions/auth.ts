"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/auth";

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signUpAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const { email, password } = readCredentials(formData);

  if (!name || !email || password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Name, a valid email, and an 8+ character password are required.")}`);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("An account with that email already exists.")}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.create({ data: { name, email, passwordHash } });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=${encodeURIComponent("Account created — please log in.")}`);
    }
    throw err;
  }
}

export async function logInAction(formData: FormData) {
  const { email, password } = readCredentials(formData);

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`);
    }
    throw err;
  }
}

export async function logOutAction() {
  await signOut({ redirectTo: "/" });
}
