import { cn } from "@/lib/utils";

/**
 * Nota mark — a single continuous ECG pulse whose overall silhouette
 * traces the letter N. Baseline → sharp rise (R-wave / left leg) →
 * downstroke with QRS spike (diagonal) → sharp rise (right leg) →
 * baseline. No stethoscopes, crosses, hearts, or pills.
 */
export function NotaMark({
  className,
  strokeWidth = 2.25,
  ...props
}: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 64 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-6 w-auto", className)}
      {...props}
    >
      <path
        d="M2 24 H10 L10 6 L26 30 L28.5 22 L30 28 L31.5 12 L33 28 L35 22 L38 30 L54 6 L54 24 H62"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
