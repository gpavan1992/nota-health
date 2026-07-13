import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  threadId: z.string().uuid(),
  firstMessage: z.string().min(1).max(4000),
});

// Returns a failure reason string, or null if the title is acceptable.
function validateTitle(t: string): string | null {
  if (!t) return "empty";
  if (t.length > 60) return "too_long";
  if (t.split(/\s+/).length > 8) return "too_long";
  if (/^new chat$/i.test(t)) return "placeholder";

  // PHI / identifier heuristics
  const phiPatterns: Array<[RegExp, string]> = [
    [/\b\d{3}-\d{2}-\d{4}\b/, "phi_detected"], // SSN
    [/\b(?:MRN|mrn)[:# ]*\d{3,}\b/, "phi_detected"], // MRN
    [/\b\d{7,}\b/, "phi_detected"], // long numeric id
    [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, "phi_detected"], // email
    [/\b\+?\d[\d\s().-]{8,}\d\b/, "phi_detected"], // phone
    [/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/, "phi_detected"], // dates
    [/\bDOB\b/i, "phi_detected"],
  ];
  for (const [re, r] of phiPatterns) if (re.test(t)) return r;

  // Proper-name heuristic: 2+ consecutive Capitalized tokens that aren't
  // clinical stopwords (e.g. "John Smith") -> likely a patient name.
  const CLINICAL_OK = new Set([
    "New", "Case", "Review", "Chart", "Note", "Plan", "Assessment", "Summary", "Report",
    "Lab", "Labs", "Vitals", "Meds", "Medication", "Medications", "Diagnosis", "History",
    "ICD", "CPT", "ER", "ICU", "MRI", "CT", "EKG", "ECG", "COVID", "Type", "Stage",
    "Clinical", "Patient", "Drug", "Interaction", "Interactions", "Protocol", "Protocols",
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

export const generateThreadTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InputSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Re-check flags server-side so a race can't overwrite a manual rename.
    const { data: row } = await supabase
      .from("chat_threads")
      .select("id, title_generated, title_locked")
      .eq("id", data.threadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row || row.title_generated || row.title_locked) {
      return { ok: false as const, skipped: true };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      await logFail(supabase, data.threadId, userId, "model_error", "missing LOVABLE_API_KEY");
      return { ok: false as const };
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000); // hard 8s timeout
    let raw = "";
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Lovable-API-Key": key,
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: "openai/gpt-5-nano",
          messages: [
            {
              role: "system",
              content:
                "Generate a 3-6 word Title Case chat title describing the user's request. " +
                "No quotes, no trailing punctuation, no patient names or identifiers, " +
                "no PHI, no dates, no MRNs, no emails, no phone numbers. " +
                "Reply with ONLY the title.",
            },
            { role: "user", content: data.firstMessage.slice(0, 2000) },
          ],
        }),
      });
      if (!res.ok) {
        await logFail(supabase, data.threadId, userId, "model_error", `gateway ${res.status}`);
        return { ok: false as const };
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      raw = (json?.choices?.[0]?.message?.content ?? "").trim();
    } catch (err) {
      const reason = (err as Error).name === "AbortError" ? "timeout" : "model_error";
      await logFail(supabase, data.threadId, userId, reason, raw || (err as Error).message);
      return { ok: false as const };
    } finally {
      clearTimeout(timer);
    }

    const cleaned = raw
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.!?]+$/g, "")
      .trim();
    const reason = validateTitle(cleaned);
    if (reason) {
      await logFail(supabase, data.threadId, userId, reason, raw);
      return { ok: false as const };
    }

    const { error: updErr } = await supabase
      .from("chat_threads")
      .update({ title: cleaned, title_generated: true })
      .eq("id", data.threadId)
      .eq("user_id", userId)
      .eq("title_generated", false)
      .eq("title_locked", false);
    if (updErr) {
      await logFail(supabase, data.threadId, userId, "model_error", updErr.message);
      return { ok: false as const };
    }

    return { ok: true as const, title: cleaned };
  });

async function logFail(
  sb: { from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<unknown> } },
  threadId: string,
  userId: string,
  reason: string,
  raw: string,
) {
  try {
    await sb.from("chat_title_generation_logs").insert({
      thread_id: threadId,
      user_id: userId,
      reason,
      raw_output: raw || null,
    });
  } catch {
    // logging must not throw
  }
}
