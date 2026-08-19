"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function FilterBar({ cuisines, cities }: { cuisines: string[]; cities: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: "cuisine" | "city", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        value={searchParams.get("cuisine") ?? ""}
        onChange={(e) => updateParam("cuisine", e.target.value)}
      >
        <option value="">All cuisines</option>
        {cuisines.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        value={searchParams.get("city") ?? ""}
        onChange={(e) => updateParam("city", e.target.value)}
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {(searchParams.get("cuisine") || searchParams.get("city")) && (
        <button
          onClick={() => router.push("/")}
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
