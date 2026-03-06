import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByCycle = query({
  args: { cycleId: v.id("payment_cycles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("member_payments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();
  },
});

export const markPaid = mutation({
  args: {
    paymentId: v.id("member_payments"),
    proofStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: "paid",
      paidAt: Date.now(),
      proofStorageId: args.proofStorageId,
    });

    // Notify the verifier (organizer or cycle recipient)
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return;
    const member = await ctx.db.get(payment.memberId);
    const cycle = await ctx.db.get(payment.cycleId);
    const pool = cycle ? await ctx.db.get(cycle.poolId) : null;
    if (pool && member && cycle) {
      let verifierUserId = pool.organizerId;
      if (pool.paymentVerifier === "recipient") {
        const recipientMember = await ctx.db.get(cycle.recipientMemberId);
        if (recipientMember?.userId) {
          verifierUserId = recipientMember.userId;
        }
      }
      const memberName = member.displayName || member.email;
      await ctx.db.insert("notifications", {
        userId: verifierUserId,
        type: "payment_submitted",
        message: `${memberName} submitted payment for "${pool.name}" — tap to review.`,
        poolId: cycle.poolId,
        paymentId: args.paymentId,
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

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
      const cycle = await ctx.db.get(payment.cycleId);
      const pool = cycle ? await ctx.db.get(cycle.poolId) : null;
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "payment_confirmed",
        message: `Your payment for "${pool?.name ?? "Pool"}" was confirmed.`,
        poolId: cycle?.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }

    // Check if all payments in this cycle are confirmed → advance cycle
    const allPayments = await ctx.db
      .query("member_payments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", payment.cycleId))
      .collect();

    const allConfirmed = allPayments.every((p) =>
      p._id === args.paymentId ? true : p.confirmedByOrganizer
    );

    if (allConfirmed) {
      const cycle = await ctx.db.get(payment.cycleId);
      if (cycle) {
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
        } else {
          // All cycles done
          await ctx.db.patch(cycle.poolId, { status: "completed" });
        }
      }
    }
  },
});

export const rejectPayment = mutation({
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
          throw new Error("Not authorized to reject this payment");
        }
      } else if (pool.organizerId !== args.organizerId) {
        throw new Error("Not authorized to reject this payment");
      }
    }

    // Reset to pending and clear proof
    await ctx.db.patch(args.paymentId, {
      status: "pending",
      paidAt: undefined,
      proofStorageId: undefined,
      confirmedByOrganizer: false,
    });

    // Notify the member
    const member = await ctx.db.get(payment.memberId);
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
  },
});

export const getPaymentDetail = query({
  args: { paymentId: v.id("member_payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return null;

    const member = await ctx.db.get(payment.memberId);
    const cycle = await ctx.db.get(payment.cycleId);
    const pool = cycle ? await ctx.db.get(cycle.poolId) : null;
    const proofUrl = payment.proofStorageId
      ? await ctx.storage.getUrl(payment.proofStorageId)
      : null;

    // Get the verifier's payment accounts (where payers should send money)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let verifierAccounts: any[] = [];
    if (pool && cycle) {
      let verifierUserId = pool.organizerId;
      if (pool.paymentVerifier === "recipient") {
        const recipientMember = await ctx.db.get(cycle.recipientMemberId);
        if (recipientMember?.userId) verifierUserId = recipientMember.userId;
      }
      const accounts = await ctx.db
        .query("payment_accounts")
        .withIndex("by_user", (q) => q.eq("userId", verifierUserId))
        .collect();
      verifierAccounts = await Promise.all(
        accounts.map(async (acc) => ({
          ...acc,
          qrCodeUrl: acc.qrCodeStorageId
            ? await ctx.storage.getUrl(acc.qrCodeStorageId)
            : null,
        }))
      );
    }

    return {
      payment,
      member,
      cycle,
      pool,
      proofUrl,
      verifierAccounts,
    };
  },
});

export const getVerifierAccounts = query({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    const pool = await ctx.db.get(args.poolId);
    if (!pool) return [];

    let verifierUserId = pool.organizerId;
    if (pool.paymentVerifier === "recipient") {
      const currentCycle = await ctx.db
        .query("payment_cycles")
        .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
        .filter((q) => q.eq(q.field("status"), "current"))
        .unique();
      if (currentCycle) {
        const recipientMember = await ctx.db.get(currentCycle.recipientMemberId);
        if (recipientMember?.userId) verifierUserId = recipientMember.userId;
      }
    }

    const accounts = await ctx.db
      .query("payment_accounts")
      .withIndex("by_user", (q) => q.eq("userId", verifierUserId))
      .collect();

    return Promise.all(
      accounts.map(async (acc) => ({
        ...acc,
        qrCodeUrl: acc.qrCodeStorageId
          ? await ctx.storage.getUrl(acc.qrCodeStorageId)
          : null,
      }))
    );
  },
});

export const markOverdue = mutation({
  args: { paymentId: v.id("member_payments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, { status: "overdue" });
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getProofUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
