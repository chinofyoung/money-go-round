import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByPool = query({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .collect();
  },
});

export const updatePayoutOrder = mutation({
  args: {
    updates: v.array(
      v.object({
        memberId: v.id("pool_members"),
        payoutPosition: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const { memberId, payoutPosition } of args.updates) {
      await ctx.db.patch(memberId, { payoutPosition });
    }
  },
});

export const remove = mutation({
  args: { memberId: v.id("pool_members") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, { status: "removed" });
  },
});

export const acceptInvite = mutation({
  args: {
    memberId: v.id("pool_members"),
    userId: v.id("users"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, {
      userId: args.userId,
      displayName: args.displayName,
      status: "active",
      joinedAt: Date.now(),
    });
  },
});
