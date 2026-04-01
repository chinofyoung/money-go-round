import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const create = mutation({
  args: {
    organizerId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    contributionAmount: v.number(),
    currency: v.string(),
    payoutSchedule: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("mid_month"),
      v.literal("end_of_month")
    ),
    orderType: v.union(v.literal("assigned"), v.literal("random")),
    paymentVerifier: v.union(v.literal("organizer"), v.literal("recipient")),
    startDate: v.optional(v.number()),
    joinAsOrganizer: v.optional(v.boolean()),
    organizerName: v.optional(v.string()),
    organizerEmail: v.optional(v.string()),
  },
  handler: async (ctx, { joinAsOrganizer, organizerName, organizerEmail, ...rest }) => {
    const poolId = await ctx.db.insert("pools", {
      ...rest,
      maxMembers: 0,
      status: "draft",
      currentCycle: 0,
    });

    if (joinAsOrganizer && organizerEmail) {
      await ctx.db.insert("pool_members", {
        poolId,
        userId: rest.organizerId,
        email: organizerEmail,
        displayName: organizerName,
        status: "active",
        invitedAt: Date.now(),
        joinedAt: Date.now(),
      });
    }

    return poolId;
  },
});

export const update = mutation({
  args: {
    poolId: v.id("pools"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    contributionAmount: v.optional(v.number()),
    currency: v.optional(v.string()),
    payoutSchedule: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("biweekly"),
        v.literal("mid_month"),
        v.literal("end_of_month")
      )
    ),
    paymentVerifier: v.optional(
      v.union(v.literal("organizer"), v.literal("recipient"))
    ),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { poolId, ...fields } = args;
    await ctx.db.patch(poolId, fields);
  },
});

export const getById = query({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.poolId);
  },
});

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Pools the user organizes
    const organized = await ctx.db
      .query("pools")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.userId))
      .collect();

    // Pools the user is a member of
    const memberships = await ctx.db
      .query("pool_members")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const memberPoolIds = new Set(memberships.map((m) => m.poolId));
    const organizedIds = new Set(organized.map((r) => r._id));

    const memberPools = await Promise.all(
      [...memberPoolIds]
        .filter((id) => !organizedIds.has(id))
        .map((id) => ctx.db.get(id))
    );

    // Helper: enrich a pool with organizer-as-member flag and recipient earnings
    async function enrichPool(pool: Doc<"pools">) {
      const organizerMember = await ctx.db
        .query("pool_members")
        .withIndex("by_user", (q) => q.eq("userId", pool.organizerId))
        .filter((q) => q.eq(q.field("poolId"), pool._id))
        .first();

      let recipientEarnings: { paidCount: number; totalPayingMembers: number } | undefined;

      if (pool.status === "active") {
        const currentCycle = await ctx.db
          .query("payment_cycles")
          .withIndex("by_pool", (q) => q.eq("poolId", pool._id))
          .filter((q) => q.eq(q.field("status"), "current"))
          .unique();

        if (currentCycle) {
          // Find the user's member record in this pool
          const userMember = await ctx.db
            .query("pool_members")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("poolId"), pool._id))
            .first();

          if (userMember && currentCycle.recipientMemberId === userMember._id) {
            const payments = await ctx.db
              .query("member_payments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", currentCycle._id))
              .collect();

            // Exclude the recipient's own payment record
            const otherPayments = payments.filter((p) => p.memberId !== userMember._id);
            const paidCount = otherPayments.filter((p) => p.confirmedByOrganizer).length;
            recipientEarnings = { paidCount, totalPayingMembers: otherPayments.length };
          }
        }
      }

      return { ...pool, organizerIsMember: organizerMember !== null, recipientEarnings };
    }

    const organizedWithFlag = await Promise.all(organized.map(enrichPool));

    const memberPoolsWithFlag = await Promise.all(
      memberPools.filter(Boolean).map(async (pool) => {
        if (!pool) return null;
        return enrichPool(pool);
      })
    );

    return {
      organized: organizedWithFlag,
      member: memberPoolsWithFlag.filter(Boolean),
    };
  },
});

export const activate = mutation({
  args: {
    poolId: v.id("pools"),
    startDate: v.number(),
  },
  handler: async (ctx, args) => {
    const pool = await ctx.db.get(args.poolId);
    if (!pool) throw new Error("Pool not found");

    const members = await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (members.length < 2) throw new Error("Need at least 2 active members");

    // Random draw if orderType is "random"
    if (pool.orderType === "random") {
      const shuffled = [...members].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await ctx.db.patch(shuffled[i]._id, { payoutPosition: i + 1 });
      }
    }

    // Generate all payment cycles
    const sortedMembers = await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    sortedMembers.sort((a, b) => (a.payoutPosition ?? 0) - (b.payoutPosition ?? 0));

    const payingMembers = sortedMembers.filter(m => m.userId !== pool.organizerId);
    const payingCount = payingMembers.length;
    const totalAmount = pool.contributionAmount * payingCount;

    for (let i = 0; i < sortedMembers.length; i++) {
      const payoutDate = computePayoutDate(args.startDate, pool.payoutSchedule, i);
      const cycleId = await ctx.db.insert("payment_cycles", {
        poolId: args.poolId,
        cycleNumber: i + 1,
        recipientMemberId: sortedMembers[i]._id,
        payoutDate,
        totalAmount,
        status: i === 0 ? "current" : "upcoming",
      });

      // Skip the recipient — they don't pay themselves in their own cycle
      for (const member of payingMembers) {
        if (member._id === sortedMembers[i]._id) continue;
        await ctx.db.insert("member_payments", {
          cycleId,
          memberId: member._id,
          amount: pool.contributionAmount,
          status: "pending",
          confirmedByOrganizer: false,
        });
      }
    }

    // Notify all members that the pool has started
    for (const member of sortedMembers) {
      if (!member.userId) continue;
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "pool_started",
        message: `"${pool.name}" has started! Check your payout schedule.`,
        poolId: args.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.poolId, {
      status: "active",
      currentCycle: 1,
      startDate: args.startDate,
      maxMembers: sortedMembers.length,
    });
  },
});

export const cancel = mutation({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.poolId, { status: "cancelled" });
  },
});

export const remove = mutation({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    const pool = await ctx.db.get(args.poolId);
    if (!pool) throw new Error("Pool not found");

    // Delete all related data
    const members = await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email_pool")
      .collect();
    for (const inv of invitations) {
      if (inv.poolId === args.poolId) await ctx.db.delete(inv._id);
    }

    const cycles = await ctx.db
      .query("payment_cycles")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();
    for (const cycle of cycles) {
      const payments = await ctx.db
        .query("member_payments")
        .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
        .collect();
      for (const p of payments) await ctx.db.delete(p._id);
      await ctx.db.delete(cycle._id);
    }

    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();
    for (const a of announcements) await ctx.db.delete(a._id);

    await ctx.db.delete(args.poolId);
  },
});

function computePayoutDate(
  startDate: number,
  schedule: "weekly" | "biweekly" | "mid_month" | "end_of_month",
  cycleIndex: number
): number {
  const date = new Date(startDate);

  if (schedule === "weekly") {
    date.setDate(date.getDate() + cycleIndex * 7);
  } else if (schedule === "biweekly") {
    date.setDate(date.getDate() + cycleIndex * 14);
  } else if (schedule === "mid_month") {
    date.setMonth(date.getMonth() + cycleIndex);
    date.setDate(15);
  } else if (schedule === "end_of_month") {
    date.setMonth(date.getMonth() + cycleIndex + 1);
    date.setDate(0);
  }

  return date.getTime();
}
