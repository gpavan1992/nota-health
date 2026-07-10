
# Audit findings (no fixes applied)

## AUTH

**Critical**
- **Assistant hardcodes Anthropic key regardless of provider.** `src/routes/_authenticated/assistant.$threadId.tsx` line ~118: `const apiKey = profile?.anthropic_api_key ?? "";`. Selecting a Gemini or OpenAI model still reads only the Anthropic key — the "add your API key" banner and send button gate on the wrong field. A user with only a Gemini key sees the banner permanently and cannot send.
- **Sign-out does not clear React Query cache or cancel in-flight queries.** No `queryClient.cancelQueries()` / `queryClient.clear()` on sign-out; protected data can flash on next login and 401s storm after the session clears.

**Medium**
- **No `onAuthStateChange` listener in the router root.** Auth state is read once via `getSession()` in `auth.tsx` and via `_authenticated/route.tsx`'s `beforeLoad`. Header/nav sign-in affordance is not reactive, and cross-tab sign-in/out doesn't update the current tab until a hard refresh.
- **Sign-up has no client-side password strength check.** Only HTML `required` guards empty fields; "weak password → error" relies entirely on Supabase's server response. No inline validation, so the "empty fields → blocked" and "weak password → error" tests both fall back to whatever Supabase returns (and to native browser messages).
- **Password-reset flow points at `/auth` instead of a dedicated `/reset-password` page.** `resetPasswordForEmail` uses `window.location.origin + "/auth"`. Per platform guidance a `/reset-password` route is required — without it, users clicking the email land signed-in on the auth page with no way to set a new password.
- **Protected route gate is SSR-off + client-only redirect.** `_authenticated/route.tsx` uses `ssr: false` and `supabase.auth.getUser()` in `beforeLoad`. Direct navigation to `/cases` or `/assistant` while signed out will briefly render nothing before redirecting; acceptable but the redirect flash is user-visible.

**Low**
- Sign-in error messages are raw Supabase strings (e.g. "Invalid login credentials") — same message for wrong password and unregistered email, so "clear error" for each case is not truly distinguishable.
- `auth.tsx` renders a blank `min-h-screen` div while `ready` is false → visible white/blank flash on refresh before redirect.

---

## GEMINI API KEY (Settings → API Keys)

**Critical**
- **Keys are stored in plaintext in the `profiles` table and sent plaintext over the wire.** `ApiKeyCard.save()` does `update.mutateAsync({ [field]: trimmed })` straight to Supabase. The UI claims "Keys are encrypted in storage" and "encrypted at rest and never logged" (Privacy tab) — both statements are false. DevTools → Network on save will show the raw key in the PATCH body to `/rest/v1/profiles`. DevTools → Application → IndexedDB / React Query cache will also contain the plaintext value.
- **Refresh re-hydrates the plaintext key into the input, not a mask.** `ApiKeyCard` initializes `useState(initial)` from `profile.google_api_key`. Toggling the eye icon reveals the real key; even with the eye off, the DOM `<input type="password">` value is the real key (visible via inspector). There is no server-side masking (last-4 only) pattern.

**Medium**
- **Model selector does not warn when the chosen model has no matching key.** `GroupedModelSelect` just persists `ai_model`; nothing cross-checks `profile.google_api_key` / `openai_api_key` / `anthropic_api_key`. Selecting "Claude Sonnet 4.5" with no Anthropic key silently saves; the failure only surfaces later at send time via the (wrong) Anthropic-only banner.
- **"Delete all keys → assistant blocks input" only works for Anthropic.** Because the assistant reads `anthropic_api_key`, deleting the Google key while an Anthropic key exists still shows no banner even when the selected model is Gemini; and deleting only the Anthropic key while keeping a Gemini key wrongly shows the banner.
- **Remove button visibility is stale.** `{initial && <Button …>Remove</Button>}` uses the prop captured at first render. After clicking Remove, `initial` is still truthy until the profile query invalidates and the parent re-renders, so the button lingers briefly on a now-empty field.
- **No format validation.** Any string ≤300 chars saves as a "Gemini key", including obvious junk like `"test"`; no `AIza…` prefix check.

**Low**
- Toast on save uses the human label ("Google (Gemini) API Key saved") — fine, but no confirmation that the key was actually accepted by Google (no test-call ping).
- `autoComplete="off"` on the input is not honored by all browsers for `type="password"`; consider `new-password`.

---

## GEMINI CONNECTIVITY

**Critical**
- **Gemini streaming is not implemented.** `src/lib/chat-stream.ts` `streamChat()` throws for `provider === "google"`:
  > "Google Gemini is not yet wired to bring-your-own-key. Pick an Anthropic or OpenAI model, or add a Gemini adapter."
  Sending "Hello, are you working?" with a Gemini model selected will throw immediately — no streaming response, no model label rendered as "Gemini", the assistant surfaces the error via `toast.error` and leaves an empty assistant bubble. The entire "Gemini connectivity" test section cannot pass as built.
- **Because the assistant also gates on `anthropic_api_key`, a user with only a Gemini key can't even reach the streaming call** — they'll be blocked by the banner first. So the Gemini path has two independent blockers.

**Medium**
- **Invalid-key error handling for Gemini is untested by design** — the adapter never runs. When Gemini is wired, the current `streamAnthropic` / `streamOpenAI` pattern surfaces the provider's raw error body truncated to 300 chars; acceptable but not user-friendly (no "Your Gemini key was rejected — check Settings" mapping).
- **Model label in the UI is derived from `profile.ai_model`, not from the streaming response.** So even once Gemini works, "model label shows Gemini" only reflects the selector, not what actually answered. If the provider silently falls back, the UI would lie.

**Low**
- `MODEL_CHOICES` in `chat-stream.ts` types provider as `"anthropic" | "openai" | "google"` but the catalog now also has `"ollama"` — TypeScript will accept it at runtime but the cast loses the Ollama branch, and `getModelChoice` falls back to Claude Sonnet 4.5 for any Ollama model, silently misrouting.

---

## Cross-cutting

**Medium**
- **Privacy copy oversells security.** Settings → Privacy claims "Your API keys are encrypted at rest and never logged" and API Keys tab says "Keys are encrypted in storage." Neither is true with the current schema. This is a compliance-risk statement for a healthcare product.
- **No `/reset-password` route exists** (see Auth Medium above) — same finding, cross-listed because it also affects the "keys persist across sessions" story if users get locked out.

