export function GridBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden opacity-40 dark:opacity-25 ${className}`} aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute right-0 left-0 h-px bg-foreground/10"
          style={{ top: `${(i + 1) * 12.5}%` }}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 w-px bg-foreground/10"
          style={{ left: `${((i + 1) / 12) * 100}%` }}
        />
      ))}
    </div>
  );
}
