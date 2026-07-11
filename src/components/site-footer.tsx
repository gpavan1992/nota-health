import { Link } from "@tanstack/react-router";
import { NotaMark } from "@/components/nota-logo";

const GITHUB_URL = "https://github.com/gpavan1992/nota";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-x-3 gap-y-2 sm:flex-row sm:flex-wrap sm:justify-center">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <NotaMark className="h-4 w-auto text-primary" animate={false} />
            <span>Nota Health</span>
          </span>
          <Dot />
          <span>Open Source</span>
          <Dot />
          <span>AGPL-3.0</span>
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

        <div className="flex flex-col items-center gap-x-3 gap-y-2 text-center sm:flex-row sm:flex-wrap sm:justify-center">
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Dot />
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Dot />
          <Link to="/compliance" className="hover:text-foreground">Compliance</Link>
          <Dot />
          <span className="max-w-xl">
            Nota Health is not a medical device. All AI outputs require review by a qualified healthcare professional.
          </span>
        </div>
      </div>
    </footer>
  );
}

function Dot() {
  return <span aria-hidden className="hidden text-muted-foreground/40 sm:inline">·</span>;
}
