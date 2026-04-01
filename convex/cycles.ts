import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByPool = query({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payment_cycles")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();
  },
});

export const getCurrentCycle = query({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payment_cycles")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .filter((q) => q.eq(q.field("status"), "current"))
      .unique();
  },
});

export const advanceCycle = mutation({
  args: {
    poolId: v.id("pools"),
    organizerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const pool = await ctx.db.get(args.poolId);
    if (!pool) throw new Error("Pool not found");
    if (pool.status !== "active") {
      throw new Error("Pool must be active to advance a cycle");
    }

    const currentCycle = await ctx.db
      .query("payment_cycles")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .filter((q) => q.eq(q.field("status"), "current"))
      .unique();
    if (!currentCycle) throw new Error("No current cycle found for this pool");

    // Allow organizer or current cycle recipient
    const recipientMember = await ctx.db.get(currentCycle.recipientMemberId);
    const isOrganizer = pool.organizerId === args.organizerId;
    const isRecipient = recipientMember?.userId === args.organizerId;
    if (!isOrganizer && !isRecipient) {
      throw new Error("Only the pool organizer or cycle recipient can advance the cycle");
    }

    await ctx.db.patch(currentCycle._id, { status: "completed" });

    const nextCycle = await ctx.db
      .query("payment_cycles")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .filter((q) =>
        q.eq(q.field("cycleNumber"), currentCycle.cycleNumber + 1)
      )
      .unique();

    const activeMembers = await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (nextCycle) {
      await ctx.db.patch(nextCycle._id, { status: "current" });
      await ctx.db.patch(args.poolId, { currentCycle: nextCycle.cycleNumber });

      const advanceMessage = `Cycle ${currentCycle.cycleNumber} of "${pool.name}" is complete. Cycle ${nextCycle.cycleNumber} has started.`;
      for (const member of activeMembers) {
        if (!member.userId) continue;
        await ctx.db.insert("notifications", {
          userId: member.userId,
          type: "cycle_advanced",
          message: advanceMessage,
          poolId: args.poolId,
          read: false,
          createdAt: Date.now(),
        });
      }

      const recipient = await ctx.db.get(nextCycle.recipientMemberId);
      if (recipient?.userId) {
        await ctx.db.insert("notifications", {
          userId: recipient.userId,
          type: "payout_upcoming",
          message: `You are the recipient for Cycle ${nextCycle.cycleNumber} of "${pool.name}". Payments will be sent to you this cycle.`,
          poolId: args.poolId,
          read: false,
          createdAt: Date.now(),
        });
      }
    } else {
      await ctx.db.patch(args.poolId, { status: "completed" });

      const completedMessage = `"${pool.name}" has been completed! All cycles are done.`;
      for (const member of activeMembers) {
        if (!member.userId) continue;
        await ctx.db.insert("notifications", {
          userId: member.userId,
          type: "payout_received",
          message: completedMessage,
          poolId: args.poolId,
          read: false,
          createdAt: Date.now(),
        });
      }
    }
  },
});
