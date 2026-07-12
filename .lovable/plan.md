## Goal

Match the reference screenshots: built-in protocols get a **Deactivate/Activate** toggle (they can't be deleted), and custom protocols get **Edit** + **Delete** in their row menu.

## Changes

### 1. `src/lib/clinical-protocols.ts`
- Add `nota.deactivated_protocols` localStorage key (string[] of built-in ids).
- Add helpers: `loadDeactivatedIds()`, `deactivateBuiltIn(id)`, `activateBuiltIn(id)`, `isDeactivated(id)`.
- Add `updateCustomProtocol(id, patch)` to support edit.

### 2. `src/routes/_authenticated/protocols.tsx`
- Track deactivated ids in state; merge into row data as `deactivated: boolean`.
- Row rendering:
  - Deactivated rows: dimmed (opacity), "Use" button disabled, small "Inactive" badge next to name.
  - Add `⋯` menu to **every** row (currently only Custom has one).
- Menu contents:
  - **Built-in**: single item — "Deactivate" (or "Activate" when already deactivated). No delete, no edit.
  - **Custom**: "Edit details" + "Delete" (destructive).
- Clicking a deactivated row does not run the protocol.
- Reuse the existing `CreateCustomProtocolDialog` for edit: accept optional `initial` prop; when present, prefill fields and call new `updateCustomProtocol` instead of `saveCustomProtocol`. Dialog title switches to "Edit custom protocol".

### 3. Behavior details
- Deactivated built-ins stay visible in the "All" and "Built-in" tabs (so users can re-activate) but are excluded from any consumer that lists runnable protocols elsewhere — scope of this change is the Protocols page only; no other page reads this list today.
- Toasts: "Protocol deactivated" / "Protocol activated" / "Protocol updated".

No backend/schema changes. No other pages touched.