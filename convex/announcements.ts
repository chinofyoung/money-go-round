import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    const id = await ctx.db.insert("announcements", {
      ...args,
      createdAt: Date.now(),
    });

    // Notify all active pool members (except the author)
    const pool = await ctx.db.get(args.poolId);
    if (pool) {
      const members = await ctx.db
        .query("pool_members")
        .withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const preview =
        args.message.length > 60
          ? args.message.slice(0, 60) + "…"
          : args.message;

      await Promise.all(
        members
          .filter((m) => m.userId && m.userId !== args.authorId)
          .map((m) =>
            ctx.db.insert("notifications", {
              userId: m.userId!,
              type: "announcement_posted",
              message: `New announcement in "${pool.name}": ${preview}`,
              poolId: args.poolId,
              read: false,
              createdAt: Date.now(),
            })
          )
      );
    }

    return id;
  },
});

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.announcementId);
  },
});