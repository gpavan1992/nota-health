
# Audit findings (no fixes applied)

## CLINICAL TOOLS

### Drug Database (`/tools/drug` + `/api/tools/drug`, `/api/tools/interactions`)

**Critical**
- **openFDA search query is malformed.** In both `drug.ts` and `interactions.ts` the built term is `(openfda.brand_name:"foo"+openfda.generic_name:"foo")`. In Lucene the `+` means "MUST", so this asks openFDA for records that contain the name in *both* the brand and generic fields simultaneously. Common drugs (e.g. `metformin` — no brand match; `Eliquis` — no generic match "eliquis") return zero rows and the UI shows "No drug label found." The intended operator is `+OR+` / space. This breaks the primary "search metformin → real data" test.
- **Interaction check silently drops any drug whose openFDA label lookup fails** — with the malformed query above, that is the common case. Result: "metformin + lisinopril + atorvastatin" typically resolves 0–1 labels and returns "No documented interactions found," which reads as a safety green-light. This is a *clinically misleading* false negative.

**Medium**
- **Interaction detection is a substring scan of one drug's name inside the other's `drug_interactions` / `warnings` / `contraindications` free-text.** With three-letter tokens filtered out, short generics (`ASA`) never match; long brand names produce partial matches inside unrelated words. Severity is a keyword heuristic (`"avoid" → Major`), so a sentence like "avoid abrupt discontinuation" against an unrelated drug rates Major. Not fit for clinical use; needs a real interaction dataset (RxNav, DrugBank).
- **Query sanitisation strips `"` and `\`** but leaves `:` and `(` `)`, so a search containing `:` (e.g. `"Metformin HCl: 500mg"`) breaks the Lucene grouping and returns a 400.
- Only the first result is shown (`limit=1`), and there is no disambiguation UI — searching `insulin` returns a single arbitrary label out of hundreds.
- Interaction checker has no per-input feedback: the "resolved" list at the bottom mentions labels not found, but the individual drug chip doesn't indicate which drugs contributed to the check.
- Response text is truncated with `line-clamp-[12]` / `line-clamp-4` and there is no "show more" — long FDA warnings sections are silently cut off.

**Low**
- No API key needed — confirmed. All calls route through the app's own server functions, which hit openFDA anonymously (subject to openFDA's public rate limit; no key/backoff in code).
- The interaction rate limit is 8 drugs × (8-1)/2 = 28 pairs, each doing a label fetch — 8 sequential fetches then O(n²) scanning; UI shows a single spinner, no progress.
- Fake random search like `xyzabc123` → returns empty gracefully, no crash. ✓

### PubMed (`/tools/pubmed` + `/api/tools/pubmed`)

**Medium**
- **NCBI E-utilities without an `api_key` or `tool`/`email` parameter** — NCBI documents 3 req/sec unauthenticated and *requires* the `tool` and `email` params. Under load NCBI will start returning 429s, which the app surfaces as "Search failed" with no retry. Register a `tool=nota-health` and add an operator email or expose a `NCBI_API_KEY` secret.
- **Citation checker just re-runs a plain PubMed search** on the pasted claim text. There is no MeSH translation, no relevance scoring, and no attempt to flag studies as *supporting* vs *refuting* the claim — the label "Find related evidence" oversells what happens.
- **Abstract parsing is regex-over-XML** (`<AbstractText[^>]*>...`). Multi-section abstracts concatenate without their `Label` attribute (Background/Methods/Results/Conclusions), so structured abstracts read as one wall of text. `AbstractText` containing HTML entities like `&#8211;` is not decoded.
- **PMID article link.** `url` is `https://pubmed.ncbi.nlm.nih.gov/{id}/` — good. UI opens in new tab? Need to verify — the article-list component (below the truncated section) is what actually renders the link; check that `target="_blank" rel="noreferrer noopener"` is set.

**Low**
- Client posts up to `limit=12` for citation checker, `10` for search — hardcoded, no user control.
- `parseYear` picks the first 4-digit number in `pubdate`, so `"2019 Nov-2020 Jan"` is parsed as 2019 rather than the article's actual publication year.
- No caching; the same query re-runs every submit.
- No API key needed — confirmed.

### Provider Verification (`/tools/provider` + `/api/tools/provider`)

**Medium**
- **NPI `1003000126` is not actually a real active NPI** — it's the classic "test" NPI shape. The `test the tool` step will fail on the CMS registry unless the tester substitutes a real NPI. Not a bug in the app, but the test protocol needs a valid known NPI.
- **State input is not validated as a two-letter code**; users can enter "California" and get a 400 from the CMS API — the app displays the raw `NPI 400` without guidance.
- **Only `limit=20` results are returned and there is no pagination** — a name search for "Smith" is capped silently.
- **`enumeration_date` and `status`** are shown raw; a deactivated provider (`status: "I"`) is not visually distinguished — a critical detail for verification.

**Low**
- No `first_name` alone search (backend requires `last_name`), but the UI's "By name" mode silently blocks with "Enter at least a last name."
- No API key needed — confirmed.
- Invalid NPI (fails the `^\d{10}$` regex) → clear client-side error before hitting the API. ✓
- API error path returns `{ error: "NPI 400" }` — user sees "NPI 400", not a plain-language message.

### ICD Lookup (`/tools/icd` + `/api/tools/icd`)

