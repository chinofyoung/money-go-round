import { v } from "convex/values";
import { query } from "./_generated/server";

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
