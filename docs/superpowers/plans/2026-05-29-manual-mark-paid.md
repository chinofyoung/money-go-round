# Verifier-initiated "mark as paid" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the configured payment verifier (organizer or current-cycle recipient) one-tap mark a member as paid when payment happened offline.

**Architecture:** Add one new Convex mutation `payments.markPaidByVerifier` that performs the same auth check as `confirmPayment`, sets the payment to `paid + confirmedByOrganizer:true` without proof, and reuses the existing cycle-advancement cascade (extracted into a helper). UI adds a "Mark as paid" pill button on `PaymentRow` that's only visible to verifiers for pending/overdue payments.

**Tech Stack:** Convex 1.32, Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 4, Lucide React

**Spec:** `docs/superpowers/specs/2026-05-29-manual-mark-paid-design.md`

**No automated tests in this repo.** Verification at each task is a combination of `npm run lint`, `npx tsc --noEmit` (or `npm run build`), and exercising the feature in a running dev server (`npm run all`). Each task ends with a logical commit checkpoint.

**Git commits:** This repo's convention from prior plans includes `git commit` at the end of each task. If you (the implementing agent) are not permitted to run `git commit` per the user's global rules, run `git add` for the listed files and ask the user to commit. Never use `--no-verify` or skip hooks.

---

## File Structure

```
MODIFIED FILES:
  convex/schema.ts                       — add "payment_marked_paid" to notifications.type union
  convex/payments.ts                      — extract advanceCycleIfComplete; add markPaidByVerifier; branch rejectPayment notification message
  components/pool/PaymentRow.tsx          — add onMarkPaid prop + "Mark as paid" pill button
  components/pool/PaymentsContent.tsx     — wire api.payments.markPaidByVerifier + confirm() prompt + pass onMarkPaid to each PaymentRow

NEW FILES:
  (none)

UNCHANGED:
  app/pool/[id]/payments/[paymentId]/page.tsx   — proof-detail page; not reached for manual marks
  components/desktop/*                          — desktop reuses PaymentsContent; no separate edits
  All other convex/* files
```

---

## Task 1: Add `payment_marked_paid` notification type to schema

**Files:**
- Modify: `convex/schema.ts:124-147`

- [ ] **Step 1: Add the new literal to the notifications.type union**

Open `convex/schema.ts`. Find the `notifications` table definition. Inside `type: v.union(...)`, add the new literal so the union becomes:

```typescript
type: v.union(
  v.literal("payment_due"),
  v.literal("payment_submitted"),
  v.literal("payment_confirmed"),
  v.literal("payment_rejected"),
  v.literal("payment_marked_paid"),
  v.literal("payment_overdue"),
  v.literal("cycle_advanced"),
  v.literal("payout_upcoming"),
  v.literal("payout_received"),
  v.literal("member_joined"),
  v.literal("order_assigned"),
  v.literal("pool_started"),
  v.literal("invite_received"),
  v.literal("announcement_posted")
),
```

- [ ] **Step 2: Verify Convex picks up the schema change**

Run (in a separate terminal if not already running): `npx convex dev`

