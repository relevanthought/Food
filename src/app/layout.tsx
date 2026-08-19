import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forkcast — dish ratings & recommendations",
  description: "Find the best dish to order, ranked by reviews and social buzz.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold tracking-tight">Forkcast</span>
            </Link>
            <p className="hidden sm:block text-sm text-muted">
              Dish rankings from reviews &amp; social buzz
            </p>
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
