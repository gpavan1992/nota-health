import { Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Nota</span>
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
