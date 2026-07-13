# Auto-title new chats

## Behavior

1. **First message sent in a thread** (`savedMessages.length === 0`):
   - Immediately set `chat_threads.title = firstMessage.slice(0, 40).trimEnd() + (msg > 40 ? "…" : "")`. Sidebar updates via existing `qc.invalidateQueries(["chat_threads", user.id])`.
   - Fire-and-forget a server function `generateThreadTitle({ threadId, firstMessage })`. Do NOT await — chat streaming proceeds in parallel.
2. **Server function** produces a 3–6 word Title Case summary via Lovable AI Gateway (`openai/gpt-5-nano`, no user key needed), then updates the row.
3. **Guard: only run once.** Server fn is a no-op if `title_generated=true` OR `title_locked=true`.
4. **Manual rename** in the sidebar sets both `title=<user text>` and `title_locked=true` (also `title_generated=true`). Auto-generation will not overwrite it, and won't fire again on later messages regardless.
5. **On any failure** (timeout, empty, guardrail rejection, network) the truncated fallback stays; a row is written to `chat_title_generation_logs` with the reason.

## Database migration

```sql
ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS title_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title_locked   boolean NOT NULL DEFAULT false;

CREATE TABLE public.chat_title_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,            -- 'timeout' | 'empty' | 'too_long' | 'phi_detected' | 'placeholder' | 'model_error'
  raw_output text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_title_generation_logs TO authenticated;
GRANT ALL ON public.chat_title_generation_logs TO service_role;
ALTER TABLE public.chat_title_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs read"  ON public.chat_title_generation_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own logs write" ON public.chat_title_generation_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

No changes to existing `chat_threads` policies.

## Server function — `src/lib/thread-title.functions.ts`

```ts
export const generateThreadTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    threadId: z.string().uuid(),
    firstMessage: z.string().min(1).max(4000),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Re-check flags server-side so a race can't overwrite a manual rename.
    const { data: row } = await supabase
      .from("chat_threads")
      .select("id,title_generated,title_locked")
      .eq("id", data.threadId).eq("user_id", userId).maybeSingle();
    if (!row || row.title_generated || row.title_locked) return { ok: false, skipped: true };

    const key = process.env.LOVABLE_API_KEY!;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);   // hard 8s timeout
    let raw = "";
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", "Lovable-API-Key": key },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: "openai/gpt-5-nano",
          messages: [
            { role: "system", content:
              "Generate a 3-6 word Title Case chat title describing the user's request. " +
              "No quotes, no trailing punctuation, no patient names or identifiers, " +
              "no PHI, no dates, no MRNs, no emails, no phone numbers. " +
              "Reply with ONLY the title." },
            { role: "user", content: data.firstMessage.slice(0, 2000) },
          ],
        }),
      });
      if (!res.ok) throw new Error(`gateway ${res.status}`);
      const json = await res.json();
      raw = (json?.choices?.[0]?.message?.content ?? "").trim();
    } catch (err) {
      await logFail(supabase, data.threadId, userId,
        (err as Error).name === "AbortError" ? "timeout" : "model_error", raw);
      return { ok: false };
    } finally { clearTimeout(timer); }

    const cleaned = raw.replace(/^["'`]+|["'`]+$/g, "").replace(/[.!?]+$/g, "").trim();
    const reason = validateTitle(cleaned);
    if (reason) {
      await logFail(supabase, data.threadId, userId, reason, raw);
      return { ok: false };
    }

    await supabase.from("chat_threads")
      .update({ title: cleaned, title_generated: true })
      .eq("id", data.threadId)
      .eq("title_generated", false)   // don't clobber a race
      .eq("title_locked", false);
    return { ok: true, title: cleaned };
  });
