import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { NotaLogo } from "@/components/nota-logo";

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="text-foreground">
          <NotaLogo size="md" />
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/assistant">Open Nota Health</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
