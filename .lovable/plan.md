
# Audit findings (no fixes applied)

## CLINICAL ASSISTANT (Gemini active)

**Critical**
- **Gemini never runs.** `src/lib/chat-stream.ts` `streamChat()` throws for `provider === "google"`. With a Gemini model selected, sending any message produces `toast.error("Google Gemini is not yet wired…")` and an empty assistant bubble — no word-by-word stream, no disclaimer, nothing saved as `assistant`. Every Gemini-active assistant test fails at "message streams word by word".
- **API-key gate uses only `profile.anthropic_api_key`** (line ~118 of `assistant.$threadId.tsx`). With a Gemini key set and no Anthropic key, the "Add your API key…" banner stays up and Send is disabled — the user cannot even attempt Gemini. Conversely, with only an Anthropic key + Gemini model selected, the banner hides and Send is enabled, but the request throws (see above).

**Medium**
- **Chat-stream `MODEL_CHOICES` types provider as `"anthropic" | "openai" | "google"`** but the catalog also has `"ollama"`; `getModelChoice` silently falls back to `claude-sonnet-4-5` for unknown provider ids. An Ollama-model selection routes to Anthropic without any warning.
- **Textarea focus is not restored** after send / after stream completes / after switching threads. The `chat-agent-ui-contract` expects the composer to auto-focus in those transitions.
- **Empty-content stream still writes an assistant row.** After `streamChat` throws (Gemini path), `acc === ""`, the `catch` branch skips the insert, so *nothing* is saved. Good for that branch, but if the stream ends with zero tokens on OpenAI/Anthropic (rate-limit terminated with 200), we still `insert` an assistant row containing only the disclaimer. History becomes noisy.
- **Thread title truncation happens on the raw prompt** (`trimmed.slice(0, 60)`), including any pasted attachment metadata since `content` uses `docsBlock + Question:` — good, `trimmed` is the input only. However, `chat_threads.updated_at` is bumped even when the stream fails, so failed sends re-order the sidebar.
- **Enter/Shift+Enter**: works, but Enter also fires with the composer inside a form and the click handler dispatches a synthetic event cast (`handleSend(e as unknown as FormEvent)`) — brittle if `preventDefault` semantics change.

**Low**
- Streaming indicator is just `assistant-streaming` class + a blinking span; no visible "Nota is typing" affordance while `status === "submitted"` before the first token arrives.
- Assistant runs entirely client-side (fetch straight to `api.anthropic.com` and `api.openai.com` with the user key). Even a healthcare app storing PHI in the message body sends it browser→provider directly; acceptable only because keys are BYOK, but there's no server-side rate-limit or audit path.
- `useEffect([seed, threadId])` calls `navigate(..., search: {})` on every mount when `seed` is empty-string vs `undefined`; harmless but re-renders.

---

## CLINICAL EXTRACT (Gemini active)

**Critical**
- **Gemini path is silently misrouted to Claude.** `runExtraction` only has `callAnthropicJSON` / `callOpenAIJSON`; `getModelChoice` returns the `claude-sonnet-4-5` fallback for any Gemini id. So selecting a Gemini model + running extraction actually calls Anthropic using the Anthropic key. If the user only has a Gemini key, extraction fails with an Anthropic 401. If they have both, results are produced by Claude while the UI implies Gemini. **"Gemini active" extraction cannot actually happen.**
- **`handleCreate` gates on `profile.anthropic_api_key` regardless of selected model.** With only a Gemini key set, extraction always errors "Add your API key in Settings." Same critical shape as the Assistant.

