function tier(score: number): { label: string; classes: string } {
  if (score >= 85) return { label: "Must try", classes: "bg-emerald-600 text-white" };
  if (score >= 70) return { label: "Great", classes: "bg-accent text-white" };
  if (score >= 50) return { label: "Good", classes: "bg-amber-500 text-white" };
  if (score > 0) return { label: "Mixed", classes: "bg-stone-400 text-white" };
  return { label: "New", classes: "bg-stone-200 text-stone-600" };
}

export default function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const { label, classes } = tier(score);
  const sizeClasses =
    size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center justify-center rounded-full font-bold ${sizeClasses} ${classes}`}>
        {score > 0 ? Math.round(score) : "—"}
      </div>
      <span className="text-[11px] uppercase tracking-wide text-muted whitespace-nowrap">{label}</span>
    </div>
  );
}
