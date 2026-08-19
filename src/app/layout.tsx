import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import SearchBar from "@/components/SearchBar";
import AuthNav from "@/components/AuthNav";

export const metadata: Metadata = {
  title: "Forkcast — dish ratings & recommendations",
  description: "Find the best dish to order, ranked by reviews and social buzz.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold tracking-tight">Forkcast</span>
            </Link>
            <Suspense fallback={<div className="flex-1 max-w-sm" />}>
              <SearchBar />
            </Suspense>
            <nav className="ml-auto flex items-center gap-4 text-sm">
              <AuthNav />
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border mt-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-sm text-muted">
            Forkcast blends critic reviews (Google, Yelp, OpenTable, TripAdvisor) with social
            buzz (X, Instagram, TikTok) into one score per dish. Demo data — not real restaurants.
          </div>
        </footer>
      </body>
    </html>
  );
}