**Medium**
- **"Progress shows clinical stages" is not implemented.** The dialog shows a single spinner + "Create" button; the row status transitions `processing → ready/failed` in the DB but there are no stage labels (e.g., "Parsing", "Extracting", "Validating") shown to the user.
- **`handleCreate` passes `columns: proto.columns` to `runExtraction`** — for the `"custom"` protocol, `getProtocol("custom").columns` is empty, so the model designs its own table. Fine, but the custom-instruction text is only forwarded when `protocolId === "custom"`; there's no validation that `customInstruction` is non-empty.
- **File attachments read case documents by name only** (`loadCaseDocs` inserts `{ name, text: "" }`). Those docs are `.filter((d) => d.text.trim().length > 0 || d.image)`ed out just before the call — so pulling case docs contributes nothing to the extraction unless the user separately uploads them.
- **`profile.ai_model ?? "claude-sonnet"`** default is a stale id (catalog uses `"claude-sonnet-4-5"`). `findModel("claude-sonnet")` returns undefined → fallback to Claude Sonnet 4.5 anyway, but the default should match the catalog.
- **"All 6 protocols" is off.** `PROTOCOLS` in `src/lib/protocols.ts` actually exposes 10 entries (`medication_list`, `diagnosis_summary`, `lab_results`, `vital_signs`, `followup_actions`, `discharge_summary`, `medication_reconciliation`, `condition_checklist`, `trial_eligibility`, `custom`). Either the spec undercounts, or hidden protocols exist the test won't cover.

**Low**
- No client-side max-doc-count. Users can attach 20 files, each up to 40 KB text inlined into one prompt; long docs get silently truncated at 40 000 chars in `runExtraction`.
- Failure toast returns the raw provider error string; a Gemini user seeing an Anthropic error will be confused.
- On failure, dialog still `onCreated(inserted.id)` navigates to the failed extraction view — good UX, but no in-dialog retry.

---

## CLINICAL PROTOCOLS

**Critical**
- **Every assistant-type protocol inherits both Gemini failures above.** Clicking "Prior Authorization Review" or "SOAP Note Formatter" creates a `chat_threads` row and navigates to `/assistant/$threadId?seed=…`, where the send button is gated on `anthropic_api_key` and the stream throws for Gemini. No prior-auth or SOAP output is possible with Gemini active.
- **Extraction-type protocols (Medication Reconciliation, Condition Checklist, Trial Eligibility) navigate to `/extract?new=1&protocol=…`** which opens the dialog with the requested protocol pre-selected — but the same Gemini misrouting-to-Claude / key-gate issues apply.

**Medium**
- **Custom protocols live in `localStorage` only** (`nota.custom_protocols`). They don't sync across devices, aren't visible to other team members, and are lost if the user clears site data. For a healthcare product this is a data-durability concern, not just polish.
- **No confirmation on custom-protocol delete.** `handleDeleteCustom` fires `deleteCustomProtocol` immediately from a dropdown menu item — one misclick and the protocol is gone with no undo.
- **Empty `seedPrompt` for a custom assistant protocol** is possible: `runProtocol` navigates with `search: { seed: p.seedPrompt ?? "" }`. If the user created an assistant-type custom protocol without a seed, the composer opens empty — no error, but nothing "pre-loaded".
- **"Assistant protocol" flow always creates a new thread**, even if the same protocol is clicked twice in quick succession — creates duplicate empty threads if the user double-clicks.

**Low**
- The whole row is `cursor-pointer` and both the row `onClick` and the "Use" button call `runProtocol`; the "Use" button doesn't `stopPropagation`, so a click on it fires the handler twice (React re-uses the same handler but network insert is idempotent-ish; still two `chat_threads` inserts on double-tap).
- No search hit-highlighting; "Search protocols" is client-side substring only.
- Row action column has `onClick={(e) => e.stopPropagation()}` on the `<td>` — good — but the dropdown menu is inside it and works fine.
- No pagination for custom protocols; localStorage array can grow unbounded.

---

## Summary

With Gemini as the "active" model, effectively none of the assistant / extract / protocols happy paths work end-to-end. The two shared blockers are:
1. `chat-stream.ts` has no Gemini adapter (throws).
2. Assistant + extraction dialog + protocol runner all key-gate on `profile.anthropic_api_key` regardless of the model actually selected.

Fixing both is prerequisite to running any of the tests in this audit as specified.
