import { cn } from "@/lib/utils";

/**
 * Nota mark — a capital N whose diagonal center stroke is replaced by a
 * single clean QRS heartbeat spike that rises above the cap height.
 * Two vertical strokes + one QRS diagonal, all the same weight and colour.
 * Reads as "N" at 16px; reads as "N with a heartbeat" at 120px.
 */
export function NotaMark({
  className,
  strokeWidth = 4,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 -12 40 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-6 w-auto", className)}
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Left vertical */}
        <path d="M4 0 V36" />
        {/* Right vertical */}
        <path d="M36 0 V36" />
        {/* QRS diagonal: top-left → down diagonal → Q dip → R spike above cap → S drop → diagonal → bottom-right */}
        <path d="M4 0 L16 18 L18 22 L20 -10 L22 30 L24 22 L36 36" />
      </g>
    </svg>
  );
}

export function NotaLogo({
  className,
  markClassName,
  wordClassName,
  size = "md",
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale = {
    sm: { mark: "h-5", word: "text-lg" },
    md: { mark: "h-7", word: "text-2xl" },
    lg: { mark: "h-9", word: "text-3xl" },
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <NotaMark className={cn(scale.mark, "text-primary", markClassName)} />
      <span
        className={cn(
          "font-serif font-medium tracking-tight leading-none",
          scale.word,
          wordClassName,
        )}
      >
        Nota
      </span>
    </span>
  );
}
