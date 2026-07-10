import { cn } from "@/lib/utils";

/**
 * Nota mark — a capital N whose diagonal center stroke is replaced by a
 * single clean QRS heartbeat spike that rises above the cap height.
 * On mount, the QRS line traces itself once across the N, then stays still.
 */
export function NotaMark({
  className,
  strokeWidth = 4,
  animate = true,
  ...props
}: React.SVGProps<SVGSVGElement> & {
  strokeWidth?: number;
  animate?: boolean;
}) {
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
        {/* QRS diagonal — baseline diagonal with a sharp heartbeat spike near the top */}
        <path
          d="M4 0 L17 20 L19 20 L20 4 L22 32 L23 20 L36 36"
          className={animate ? "nota-ecg-trace" : undefined}
        />
      </g>
    </svg>
  );
}

export function NotaLogo({
  className,
  markClassName,
  wordClassName,
  size = "md",
  animate = true,
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}) {
  const scale = {
    sm: { mark: "h-7", word: "text-lg" },
    md: { mark: "h-8", word: "text-2xl" },
    lg: { mark: "h-10", word: "text-3xl" },
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <NotaMark
        animate={animate}
        className={cn(scale.mark, "text-primary", markClassName)}
      />
      <span
        className={cn(
          "font-serif tracking-tight leading-none",
          scale.word,
          wordClassName,
        )}
      >
        <span className="font-medium">Nota</span>
        <span className="font-light"> Health</span>
      </span>

    </span>
  );
}