**Critical**
- **This is ICD-10-CM, not ICD-11.** The audit expects "ICD-11 code appears" for "type 2 diabetes mellitus"; the app returns `E11.9` (ICD-10-CM). The route file's own comment acknowledges ICD-11 requires OAuth and was intentionally swapped for ICD-10-CM. Either the audit spec is wrong or the requirement isn't met — flagging so someone decides. The footer text says so, but the audit criterion as written fails.

**Medium**
- **Chapter names are hand-rolled with a small regex list.** `D50-D89` blood/immune diseases work; `D65-D69` coagulation would too, but the pattern `^D[5-8]` matches `D80` fine and `D9x` falls through to *no category*. Codes like `N` (genitourinary) are labelled but sub-categories aren't. Cosmetic, not clinical.
- **Parent code is the first segment before `.`** — for a 3-char code like `E11` the parent is set to the chapter letter `E`, which isn't an ICD entity. Displaying `E` as parent is misleading; should be null or the actual parent (e.g. `E10-E14`).
- **`title` uses `row?.[1]` from NLM's tuple result** — the NLM `df=code,name` format actually returns `[code, name]`, so `row[0]=code`, `row[1]=name`. Correct — but title is not marked as "Long Description" vs "Short Description"; both are commonly needed for billing.

**Low**
- Search "hypertension" returns essential HTN (`I10`) plus lots of hypertensive-heart-disease codes; there is no filter to prioritise "primary code for term".
- No API key needed — confirmed.

---

## LANDING PAGE (signed out) — `/` (`src/routes/index.tsx`)

**Critical**
- **`GITHUB_URL` is literally `"https://github.com"`** (line 32). Every "View on GitHub" link — hero button (line 123), security/open-source section (line 757), footer (line 779, 821) — sends the user to the GitHub homepage, not the Nota Health repo. All four links fail the audit "GitHub repo in new tab" check.
- **Compliance link on the landing security section goes to `/auth`** (line 703, `<Link to="/auth">Read the compliance overview</Link>`), not `/compliance`. The label reads "Read the compliance overview" but the destination is the sign-in page.
- **Footer `<Link to="/compliance">`** (line 839) resolves to `/_authenticated/compliance`, which requires auth. A signed-out visitor clicking "Compliance" in the landing footer is redirected to `/auth`, not the compliance page. The "Compliance link in landing footer works" audit step fails for signed-out users.

**Medium**
- **Signed-in users are auto-redirected to `/assistant`** in `useEffect` before the landing page renders. Correct for the app, but the audit's "Root URL loads landing page, not login redirect" holds only for signed-out visitors; if a session is present, they never see the landing. Worth flagging as behaviour, not a bug.
- Root route `head()` sets `og:url` to `"/"` (relative). Social crawlers ignore relative `og:url`; needs an absolute URL or an origin-aware SSR head.
- No `og:image` on `/`. Per project rules, leaf `og:image` may be omitted, but the landing is the canonical shareable URL and would benefit.

**Low**
- Hero pre-render shows a blank `<div className="min-h-screen bg-background" />` while `getSession()` resolves — flash of empty page before the landing shows for signed-out users, ~100–300 ms.
- No client-side `noreferrer noopener` audit — confirmed present on the GitHub anchors that use plain `<a href>`.

---

## COMPLIANCE PAGE — `/_authenticated/compliance`

**Critical**
- **Route requires auth.** File lives under `src/routes/_authenticated/compliance.tsx`, so any unauthenticated click from the landing footer or hero-section CTA lands on `/auth` instead. The audit item "Compliance link in landing footer works" cannot succeed for a signed-out visitor. Fix by moving to a public route (`src/routes/compliance.tsx`) or duplicating a public marketing version.

**Medium**
- **"All 4 sections" is really 4 sections: Data architecture, HIPAA readiness, Data residency, Enterprise compliance controls.** All render. ✓
- **The checklist uses `CheckCircle2` (available=true) and empty `Circle` (available=false)** — matches the ✓ / ○ requirement.
- **"Disclaimer at bottom" is not present** as a distinct block. There is a `Callout` under HIPAA readiness ("Nota Health does not provide a BAA…") but no page-level "for informational purposes only / not legal advice" disclaimer at the bottom. The audit expects one — currently missing.

**Low**
- Copy says API keys are "encrypted at rest using AES-256" and "never logged" — this contradicts the actual Settings implementation, which (per earlier audits) stores keys in `profiles` in plaintext. Public marketing risk if a customer inspects the DB.
- "Detected region for this session" shows the *browser* IANA timezone, not the server region where data lives. The label reads "where your data physically lives," which is misleading — the browser TZ ≠ data residency.
- Compliance link in `src/components/app-sidebar.tsx` (line 261) is inside the `_authenticated` shell — works when signed in. ✓

---

## Summary of critical blockers

1. openFDA query operator (`+` vs `+OR+`) — Drug DB + Interaction checker both return empty; interaction check is a *silent false-negative safety issue*.
2. `GITHUB_URL = "https://github.com"` — every GitHub link on the landing goes to the wrong destination.
3. Compliance link on the landing security section points to `/auth`; the compliance route itself lives under `_authenticated`, so the landing footer link is also blocked for signed-out users. Two separate issues, same symptom.
4. ICD-10-CM is served where the audit expects ICD-11 — decide whether to adopt the WHO ICD-11 API (OAuth required) or amend the spec.

Everything else is Medium/Low quality-of-implementation.
