export default function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="text-amber-500 text-sm tracking-tight" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-stone-300">{"★".repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}