```

### `validateTitle` — the actual guardrail (returned verbatim in code, not a comment)

```ts
// Returns a failure reason string, or null if the title is acceptable.
function validateTitle(t: string): string | null {
  if (!t) return "empty";
  if (t.length > 60) return "too_long";
  if (t.split(/\s+/).length > 8) return "too_long";
  if (/^new chat$/i.test(t)) return "placeholder";

  // PHI / identifier heuristics
  const phiPatterns: Array<[RegExp, string]> = [
    [/\b\d{3}-\d{2}-\d{4}\b/, "phi_detected"],                // SSN
    [/\b(?:MRN|mrn)[:# ]*\d{3,}\b/, "phi_detected"],          // MRN
    [/\b\d{7,}\b/, "phi_detected"],                            // long numeric id
    [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, "phi_detected"],         // email
    [/\b\+?\d[\d\s().-]{8,}\d\b/, "phi_detected"],            // phone
    [/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/, "phi_detected"],    // dates
    [/\bDOB\b/i, "phi_detected"],
  ];
  for (const [re, r] of phiPatterns) if (re.test(t)) return r;

  // Proper-name heuristic: 2+ consecutive Capitalized tokens that aren't
  // clinical stopwords (e.g. "John Smith") → likely a patient name.
  const CLINICAL_OK = new Set([
    "New","Case","Review","Chart","Note","Plan","Assessment","Summary","Report",
    "Lab","Labs","Vitals","Meds","Medication","Medications","Diagnosis","History",
    "ICD","CPT","ER","ICU","MRI","CT","EKG","ECG","COVID","Type","Stage",
  ]);
  const tokens = t.split(/\s+/);
  let run = 0;
  for (const tok of tokens) {
    const cap = /^[A-Z][a-z]+$/.test(tok) && !CLINICAL_OK.has(tok);
    run = cap ? run + 1 : 0;
    if (run >= 2) return "phi_detected";
  }
  return null;
}

async function logFail(sb, threadId, userId, reason, raw) {
  await sb.from("chat_title_generation_logs")
    .insert({ thread_id: threadId, user_id: userId, reason, raw_output: raw || null });
}
```

## Client wiring (`src/routes/_authenticated/assistant.$threadId.tsx`)

Replace lines 418–425 (`isFirst` block):

```ts
const isFirst = (savedMessages?.length ?? 0) === 0;
const fallback = trimmed.length > 40 ? trimmed.slice(0, 40).trimEnd() + "…" : trimmed;
if (isFirst) {
  await supabase.from("chat_threads")
    .update({ title: fallback, updated_at: new Date().toISOString() })
    .eq("id", threadId).eq("title_locked", false);
} else {
  await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
}
qc.invalidateQueries({ queryKey: ["chat_threads", user.id] });

if (isFirst) {
  // Fire-and-forget; don't block streaming.
  void generateThreadTitleFn({ data: { threadId, firstMessage: trimmed } })
    .then((r) => { if (r?.ok) qc.invalidateQueries({ queryKey: ["chat_threads", user.id] }); })
    .catch(() => {});
}
```

`generateThreadTitleFn = useServerFn(generateThreadTitle)` at top of component.

**Sidebar refresh confirmation:** the `.then()` above calls `invalidateQueries(["chat_threads", user.id])`, which is the exact key `useChatThreads` reads — the sidebar re-renders when the background call lands. No realtime channel needed; the invalidate is the nudge.

## Rename lock (`src/components/app-sidebar.tsx`)

Update `useRenameThread` (in `src/hooks/use-chat-threads.ts`) to also set `title_locked: true, title_generated: true` in its UPDATE. No sidebar UX change beyond that.

## Files touched

- `supabase/migrations/<ts>_thread_title_flags.sql` (new)
- `src/lib/thread-title.functions.ts` (new)
- `src/routes/_authenticated/assistant.$threadId.tsx` (first-message block only)
- `src/hooks/use-chat-threads.ts` (rename mutation sets lock)
- `src/integrations/supabase/types.ts` regenerates automatically after migration

Nothing else in the sessions/sidebar flow changes.
