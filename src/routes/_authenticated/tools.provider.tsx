import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Loader2, Search, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SPECIALTIES = [
  "Cardiology",
  "General Medicine",
  "Orthopaedics",
  "Neurology",
  "Paediatrics",
  "Psychiatry",
  "Surgery",
  "Obstetrics and Gynaecology",
  "Radiology",
  "Other",
];

export const Route = createFileRoute("/_authenticated/tools/provider")({
  head: () => ({ meta: [{ title: "Provider Verification — Nota Health" }] }),
  component: ProviderToolPage,
});

type ProviderResult = {
  npi: string;
  type: string;
  name: string;
  credential: string | null;
  status: string | null;
  enumerated: string | null;
  specialty: string | null;
  license: string | null;
  license_state: string | null;
  address: string | null;
  city: string | null;
  state_code: string | null;
  postal: string | null;
  phone: string | null;
};

function ProviderToolPage() {
  const { user } = Route.useRouteContext();
  const [mode, setMode] = useState<"npi" | "name">("name");
  const [npi, setNpi] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProviderResult[] | null>(null);
  const [capped, setCapped] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    setCapped(false);
    const params = new URLSearchParams();
    if (mode === "npi") {
      if (!/^\d{10}$/.test(npi.trim())) {
        setLoading(false);
        setError("NPI must be a 10-digit number.");
        return;
      }
      params.set("npi", npi.trim());
    } else {
      if (!last.trim()) {
        setLoading(false);
        setError("Enter at least a last name.");
        return;
      }
      if (!state.trim()) {
        setLoading(false);
        setError("Please select a state to narrow results.");
        return;
      }
      params.set("last", last.trim());
      if (first.trim()) params.set("first", first.trim());
      params.set("state", state.trim());
      if (city.trim()) params.set("city", city.trim());
      if (specialty) params.set("specialty", specialty);
    }
    try {
      const res = await fetch(`/api/tools/provider?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setResults(data.results ?? []);
      setCapped(Boolean(data.capped));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Clinical Tools · Provider Verification"
        title="Verify any US healthcare provider."
        body="Live from the CMS NPI Registry. Search by NPI number or by name and state."
      />

      <Card className="mt-8">
        <CardContent className="pt-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "npi" | "name")}>
            <TabsList>
              <TabsTrigger value="name">By name</TabsTrigger>
              <TabsTrigger value="npi">By NPI</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={search} className="mt-4 grid gap-3">
            {mode === "npi" ? (
              <Input
                value={npi}
                onChange={(e) => setNpi(e.target.value)}
                placeholder="10-digit NPI number"
                inputMode="numeric"
              />
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px]">
                  <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name (optional)" />
                  <Input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" />
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="State (required)"
                    maxLength={2}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City (optional)"
                  />
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Specialty (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-fit">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search NPI Registry
            </Button>
          </form>

          {error && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {results !== null && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No providers matched.</p>
          ) : (
            <div className="grid gap-3">
              {capped && (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Showing top 10 results. Add a specialty or city to narrow your search.
                </div>
              )}
                <Card key={r.npi}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-primary" />
                          <h3 className="font-serif text-lg text-foreground">
                            {r.name}
                            {r.credential ? (
                              <span className="ml-1 text-sm text-muted-foreground">, {r.credential}</span>
                            ) : null}
                          </h3>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {r.type} · NPI {r.npi}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <Field label="Specialty" value={r.specialty} />
                      <Field
                        label="License"
                        value={
                          r.license
                            ? `${r.license}${r.license_state ? ` (${r.license_state})` : ""}`
                            : null
                        }
                      />
                      <Field
                        label="Practice address"
                        value={
                          r.address
                            ? `${r.address}${r.city ? `, ${r.city}` : ""}${
                                r.state_code ? `, ${r.state_code}` : ""
                              }${r.postal ? ` ${r.postal}` : ""}`
                            : null
                        }
                      />
                      <Field label="Phone" value={r.phone} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Powered by the free CMS NPI Registry API. NPI enumeration status is reported by CMS and may
        not reflect current state license actions.
      </p>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-foreground/90">{value ?? "—"}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const active = (status ?? "").toUpperCase() === "A";
  return (
    <Badge variant="outline" className="gap-1.5 font-mono text-[10px]">
      <BadgeCheck className={`h-3 w-3 ${active ? "text-success" : "text-muted-foreground"}`} />
      {active ? "Active" : status ?? "Unknown"}
    </Badge>
  );
}
