import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const ROLES = [
  { value: "clinician", label: "Clinician" },
  { value: "administrator", label: "Administrator" },
  { value: "researcher", label: "Researcher" },
  { value: "patient_advocate", label: "Patient Advocate" },
] as const;

const MODELS = [
  { value: "claude-sonnet", label: "Claude Sonnet (recommended)" },
  { value: "claude-haiku", label: "Claude Haiku" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
] as const;

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const { data: profile, isLoading } = useProfile(user.id);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your profile and how Nota talks to AI models on your behalf.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ProfileCard userId={user.id} profile={profile} />
            <AICard userId={user.id} profile={profile} />
          </>
        )}
      </div>
    </AppShell>
  );
}

type ProfileData = ReturnType<typeof useProfile>["data"];

function ProfileCard({
  userId,
  profile,
}: {
  userId: string;
  profile: ProfileData;
}) {
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<string>("");
  const update = useUpdateProfile(userId);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setOrganization(profile?.organization ?? "");
    setRole(profile?.role ?? "");
  }, [profile]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        full_name: fullName.trim() || null,
        organization: organization.trim() || null,
        role: role || null,
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Tell Nota who you are and where you practice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              placeholder="Dr. Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              maxLength={160}
              placeholder="Hospital, clinic, or health system"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AICard({ userId, profile }: { userId: string; profile: ProfileData }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>("claude-sonnet");
  const [showKey, setShowKey] = useState(false);
  const update = useUpdateProfile(userId);

  useEffect(() => {
    setApiKey(profile?.anthropic_api_key ?? "");
    setModel(profile?.ai_model ?? "claude-sonnet");
  }, [profile]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (trimmed && trimmed.length > 300) {
      toast.error("That API key looks too long.");
      return;
    }
    try {
      await update.mutateAsync({
        anthropic_api_key: trimmed || null,
        ai_model: model,
      });
      toast.success("AI configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI configuration</CardTitle>
        <CardDescription>
          Bring your own Anthropic API key and choose the model Nota should use.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Anthropic API key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                maxLength={300}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stored securely on your profile. Never shared or logged.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Your API key is only used to power your conversations. Nota never
              stores or shares your documents with third parties.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save AI configuration"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
