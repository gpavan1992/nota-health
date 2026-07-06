
# Nota — Foundation & Auth

Set up the base app with Lovable Cloud (Supabase) email/password auth, a protected dashboard, and a clean healthcare-professional visual style. No document upload or AI features yet.

## Scope

- Enable Lovable Cloud (database + auth).
- Email/password sign up and sign in (no social providers for now).
- Session persisted across refreshes via the managed Supabase client.
- Routes:
  - `/` — marketing landing intro for Nota with CTAs to sign in / sign up. Redirects to `/dashboard` when already signed in.
  - `/auth` — combined sign in / sign up (tabbed). Redirects to `/dashboard` when already signed in.
  - `/_authenticated/dashboard` — protected placeholder dashboard with a welcome message, the signed-in user's email, and a Sign out button.
- Sign out clears the session and navigates to `/auth`.
- Header shows either "Sign in" or an account menu with Sign out, driven by session state.

## Design direction

Clean, calm, clinical. Not another purple/indigo AI gradient.

- Palette: near-white background, deep slate ink, a single medical teal accent (`oklch` tokens in `src/styles.css`).
- Typography: Inter for body, a slightly tighter display weight for headings. Generous spacing, thin borders, subtle shadows.
- Components: shadcn `Card`, `Input`, `Label`, `Button`, `Tabs`, `Sonner` for toasts. No decorative gradients on the auth card.

All colors go through semantic tokens — no hardcoded `bg-white` / `text-black` in components.

## Technical details

- Enable Lovable Cloud (creates managed Supabase, generated client at `src/integrations/supabase/client.ts`).
- No `profiles` table — auth-only for this milestone. (Profiles can be added later when we introduce documents/roles.)
- Auth flow uses `supabase.auth.signUp` (with `emailRedirectTo: window.location.origin`), `signInWithPassword`, and `signOut`. Session persistence is default in the browser client.
- Root route (`src/routes/__root.tsx`):
  - Set real Nota metadata (title, description, og/twitter).
  - Register a single `onAuthStateChange` listener filtered to `SIGNED_IN` / `SIGNED_OUT` / `USER_UPDATED` that calls `router.invalidate()` and, when not signed out, `queryClient.invalidateQueries()`.
- Protected subtree: `src/routes/_authenticated/route.tsx` — integration-managed `ssr: false` gate that redirects to `/auth` if no user. Dashboard lives at `src/routes/_authenticated/dashboard.tsx`.
- `/` and `/auth` check session on mount and redirect to `/dashboard` if a user exists.
- Sign-out hygiene on the dashboard button: `queryClient.cancelQueries()` → `queryClient.clear()` → `supabase.auth.signOut()` → `navigate({ to: "/auth", replace: true })`.
- Email confirmation: leave Supabase default (confirm-email on). Sign-up form surfaces a "check your email" toast; if confirmations are disabled in the project, the user is auto-signed-in and routed to the dashboard.

## Files to add/modify

- `src/styles.css` — semantic tokens for the Nota palette.
- `src/routes/__root.tsx` — Nota metadata, auth listener, QueryClientProvider (already present), Sonner toaster.
- `src/routes/index.tsx` — landing page (replace placeholder).
- `src/routes/auth.tsx` — sign in / sign up tabs.
- `src/routes/_authenticated/route.tsx` — managed protected layout.
- `src/routes/_authenticated/dashboard.tsx` — placeholder dashboard with sign-out.
- `src/components/site-header.tsx` — shared header with session-aware affordance.

## Out of scope (next steps)

- Document upload, storage bucket, parsing.
- AI chat / RAG over documents.
- Roles, profiles, org/team model.
- Password reset flow and social providers (can add on request).
