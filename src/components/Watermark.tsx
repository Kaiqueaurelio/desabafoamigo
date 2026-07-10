import { Logo } from "@/components/Logo";

/**
 * Fixed diagonal watermark shown across the app.
 * Non-interactive, low opacity, respects reduced motion.
 */
export function Watermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.045]">
        <div className="flex -rotate-12 items-center gap-4">
          <Logo size={120} />
          <span className="text-6xl font-bold tracking-tight text-primary md:text-8xl">
            Desabafa Amigo
          </span>
        </div>
      </div>
    </div>
  );
}

/** Animated infinity SVG used as a decorative flowing background. */
export function InfinityFlow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 400"
      className={`pointer-events-none ${className}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="infGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--brand-sky)" stopOpacity="0.6" />
          <stop offset="50%" stopColor="var(--brand-green)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--brand-sky)" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d="M 100 200 C 100 80, 300 80, 400 200 S 700 320, 700 200 S 500 80, 400 200 S 100 320, 100 200 Z"
          fill="none"
          stroke="url(#infGrad)"
          strokeWidth={1.2 + i * 0.4}
          strokeDasharray="8 12"
          className="animate-infinity-draw"
          style={{ animationDelay: `${i * -6}s`, opacity: 0.5 - i * 0.12 }}
        />
      ))}
    </svg>
  );
}
