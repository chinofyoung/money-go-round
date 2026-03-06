import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const listByPool = query({
  args: { poolId: v.id("pools") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("announcements")
      .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
      .order("desc")
      .take(50);
  },
});

export const post = mutation({
  args: {
    poolId: v.id("pools"),
    authorId: v.id("users"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("announcements", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.announcementId);
  },
});