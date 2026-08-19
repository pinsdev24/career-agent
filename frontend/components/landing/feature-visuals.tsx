export function MatchVisual() {
  return (
    <svg viewBox="0 0 192 160" className="h-40 w-48 text-foreground" fill="none" aria-hidden>
      <circle cx="64" cy="80" r="36" stroke="currentColor" strokeOpacity="0.2" />
      <circle cx="128" cy="80" r="36" stroke="currentColor" strokeOpacity="0.2" />
      <circle cx="96" cy="80" r="18" stroke="currentColor" strokeOpacity="0.7" />
      <circle cx="96" cy="80" r="4" fill="currentColor" />
      <path d="M64 80h64" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 4" />
    </svg>
  );
}

export function ToneVisual() {
  return (
    <svg viewBox="0 0 192 160" className="h-40 w-48 text-foreground" fill="none" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => {
        const y = 28 + i * 18;
        const w = 70 + ((i * 29) % 50);
        return (
          <rect
            key={i}
            x="24"
            y={y}
            width={w}
            height="8"
            rx="4"
            fill="currentColor"
            fillOpacity={0.12 + i * 0.08}
          />
        );
      })}
      <path d="M24 132h120" stroke="currentColor" strokeOpacity="0.2" />
    </svg>
  );
}

export function ControlVisual() {
  return (
    <svg viewBox="0 0 192 160" className="h-40 w-48 text-foreground" fill="none" aria-hidden>
      <rect x="36" y="28" width="120" height="88" rx="6" stroke="currentColor" strokeOpacity="0.25" />
      <path d="M36 48h120" stroke="currentColor" strokeOpacity="0.15" />
      <circle cx="48" cy="38" r="3" fill="currentColor" fillOpacity="0.35" />
      <circle cx="60" cy="38" r="3" fill="currentColor" fillOpacity="0.25" />
      <circle cx="72" cy="38" r="3" fill="currentColor" fillOpacity="0.2" />
      <path d="M52 72h72M52 88h48" stroke="currentColor" strokeOpacity="0.35" strokeLinecap="round" />
      <rect x="118" y="104" width="28" height="18" rx="9" fill="currentColor" fillOpacity="0.85" />
    </svg>
  );
}

export function ScoutVisual() {
  return (
    <svg viewBox="0 0 192 160" className="h-40 w-48 text-foreground" fill="none" aria-hidden>
      <circle cx="96" cy="80" r="48" stroke="currentColor" strokeOpacity="0.15" />
      <circle cx="96" cy="80" r="28" stroke="currentColor" strokeOpacity="0.25" />
      <path d="M96 32v96M48 80h96" stroke="currentColor" strokeOpacity="0.15" />
      <circle cx="124" cy="58" r="5" fill="currentColor" />
      <circle cx="72" cy="96" r="3.5" fill="currentColor" fillOpacity="0.6" />
      <circle cx="110" cy="110" r="2.5" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}
