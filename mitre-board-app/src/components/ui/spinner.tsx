// Spinner component for consistent loading indicators across the app
import { Loader2 } from "lucide-react";

export function Spinner({ className = "h-6 w-6 text-primary" }: { className?: string }) {
  return (
    <span role="status" aria-live="polite" aria-busy="true">
      <Loader2 className={`animate-spin ${className}`} />
      <span className="sr-only">Loading...</span>
    </span>
  );
}
