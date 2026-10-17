import { Star } from "lucide-react";

export function Stars({ rating, className = "" }: { rating: number | null; className?: string }) {
  // Marketplace reviews copied without their star rating show text only; a rating is never guessed.
  if (rating === null) return null;
  return (
    <div role="img" aria-label={`${rating} out of 5 stars`} className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="size-4" fill={i < rating ? "currentColor" : "none"} aria-hidden />
      ))}
    </div>
  );
}
