import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Info,
  Loader2,
  Shield,
  Trash2,
  Upload,
  Download,
  Plug,
  KeyRound,
  Sparkles,
  UserRound,
  Lock,
  Database,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/use-profile";
import { GroupedModelSelect } from "@/components/grouped-model-select";
import { McpConnectorDialog, type McpConnector } from "@/components/mcp-connector-dialog";
import { ProviderMark } from "@/components/provider-mark";
import { findModel } from "@/lib/model-catalog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Server, Trash2 as TrashIcon, Plus as PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const ROLES = [
  { value: "clinician", label: "Clinician" },
  { value: "physician", label: "Physician" },
  { value: "nurse", label: "Nurse" },
  { value: "administrator", label: "Administrator" },
  { value: "researcher", label: "Researcher" },
  { value: "patient_advocate", label: "Patient Advocate" },
] as const;

// Model list now lives in `@/lib/model-catalog` and is grouped by provider
// (Anthropic / OpenAI / Google Gemini). We keep a legacy label map here only
// for the "current selection" summary text.

type Preferences = {
  drug_interactions: boolean;
  pubmed_citations: boolean;
  autosave_to_cases: boolean;
};

function readPrefs(p: Profile | null | undefined): Preferences {
  const raw = (p?.preferences ?? {}) as Partial<Preferences>;
  return {
    drug_interactions: raw.drug_interactions ?? true,
    pubmed_citations: raw.pubmed_citations ?? true,
    autosave_to_cases: raw.autosave_to_cases ?? false,
  };
}

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const { data: profile, isLoading } = useProfile(user.id);

  return (
    <AppShell user={user}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Settings"
          title="Workspace preferences"
          body="Manage your profile, safety features, data, and how Nota Health connects to AI providers."
        />

        {isLoading || !profile ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
              <TabsTrigger value="general" className="gap-1.5">
                <UserRound className="h-3.5 w-3.5" /> General
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-1.5">
                <Sliders className="h-3.5 w-3.5" /> Features
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-1.5">
                <Database className="h-3.5 w-3.5" /> Privacy & Data
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Security
              </TabsTrigger>
              <TabsTrigger value="models" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Model Preferences
              </TabsTrigger>
              <TabsTrigger value="keys" className="gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> API Keys
              </TabsTrigger>
              <TabsTrigger value="connectors" className="gap-1.5">
                <Plug className="h-3.5 w-3.5" /> Connectors
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralTab userId={user.id} email={user.email ?? null} profile={profile} />
            </TabsContent>
            <TabsContent value="features">
              <FeaturesTab userId={user.id} profile={profile} />
            </TabsContent>
            <TabsContent value="privacy">
              <PrivacyTab userId={user.id} />
            </TabsContent>
            <TabsContent value="security">
              <SecurityTab userId={user.id} profile={profile} />
            </TabsContent>
            <TabsContent value="models">
              <ModelsTab userId={user.id} profile={profile} />
            </TabsContent>
            <TabsContent value="keys">
              <ApiKeysTab userId={user.id} profile={profile} />
            </TabsContent>
            <TabsContent value="connectors">
              <ConnectorsTab userId={user.id} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------ General ------------------------------ */

function GeneralTab({
  userId,
  email,
  profile,
}: {
  userId: string;
  email: string | null;
  profile: Profile;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [organization, setOrganization] = useState(profile.organization ?? "");
  const [role, setRole] = useState(profile.role ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const update = useUpdateProfile(userId);

  const initials = useMemo(() => {
    const src = fullName || email || "";
    return src
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "N";
  }, [fullName, email]);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("Photo must be under 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? path;
      await update.mutateAsync({ avatar_url: url });
      setAvatarUrl(url);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Your identity across Nota Health.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3.5 w-3.5" />
                )}
                Upload photo
              </Button>
              <p className="text-xs text-muted-foreground">PNG or JPG, up to 2 MB.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onAvatar}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full-name">Display name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              placeholder="Dr. Jane Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Organisation</Label>
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

/* ------------------------------ Features ------------------------------ */

function FeaturesTab({ userId, profile }: { userId: string; profile: Profile }) {
  const prefs = readPrefs(profile);
  const [drug, setDrug] = useState(prefs.drug_interactions);
  const [pubmed, setPubmed] = useState(prefs.pubmed_citations);
  const [autosave, setAutosave] = useState(prefs.autosave_to_cases);
  const update = useUpdateProfile(userId);

  async function save(patch: Partial<Preferences>) {
    const next = { ...readPrefs(profile), ...patch };
    try {
      await update.mutateAsync({ preferences: next });
      toast.success("Preferences updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features</CardTitle>
        <CardDescription>
          Safety layers and automations that run alongside the Clinical Assistant.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <ToggleRow
          title="Drug interaction warnings"
          description="Flag potentially harmful drug-drug interactions in chat replies."
          checked={drug}
          onChange={(v) => {
            setDrug(v);
            void save({ drug_interactions: v });
          }}
        />
        <ToggleRow
          title="PubMed citation lookup"
          description="Enrich answers with citations from PubMed when relevant."
          checked={pubmed}
          onChange={(v) => {
            setPubmed(v);
            void save({ pubmed_citations: v });
          }}
        />
        <ToggleRow
          title="Clinical disclaimer on every AI response"
          description="Appends 'For clinical review only.' to each answer. Required."
          checked
          disabled
          hint="Always on"
        />
        <ToggleRow
          title="Auto-save conversations to Cases"
          description="When a chat is opened from a Case, save messages back to that Case automatically."
          checked={autosave}
          onChange={(v) => {
            setAutosave(v);
            void save({ autosave_to_cases: v });
          }}
        />
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  hint,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {hint && (
          <p className="text-xs uppercase tracking-wide text-primary">{hint}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(v) => onChange?.(Boolean(v))}
        disabled={disabled}
      />
    </div>
  );
}

/* ------------------------------ Privacy ------------------------------ */

function PrivacyTab({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function download(name: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nota-${name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportConversations() {
    setBusy("conv");
    try {
      const [{ data: threads }, { data: messages }] = await Promise.all([
        supabase.from("chat_threads").select("*").eq("user_id", userId),
        supabase.from("chat_messages").select("*").eq("user_id", userId),
      ]);
      await download("conversations", { threads, messages });
      toast.success("Conversations exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportExtractions() {
    setBusy("ext");
    try {
      const { data } = await supabase
        .from("extractions")
        .select("*")
        .eq("user_id", userId);
      await download("extractions", data);
      toast.success("Extractions exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportAll() {
    setBusy("all");
    try {
      const [profile, cases, members, docs, convos, threads, messages, ext] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("cases").select("*").eq("owner_id", userId),
          supabase.from("case_members").select("*"),
          supabase.from("case_documents").select("*"),
          supabase.from("case_conversations").select("*"),
          supabase.from("chat_threads").select("*").eq("user_id", userId),
          supabase.from("chat_messages").select("*").eq("user_id", userId),
          supabase.from("extractions").select("*").eq("user_id", userId),
        ]);
      await download("account", {
        profile: profile.data,
        cases: cases.data,
        case_members: members.data,
        case_documents: docs.data,
        case_conversations: convos.data,
        chat_threads: threads.data,
        chat_messages: messages.data,
        extractions: ext.data,
      });
      toast.success("Account data exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteConversations() {
    setBusy("d-conv");
    try {
      await supabase.from("chat_messages").delete().eq("user_id", userId);
      await supabase.from("chat_threads").delete().eq("user_id", userId);
      toast.success("All conversations deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }
  async function deleteExtractions() {
    setBusy("d-ext");
    try {
      await supabase.from("extractions").delete().eq("user_id", userId);
      toast.success("All extractions deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }
  async function deleteCases() {
    setBusy("d-cases");
    try {
      await supabase.from("cases").delete().eq("owner_id", userId);
      toast.success("All cases deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export your data</CardTitle>
          <CardDescription>
            Download machine-readable JSON copies. Files never leave your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            className="justify-start"
            onClick={exportConversations}
            disabled={busy === "conv"}
          >
            <Download className="mr-2 h-4 w-4" />
            Conversations
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={exportExtractions}
            disabled={busy === "ext"}
          >
            <Download className="mr-2 h-4 w-4" />
            Extractions
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={exportAll}
            disabled={busy === "all"}
          >
            <Download className="mr-2 h-4 w-4" />
            Full account
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete data</CardTitle>
          <CardDescription>
            Permanent. Deleted data cannot be recovered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <DangerRow
            label="Delete all conversations"
            description="Removes every chat thread and message from your account."
            confirmLabel="Delete conversations"
            onConfirm={deleteConversations}
            busy={busy === "d-conv"}
          />
          <DangerRow
            label="Delete all extractions"
            description="Removes every structured extraction you have created."
            confirmLabel="Delete extractions"
            onConfirm={deleteExtractions}
            busy={busy === "d-ext"}
          />
          <DangerRow
            label="Delete all cases"
            description="Removes every case you own, along with its members and linked documents."
            confirmLabel="Delete cases"
            onConfirm={deleteCases}
            busy={busy === "d-cases"}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          All your documents are stored in a private encrypted storage bucket.
          Nota Health never reads or shares your documents. Your API keys are
          encrypted at rest and never logged.
        </p>
      </div>
    </div>
  );
}

function DangerRow({
  label,
  description,
  confirmLabel,
  onConfirm,
  busy,
}: {
  label: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={busy}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void onConfirm();
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------ Security ------------------------------ */

function SecurityTab({ userId, profile }: { userId: string; profile: Profile }) {
  const [hours, setHours] = useState(String(profile.auto_signout_hours ?? 8));
  const update = useUpdateProfile(userId);

  async function saveHours(v: string) {
    setHours(v);
    try {
      await update.mutateAsync({ auto_signout_hours: Number(v) });
      toast.success("Session timeout updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <div className="space-y-6">
      <MfaCard />
      <SessionsCard userId={userId} />
      <Card>
        <CardHeader>
          <CardTitle>Automatic sign-out</CardTitle>
          <CardDescription>
            Nota Health will sign you out after this period of inactivity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="signout-hours" className="min-w-40">
              Sign out after
            </Label>
            <Select value={hours} onValueChange={saveHours}>
              <SelectTrigger id="signout-hours" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 4, 8, 12, 24].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h} hour{h > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MfaCard() {
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [factors, setFactors] = useState<Array<{ id: string; status: string; friendly_name?: string | null }>>([]);
  const [open, setOpen] = useState(false);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []).map((f) => ({ id: f.id, status: f.status, friendly_name: f.friendly_name })));
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function beginEnroll() {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error) throw error;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  async function verify() {
    if (!factorId) return;
    try {
      const { data: challenge, error: cErr } =
        await supabase.auth.mfa.challenge({ factorId });
      if (cErr) throw cErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) throw error;
      toast.success("Authenticator enabled");
      setOpen(false);
      setCode("");
      setQr(null);
      setSecret(null);
      setFactorId(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function unenroll(id: string) {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      toast.success("Authenticator removed");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  }

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-factor authentication</CardTitle>
        <CardDescription>
          Require a code from an authenticator app when signing in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {verified.length > 0 ? (
          <div className="space-y-2">
            {verified.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {f.friendly_name || "Authenticator app"}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unenroll(f.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No authenticator apps enrolled.
          </p>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={beginEnroll} disabled={enrolling}>
              {enrolling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Shield className="mr-2 h-4 w-4" />
              )}
              Set up authenticator app
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan the QR code</DialogTitle>
              <DialogDescription>
                Open your authenticator app, scan the code, then enter the 6-digit code below.
              </DialogDescription>
            </DialogHeader>
            {qr && (
              <div className="flex flex-col items-center gap-3">
                <img src={qr} alt="MFA QR" className="h-48 w-48 rounded border border-border bg-white p-2" />
                {secret && (
                  <p className="text-xs font-mono text-muted-foreground">
                    Or enter manually: {secret}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification code</Label>
              <Input
                id="mfa-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={verify} disabled={code.length !== 6}>
                Verify & enable
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SessionsCard({ userId: _userId }: { userId: string }) {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const device =
    typeof navigator !== "undefined"
      ? /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent)
        ? "Mobile browser"
        : "Desktop browser"
      : "Browser";

  async function signOutOthers() {
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Signed out other sessions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>
          Devices currently signed in to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium">
              {device} <span className="text-xs text-muted-foreground">(this device)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Location detected from IP · Last active {now.toLocaleTimeString()}
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled>
            Current
          </Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sign out every other browser and device.
          </p>
          <Button variant="outline" size="sm" onClick={signOutOthers}>
            Sign out other sessions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Models ------------------------------ */

function ModelsTab({ userId, profile }: { userId: string; profile: Profile }) {
  const [primary, setPrimary] = useState(profile.ai_model || "claude-3-5-sonnet-latest");
  const [secondary, setSecondary] = useState(
    profile.ai_model_secondary || "claude-3-5-haiku-latest",
  );
  const update = useUpdateProfile(userId);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        ai_model: primary,
        ai_model_secondary: secondary,
      });
      toast.success("Model preferences saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model preferences</CardTitle>
        <CardDescription>
          Choose which model powers each Nota Health workflow. Models are grouped
          by provider — Anthropic, OpenAI, and Google Gemini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="primary-model">Primary model — Clinical Assistant</Label>
            <GroupedModelSelect id="primary-model" value={primary} onValueChange={setPrimary} showHint />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary-model">Secondary model — Clinical Extractions</Label>
            <GroupedModelSelect
              id="secondary-model"
              value={secondary}
              onValueChange={setSecondary}
              showHint
            />
          </div>

          <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Use larger models (Sonnet, GPT-4o, Gemini Pro) for nuanced clinical
              reasoning and long documents. Use smaller models (Haiku, Mini,
              Flash) for high-volume extractions, quick lookups, and cost-sensitive
              runs.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save model preferences"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ API Keys ------------------------------ */

function ApiKeysTab({ userId, profile }: { userId: string; profile: Profile }) {
  return (
    <div className="space-y-6">
      <ApiKeyCard
        userId={userId}
        field="anthropic_api_key"
        label="Anthropic (Claude) API Key"
        placeholder="sk-ant-…"
        initial={profile.anthropic_api_key ?? ""}
      />
      <ApiKeyCard
        userId={userId}
        field="openai_api_key"
        label="OpenAI API Key"
        placeholder="sk-…"
        initial={profile.openai_api_key ?? ""}
      />
      <ApiKeyCard
        userId={userId}
        field="google_api_key"
        label="Google (Gemini) API Key"
        placeholder="AIza…"
        initial={profile.google_api_key ?? ""}
      />
      <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>You must provide at least one API key. Keys are encrypted in storage.</p>
      </div>
    </div>
  );
}

function ApiKeyCard({
  userId,
  field,
  label,
  placeholder,
  initial,
}: {
  userId: string;
  field: "anthropic_api_key" | "openai_api_key" | "google_api_key";
  label: string;
  placeholder: string;
  initial: string;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(!initial);
  const update = useUpdateProfile(userId);

  const maskedPreview = initial
    ? `${initial.slice(0, 4)}${"•".repeat(Math.max(4, Math.min(20, initial.length - 8)))}${initial.slice(-4)}`
    : "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Enter a key or press Cancel.");
      return;
    }
    if (trimmed.length > 300) {
      toast.error("That API key looks too long.");
      return;
    }
    try {
      await update.mutateAsync({ [field]: trimmed });
      toast.success(`${label} saved`);
      setValue("");
      setShow(false);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function clear() {
    setValue("");
    try {
      await update.mutateAsync({ [field]: null });
      toast.success(`${label} removed`);
      setEditing(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <KeyRound className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-mono text-sm text-muted-foreground">
                {maskedPreview}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                disabled={update.isPending}
              >
                Remove
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Replace
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                maxLength={300}
                autoFocus
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Hide key" : "Show key"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end gap-2">
              {initial && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue("");
                    setShow(false);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" size="sm" disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Connectors ------------------------------ */

function ConnectorsTab({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<McpConnector | null>(null);

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ["mcp-connectors", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcp_connectors")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as McpConnector[];
    },
  });

  async function toggle(row: McpConnector) {
    const { error } = await supabase
      .from("mcp_connectors")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["mcp-connectors", userId] });
  }

  async function remove(row: McpConnector) {
    if (!confirm(`Remove "${row.label}"?`)) return;
    const { error } = await supabase.from("mcp_connectors").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Connector removed");
    qc.invalidateQueries({ queryKey: ["mcp-connectors", userId] });
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(row: McpConnector) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              MCP connectors
            </CardTitle>
            <CardDescription className="mt-1">
              Nota Health is an MCP-compatible client. Connect any healthcare MCP
              server — FHIR bridges, clinical knowledge bases, lab integrations —
              and its tools become available to the Clinical Assistant.
            </CardDescription>
          </div>
          <Button onClick={openAdd} size="sm" className="rounded-full">
            <PlusIcon className="mr-1 h-4 w-4" />
            Add MCP connector
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : connectors.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-10 text-center">
              <Plug className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                No MCP connectors yet.
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Bring your own MCP server URL and bearer token. The assistant will
                automatically use its tools during a conversation.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {connectors.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.label}
                      </p>
                      <Badge variant={c.enabled ? "default" : "secondary"} className="h-5 text-[10px]">
                        {c.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {c.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={c.enabled}
                      onCheckedChange={() => toggle(c)}
                      aria-label={c.enabled ? "Disable connector" : "Enable connector"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(c)}
                      aria-label="Edit connector"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(c)}
                      aria-label="Remove connector"
                    >
                      <TrashIcon className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <McpConnectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        existing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["mcp-connectors", userId] })}
      />
    </div>
  );
}
