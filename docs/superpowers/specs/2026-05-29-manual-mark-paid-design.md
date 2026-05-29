# Verifier-initiated "mark as paid"

**Status:** design approved, awaiting implementation plan
**Date:** 2026-05-29

## Problem

Today, the only path for a `member_payment` to reach `status: "paid"` is the paying member uploading proof via `payments.markPaid`. If a member pays the recipient offline (cash, external bank transfer, etc.) and never submits proof in the app, the cycle is stuck — the verifier cannot record that the money arrived.

## Goal

Give the configured verifier (organizer or current-cycle recipient, per `pool.paymentVerifier`) a one-tap action to log "I received this person's payment" without requiring the paying member to do anything in-app.

## Non-goals

- No audit field distinguishing manual marks from proof-verified payments. The absence of `proofStorageId` on a `paid` + `confirmedByOrganizer` payment is sufficient to tell them apart if we ever need to.
- No changes to the payment-detail page (`app/pool/[id]/payments/[paymentId]/page.tsx`) — that page is reached via proof, which doesn't apply here.
- No new "marked by" notification type for the verifier themselves.

## Design

### Permission model

Whoever the configured verifier is for the pool gets the action:

- `pool.paymentVerifier === "organizer"` (default) → organizer can mark any cycle's payments.
- `pool.paymentVerifier === "recipient"` → current cycle's recipient can mark that cycle's payments (organizer also retains override per existing logic).

This matches the existing permission check in `payments.confirmPayment` / `payments.rejectPayment`. No new permission concept introduced.

### Backend

#### New mutation: `payments.markPaidByVerifier`

```
args: { paymentId: Id<"member_payments">, verifierUserId: Id<"users"> }
```

Behavior:

1. Auth check identical to `confirmPayment`: if `pool.paymentVerifier === "recipient"`, the caller must be the current cycle's recipient or the organizer; otherwise the caller must be the organizer. Throw `"Not authorized to mark this payment paid"` on mismatch.
2. Status guard: the payment must currently be `pending` or `overdue`. If it's already `paid`, throw `"Payment is already marked paid"` — the verifier should use `confirmPayment` for proof-based flows.
3. Patch the payment:
   - `status: "paid"`
   - `paidAt: Date.now()`
   - `confirmedByOrganizer: true`
   - `proofStorageId` stays undefined.
4. Insert a notification for the paying member:
   - `type: "payment_marked_paid"`
   - `message: 'The recipient logged your payment for "{pool.name}" as received.'`
5. Run the existing cycle-advancement check. If this was the last outstanding payment for the current cycle, mark the cycle `completed`, activate the next cycle (or mark the pool `completed`), and emit the existing `cycle_advanced` / `payout_upcoming` / `payout_received` notifications — same logic as today's `confirmPayment`.

#### Refactor: extract `advanceCycleIfComplete` helper

Currently the cycle-advancement block lives inside `confirmPayment` (`convex/payments.ts:94-189`). Extract it into an internal helper that both `confirmPayment` and `markPaidByVerifier` call. The helper takes `(ctx, paymentId)` and:

- Re-reads the payment, cycle, pool.
- Collects sibling payments via the `by_cycle` index.
- Excludes the recipient's own row from the "all confirmed" check.
- If all relevant payments are `confirmedByOrganizer`, advances the cycle and emits the cascade of notifications.

This is a behavior-preserving refactor of existing code, scoped to support the new mutation cleanly.

#### Modify: `payments.rejectPayment` notification message

`rejectPayment` is reused as the undo path for a manual mark. Today its notification reads "Your payment for X was rejected. Please resubmit." — wrong wording when the payment was manually marked and the member never submitted anything.

Change: branch the notification message on whether the payment had a `proofStorageId` before reset:

- Had proof → existing message: *"Your payment for "{pool}" was rejected. Please resubmit."*
- No proof (was a manual mark) → new message: *"The recipient removed the paid mark on your payment for "{pool}"."*

Notification `type` stays `payment_rejected` either way.

### Schema change

`convex/schema.ts` — extend `notifications.type` union with one new literal:

```
v.literal("payment_marked_paid")
```

No other schema changes.

### UI

#### `components/pool/PaymentRow.tsx`

Add a new "Mark as paid" pill button. Render when:

- `status === "pending" || status === "overdue"`
- `isOrganizer` is true (already passed as true for whichever user is the configured verifier)
- A new `onMarkPaid` prop is provided

Visual: same pill style as the existing Confirm button, neutral/blue accent rather than green to distinguish it from "confirm proof".

#### `components/pool/PaymentsContent.tsx`

- Wire `const markPaidByVerifier = useMutation(api.payments.markPaidByVerifier)`.
- Add a `handleMarkPaid(paymentId)` that shows a `confirm()` prompt — *"Mark {name} as paid? This will count their contribution for this cycle."* — and on confirm calls the mutation with the current user's id.
- Pass `onMarkPaid={() => handleMarkPaid(payment._id)}` to each `PaymentRow`.

No changes needed in `components/desktop/*` — desktop renders `PaymentsContent` inside its tabs, so the change propagates automatically.

### Edge cases

- **Race between two verifier sessions:** the status guard makes the second call no-op cleanly (`"Payment is already marked paid"` error surfaced to the late tab).
- **Race with a proof submission:** if the member submits proof at the same moment the verifier marks them, whichever mutation lands first wins. The other sees `status: "paid"` and errors out. Acceptable.
- **Recipient's own row:** already excluded today (no `member_payments` row is generated for the recipient at activation). No special-casing required.
- **Last payment in cycle:** auto-advances the cycle, consistent with how `confirmPayment` behaves today. The verifier doesn't get a separate "advance cycle" confirmation — that's the existing pattern.
- **Pool status:** if marking the last payment of the last cycle, the pool flips to `completed` and the existing pool-complete notification cascade fires — same as `confirmPayment` today.

## Out of scope / future work

- Bulk "mark all as paid" for a cycle.
- A separate "verifier activity log" surface showing who marked whom paid and when.
