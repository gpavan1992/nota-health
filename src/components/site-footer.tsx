import { Link } from "@tanstack/react-router";

const GITHUB_URL = "https://github.com/gpavan1992/nota-health";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 px-6 py-10 text-xs text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Dot />
        <Link to="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Dot />
        <Link to="/compliance" className="hover:text-foreground">
          Compliance
        </Link>
        <Dot />
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="hover:text-foreground"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40">
      ·
    </span>
  );
}