Expected: no schema validation errors. The new literal is additive and existing data uses other literals, so no migration is needed.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add payment_marked_paid notification type"
```

---

## Task 2: Refactor — extract `advanceCycleIfComplete` helper from `confirmPayment`

This is a behavior-preserving refactor that pulls the "all confirmed → advance cycle" cascade out of `confirmPayment` so the new mutation in Task 3 can reuse it without duplication.

**Files:**
- Modify: `convex/payments.ts:94-189`

- [ ] **Step 1: Add the helper function at the top of the file**

Open `convex/payments.ts`. Below the existing imports (after line 2), add a non-exported helper. The helper takes the Convex mutation context and the `paymentId` that was just confirmed/marked, then performs the same logic that's currently inline in `confirmPayment`.

```typescript
import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function advanceCycleIfComplete(
  ctx: MutationCtx,
  paymentId: Id<"member_payments">
) {
  const payment = await ctx.db.get(paymentId);
  if (!payment) return;

  const cycle = await ctx.db.get(payment.cycleId);
  if (!cycle) return;

  const pool = await ctx.db.get(cycle.poolId);
  if (!pool) return;

  const allPayments = await ctx.db
    .query("member_payments")
    .withIndex("by_cycle", (q) => q.eq("cycleId", payment.cycleId))
    .collect();

  // Exclude the recipient's own payment (they don't pay themselves)
  const recipientMemberId = cycle.recipientMemberId;
  const relevantPayments = allPayments.filter(
    (p) => p.memberId !== recipientMemberId
  );

  const allConfirmed = relevantPayments.every((p) => p.confirmedByOrganizer);
  if (!allConfirmed) return;

  await ctx.db.patch(cycle._id, { status: "completed" });

  // Find and activate next cycle
  const nextCycle = await ctx.db
    .query("payment_cycles")
    .withIndex("by_pool", (q) => q.eq("poolId", cycle.poolId))
    .filter((q) => q.eq(q.field("cycleNumber"), cycle.cycleNumber + 1))
    .unique();

  if (nextCycle) {
    await ctx.db.patch(nextCycle._id, { status: "current" });
    await ctx.db.patch(cycle.poolId, { currentCycle: cycle.cycleNumber + 1 });

    const activeMembers = await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", cycle.poolId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const advanceMessage = `Cycle ${cycle.cycleNumber} of "${pool.name}" is complete. Cycle ${nextCycle.cycleNumber} has started.`;
    for (const m of activeMembers) {
      if (m.userId) {
        await ctx.db.insert("notifications", {
          userId: m.userId,
          type: "cycle_advanced",
          message: advanceMessage,
          poolId: cycle.poolId,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    const recipient = await ctx.db.get(nextCycle.recipientMemberId);
    if (recipient?.userId) {
      await ctx.db.insert("notifications", {
        userId: recipient.userId,
        type: "payout_upcoming",
        message: `You are the recipient for Cycle ${nextCycle.cycleNumber} of "${pool.name}". Payments will be sent to you this cycle.`,
        poolId: cycle.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }
  } else {
    // All cycles done
    await ctx.db.patch(cycle.poolId, { status: "completed" });

    const activeMembers = await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", cycle.poolId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const m of activeMembers) {
      if (m.userId) {
        await ctx.db.insert("notifications", {
          userId: m.userId,
          type: "payout_received",
          message: `"${pool.name}" has been completed! All cycles are done.`,
          poolId: cycle.poolId,
          read: false,
          createdAt: Date.now(),
        });
      }
    }
  }
}
```

Note: the import line for `MutationCtx` and `Id` may need to be added if not already present. The existing file imports `mutation, query` from `./_generated/server` — add `MutationCtx` to that import, and add the `Id` import line.

- [ ] **Step 2: Replace the inline cascade in `confirmPayment` with a call to the helper**

In `convex/payments.ts`, locate `confirmPayment` (currently lines 54-191). Replace everything from the comment `// Check if all payments in this cycle are confirmed → advance cycle` through the end of the closing brace of the `if (allConfirmed)` block (currently lines 94-189) with a single call:

```typescript
    await advanceCycleIfComplete(ctx, args.paymentId);
```

The body of `confirmPayment` after refactor should look like (showing the full final form for clarity):

```typescript
export const confirmPayment = mutation({
  args: {
    paymentId: v.id("member_payments"),
    organizerId: v.id("users"), // kept name for compat, used as verifierId
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    // Verify the caller is the authorized verifier
    const cycle = await ctx.db.get(payment.cycleId);
    const pool = cycle ? await ctx.db.get(cycle.poolId) : null;
    if (pool) {
      if (pool.paymentVerifier === "recipient" && cycle) {
        const recipientMember = await ctx.db.get(cycle.recipientMemberId);
        if (recipientMember?.userId !== args.organizerId && pool.organizerId !== args.organizerId) {
          throw new Error("Not authorized to confirm this payment");
        }
      } else if (pool.organizerId !== args.organizerId) {
        throw new Error("Not authorized to confirm this payment");
      }
    }

    await ctx.db.patch(args.paymentId, { confirmedByOrganizer: true });

    // Notify the paying member
    const member = await ctx.db.get(payment.memberId);
    if (member?.userId) {
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "payment_confirmed",
        message: `Your payment for "${pool?.name ?? "Pool"}" was confirmed.`,
        poolId: cycle?.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }

    await advanceCycleIfComplete(ctx, args.paymentId);
  },
});
```

Note: the duplicate `const cycle = await ctx.db.get(...)` and `const pool = await ctx.db.get(...)` calls inside the old member-notification block (currently lines 82-83) are removed; the existing earlier-scoped `cycle` and `pool` are reused.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: no errors.

- [ ] **Step 4: Manually verify behavior is unchanged**

Start the dev environment: `npm run all`

In the browser, take an existing active pool where you are the verifier (organizer or recipient). As a paying member, upload a payment proof. As the verifier, click Confirm. Verify:

- The payment row shows the green checkmark.
- The paying member receives a `payment_confirmed` notification.
- If this was the last unpaid member in the cycle, the cycle advances to the next one and the relevant notifications appear (`cycle_advanced`, `payout_upcoming`).

If the refactored behavior matches the prior behavior, proceed.

- [ ] **Step 5: Commit**

```bash
git add convex/payments.ts
git commit -m "refactor(payments): extract advanceCycleIfComplete helper"
```

---

## Task 3: Add `payments.markPaidByVerifier` mutation

**Files:**
- Modify: `convex/payments.ts` — add new mutation after `confirmPayment`

- [ ] **Step 1: Add the new mutation**

In `convex/payments.ts`, add the following after the `confirmPayment` export and before `rejectPayment`:

```typescript
export const markPaidByVerifier = mutation({
  args: {
    paymentId: v.id("member_payments"),
    verifierUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    // Status guard — only pending/overdue payments are eligible for manual mark.
    // A "paid" payment should go through confirmPayment instead.
    if (payment.status !== "pending" && payment.status !== "overdue") {
      throw new Error("Payment is already marked paid");
    }

    const cycle = await ctx.db.get(payment.cycleId);
    const pool = cycle ? await ctx.db.get(cycle.poolId) : null;
    if (!pool || !cycle) throw new Error("Pool or cycle not found");

    // Auth check identical to confirmPayment
    if (pool.paymentVerifier === "recipient") {
      const recipientMember = await ctx.db.get(cycle.recipientMemberId);
      if (
        recipientMember?.userId !== args.verifierUserId &&
        pool.organizerId !== args.verifierUserId
      ) {
        throw new Error("Not authorized to mark this payment paid");
      }
    } else if (pool.organizerId !== args.verifierUserId) {
      throw new Error("Not authorized to mark this payment paid");
    }

    await ctx.db.patch(args.paymentId, {
      status: "paid",
      paidAt: Date.now(),
      confirmedByOrganizer: true,
    });

    // Notify the paying member
    const member = await ctx.db.get(payment.memberId);
    if (member?.userId) {
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "payment_marked_paid",
        message: `The recipient logged your payment for "${pool.name}" as received.`,
        poolId: cycle.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }

    await advanceCycleIfComplete(ctx, args.paymentId);
  },
});
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: no errors.

- [ ] **Step 3: Verify Convex deploys the new function**

In the terminal running `npx convex dev`, confirm a successful deploy line for the new function (e.g., `mutation: payments:markPaidByVerifier`). No client UI is wired yet — that's Task 5–6 — so end-to-end testing happens at the end.

- [ ] **Step 4: Commit**

```bash
git add convex/payments.ts
git commit -m "feat(payments): add markPaidByVerifier mutation"
```

---

## Task 4: Branch the `rejectPayment` notification message

When the verifier "rejects" a payment that had no proof (i.e., they're undoing a manual mark), the existing "please resubmit" message is wrong. Branch on whether the payment had `proofStorageId`.

**Files:**
- Modify: `convex/payments.ts` — inside `rejectPayment` handler

- [ ] **Step 1: Capture whether the payment had proof, before the reset patch**

In `convex/payments.ts`, inside `rejectPayment` (currently around lines 193-239), locate the line:

```typescript
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
```

Below the existing auth-check block, the code currently does:

```typescript
    // Reset to pending and clear proof
    await ctx.db.patch(args.paymentId, {
      status: "pending",
      paidAt: undefined,
      proofStorageId: undefined,
      confirmedByOrganizer: false,
    });
```

Capture the proof state **before** the patch by adding one line above it:

```typescript
    const hadProof = !!payment.proofStorageId;
    // Reset to pending and clear proof
    await ctx.db.patch(args.paymentId, {
      status: "pending",
      paidAt: undefined,
      proofStorageId: undefined,
      confirmedByOrganizer: false,
    });
```

- [ ] **Step 2: Branch the notification message on `hadProof`**

The current notify-the-member block is:

```typescript
    if (member?.userId) {
      const cycle = await ctx.db.get(payment.cycleId);
      const pool = cycle ? await ctx.db.get(cycle.poolId) : null;
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "payment_rejected",
        message: `Your payment for "${pool?.name ?? "Pool"}" was rejected. Please resubmit.`,
        poolId: cycle?.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }
```

Replace the `message` line so it branches on `hadProof`:

```typescript
    if (member?.userId) {
      const cycle = await ctx.db.get(payment.cycleId);
      const pool = cycle ? await ctx.db.get(cycle.poolId) : null;
      const poolName = pool?.name ?? "Pool";
      const message = hadProof
        ? `Your payment for "${poolName}" was rejected. Please resubmit.`
        : `The recipient removed the paid mark on your payment for "${poolName}".`;
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "payment_rejected",
        message,
        poolId: cycle?.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }
```

Notification `type` stays `payment_rejected` so existing notification consumers continue to work.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/payments.ts
git commit -m "feat(payments): tailor reject notification for manual-mark undo"
```

---

## Task 5: Add "Mark as paid" button to `PaymentRow`

**Files:**
- Modify: `components/pool/PaymentRow.tsx`

- [ ] **Step 1: Add `onMarkPaid` to the props interface**

In `components/pool/PaymentRow.tsx`, extend the interface (currently lines 6-18):

```typescript
interface PaymentRowProps {
  name: string;
  email: string;
  imageUrl?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue";
  confirmedByOrganizer: boolean;
  hasProof?: boolean;
  onConfirm?: () => void;
  onMarkPaid?: () => void;
  onViewProof?: () => void;
  isOrganizer?: boolean;
}
```

And add it to the destructured props:

```typescript
export function PaymentRow({
  name,
  email,
  imageUrl,
  amount,
  currency,
  status,
  confirmedByOrganizer,
  hasProof,
  onConfirm,
  onMarkPaid,
  onViewProof,
  isOrganizer,
}: PaymentRowProps) {
```

- [ ] **Step 2: Render the "Mark as paid" button when applicable**

Inside the right-side action cluster (the `<div className="flex items-center gap-2">` block, currently around lines 42-69), add a new button **above** the existing Confirm button. The visibility rule is:

- The payment is still owed: `status === "pending" || status === "overdue"`
- The viewer is the verifier: `isOrganizer === true`
- The handler is provided: `onMarkPaid` is set

Insert this just before the existing Confirm button (which begins with `{status === "paid" && !confirmedByOrganizer && isOrganizer && onConfirm && (`):

```tsx
        {(status === "pending" || status === "overdue") && isOrganizer && onMarkPaid && (
          <button
            onClick={onMarkPaid}
            className="flex items-center gap-1 text-xs bg-[#4ade80]/10 text-[#4ade80] px-2 py-1 rounded-full"
          >
            <CheckCircle size={12} />
            Mark paid
          </button>
        )}
```

The styling matches the existing Confirm pill so the two actions visually belong to the same control family. The icon stays `CheckCircle` (already imported).

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/pool/PaymentRow.tsx
git commit -m "feat(ui): add Mark paid button to PaymentRow"
```

---

## Task 6: Wire `markPaidByVerifier` in `PaymentsContent`

**Files:**
- Modify: `components/pool/PaymentsContent.tsx`

- [ ] **Step 1: Add the mutation hook**

In `components/pool/PaymentsContent.tsx`, find the existing mutation declarations (currently lines 38-40):

```typescript
  const generateUploadUrl = useMutation(api.payments.generateUploadUrl);
  const markPaid = useMutation(api.payments.markPaid);
  const confirmPayment = useMutation(api.payments.confirmPayment);
```

Add a new line below them:

```typescript
  const markPaidByVerifier = useMutation(api.payments.markPaidByVerifier);
```

- [ ] **Step 2: Add the `handleMarkPaid` handler**

Below the existing `handleConfirm` function (currently lines 77-85), add:

```typescript
  async function handleMarkPaid(
    paymentId: Id<"member_payments">,
    memberName: string
  ) {
    if (!convexUser) return;
    if (
      !window.confirm(
        `Mark ${memberName} as paid? This will count their contribution for this cycle.`
      )
    ) {
      return;
    }
    try {
      await markPaidByVerifier({ paymentId, verifierUserId: convexUser._id });
      toast.success(`${memberName} marked as paid.`);
    } catch {
      toast.error("Failed to mark as paid.");
    }
  }
```

- [ ] **Step 3: Pass `onMarkPaid` to each `PaymentRow`**

Find the `cyclePayments.filter(...).map(...)` block that renders `PaymentRow` (currently lines 204-223). The existing JSX is:

```tsx
                  return (
                    <PaymentRow
                      key={payment._id}
                      name={member.displayName ?? ""}
                      email={member.email}
                      amount={payment.amount}
                      currency={pool.currency}
                      status={payment.status}
                      confirmedByOrganizer={payment.confirmedByOrganizer}
                      hasProof={!!payment.proofStorageId}
                      isOrganizer={isVerifier}
                      onConfirm={() => handleConfirm(payment._id)}
                    />
                  );
```

Add an `onMarkPaid` prop so the row becomes:

```tsx
                  return (
                    <PaymentRow
                      key={payment._id}
                      name={member.displayName ?? ""}
                      email={member.email}
                      amount={payment.amount}
                      currency={pool.currency}
                      status={payment.status}
                      confirmedByOrganizer={payment.confirmedByOrganizer}
                      hasProof={!!payment.proofStorageId}
                      isOrganizer={isVerifier}
                      onConfirm={() => handleConfirm(payment._id)}
                      onMarkPaid={() =>
                        handleMarkPaid(payment._id, member.displayName ?? member.email)
                      }
                    />
                  );
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/pool/PaymentsContent.tsx
git commit -m "feat(ui): wire markPaidByVerifier mutation in PaymentsContent"
```

---

## Task 7: End-to-end manual verification

No code changes — verify the full feature works in a running app.

**Files:** none

- [ ] **Step 1: Start dev environment**

```bash
npm run all
```

- [ ] **Step 2: Build a fixture pool**

Either reuse an active pool you already own or create one quickly:

1. Sign in as the organizer.
2. Create a pool with `paymentVerifier = "organizer"` (default), invite ≥2 other members, activate it.

- [ ] **Step 3: Verify "Mark paid" button visibility (organizer-verifier pool)**

As the organizer, navigate to the pool's Payments view. For each pending payment row (excluding the recipient — they have no row), confirm the **Mark paid** pill button is visible next to the pending clock icon.

Sign in as a non-organizer paying member of that pool. Open the same Payments view. Confirm the **Mark paid** button is **not** visible to them.

- [ ] **Step 4: Verify the one-tap mark flow**

Back as the organizer, click **Mark paid** on one of the pending payment rows. Confirm:

- A browser `confirm()` dialog appears with the expected message.
- On confirm, a success toast appears.
- The row updates to show the green checkmark (status: paid + confirmedByOrganizer).
- The paid count on the `CycleCard` increments.
- The paying member receives a `payment_marked_paid` notification with the message `The recipient logged your payment for "<pool>" as received.`

- [ ] **Step 5: Verify cycle auto-advances on the last mark**

Mark all remaining pending payments as paid. After the final mark:

- The current cycle should flip to `completed`.
- The next cycle should activate (or the pool should complete if this was the last cycle).
- A `cycle_advanced` (or `payout_received` for pool completion) notification arrives for active members.
- A `payout_upcoming` notification arrives for the next cycle's recipient.

- [ ] **Step 6: Verify the undo (reject) path**

In a pool with at least one pending cycle, mark a member as paid, then immediately tap the existing **Reject** action (visible in `app/pool/[id]/payments/[paymentId]/page.tsx` — open the payment detail page) — actually, since manually-marked payments have no proof, the existing detail page may not be reachable. Confirm by:

1. Marking a member as paid via the Mark paid button.
2. Opening the payment detail page directly (`/pool/<id>/payments/<paymentId>`).
3. Confirming the Reject button works and resets the payment.
4. Confirming the paying member receives a notification with the message *"The recipient removed the paid mark on your payment for "<pool>"."* (not the "please resubmit" version).

If the detail page isn't reachable from the UI for proof-less payments, this confirms a known gap — file as a follow-up. The mutation behavior itself is the only requirement for this task; UI reachability for undo is out of scope per the spec.

- [ ] **Step 7: Verify recipient-verifier flow**

Create or modify a pool with `paymentVerifier = "recipient"` and activate it. As the current cycle's recipient, confirm the **Mark paid** button appears for each pending payment. As the organizer of that same pool, confirm the button also appears (organizer retains override per existing auth rules). As a non-recipient paying member, confirm the button is hidden.

- [ ] **Step 8: Verify auth rejection**

Open the browser dev tools. As a non-verifier user, manually invoke the mutation via the Convex client (or alternatively, sign in as a paying member who is not the recipient/organizer of a `paymentVerifier="recipient"` pool and attempt to expose the button via DOM tampering). Confirm the mutation throws `"Not authorized to mark this payment paid"`.

(If reproducing this is awkward, it's acceptable to skip — the auth check is identical to `confirmPayment`, which has been verified in production.)

- [ ] **Step 9: Final cleanup commit (if any)**

If steps 1–8 surfaced any small fixes (typo in toast, etc.), commit them:

```bash
git add -p
git commit -m "fix(payments): minor cleanup from manual mark verification"
```

If everything passes cleanly without changes, no commit needed.

---

## Done

The verifier can now one-tap mark members as paid. The undo path is the existing Reject action with a clearer notification message. The cycle-advancement cascade is shared with proof-based confirmation via the new `advanceCycleIfComplete` helper.
