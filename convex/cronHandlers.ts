import { internalMutation } from "./_generated/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return true when two timestamps fall on the same calendar day (UTC). */
function isSameUTCDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

/** Return true when timestamp `a` falls strictly before calendar day of `b` (UTC). */
function isBeforeUTCDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  // Compare midnight-UTC of each day
  const startOfA = Date.UTC(da.getUTCFullYear(), da.getUTCMonth(), da.getUTCDate());
  const startOfB = Date.UTC(db.getUTCFullYear(), db.getUTCMonth(), db.getUTCDate());
  return startOfA < startOfB;
}

/** Format an amount with the pool's currency for use in notification messages. */
function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-PH")}`;
}

// ---------------------------------------------------------------------------
// Internal mutation
// ---------------------------------------------------------------------------

export const checkPaymentNotifications = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Fetch all active pools
    const activePools = await ctx.db
      .query("pools")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const pool of activePools) {
      // 2. Find the current cycle for this pool
      const currentCycle = await ctx.db
        .query("payment_cycles")
        .withIndex("by_pool", (q) => q.eq("poolId", pool._id))
        .filter((q) => q.eq(q.field("status"), "current"))
        .unique();

      if (!currentCycle) continue;

      // 3. Get all member payments for this cycle
      const memberPayments = await ctx.db
        .query("member_payments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", currentCycle._id))
        .collect();

      for (const payment of memberPayments) {
        // Only notify members who have actually joined (have a userId)
        const member = await ctx.db.get(payment.memberId);
        if (!member?.userId) continue;

        const userId = member.userId;
        const amountStr = formatAmount(payment.amount, pool.currency);

        // -------------------------------------------------------------------
        // Case A: Payment due today (payout date === today, still pending)
        // -------------------------------------------------------------------
        if (
          payment.status === "pending" &&
          isSameUTCDay(currentCycle.payoutDate, now)
        ) {
          await ctx.db.insert("notifications", {
            userId,
            type: "payment_due",
            message: `Reminder: Your payment of ${amountStr} for "${pool.name}" is due today.`,
            poolId: pool._id,
            paymentId: payment._id,
            read: false,
            createdAt: now,
          });
          continue; // No need to also check overdue for the same payment today
        }

        // -------------------------------------------------------------------
        // Case B: Payment newly overdue (payout date is in the past, still pending)
        // -------------------------------------------------------------------
        if (
          payment.status === "pending" &&
          isBeforeUTCDay(currentCycle.payoutDate, now)
        ) {
          // Mark the payment overdue
          await ctx.db.patch(payment._id, { status: "overdue" });

          await ctx.db.insert("notifications", {
            userId,
            type: "payment_overdue",
            message: `Your payment of ${amountStr} for "${pool.name}" is overdue. Please submit payment as soon as possible.`,
            poolId: pool._id,
            paymentId: payment._id,
            read: false,
            createdAt: now,
          });
          continue;
        }

        // -------------------------------------------------------------------
        // Case C: Already-overdue payment that still hasn't been confirmed —
        //         send a daily reminder, but only if no unread overdue
        //         notification already exists for this user + pool combination
        //         (prevents notification spam on repeated cron runs).
        // -------------------------------------------------------------------
        if (payment.status === "overdue" && !payment.confirmedByOrganizer) {
          const existingUnread = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) =>
              q.and(
                q.eq(q.field("type"), "payment_overdue"),
                q.eq(q.field("poolId"), pool._id),
                q.eq(q.field("read"), false)
              )
            )
            .first();

          if (!existingUnread) {
            await ctx.db.insert("notifications", {
              userId,
              type: "payment_overdue",
              message: `Your payment of ${amountStr} for "${pool.name}" is overdue. Please submit payment as soon as possible.`,
              poolId: pool._id,
              paymentId: payment._id,
              read: false,
              createdAt: now,
            });
          }
        }
      }
    }
  },
});
