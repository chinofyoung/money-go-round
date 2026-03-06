import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});

export const clearRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const read = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("read"), true))
      .collect();

    await Promise.all(read.map((n) => ctx.db.delete(n._id)));
  },
});

export const getPendingInvites = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const inviteNotifs = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "invite_received"),
          q.eq(q.field("read"), false)
        )
      )
      .order("desc")
      .collect();

    return Promise.all(
      inviteNotifs
        .filter((n) => n.invitationToken && n.poolId)
        .map(async (n) => {
          const pool = n.poolId ? await ctx.db.get(n.poolId) : null;
          const organizer = pool ? await ctx.db.get(pool.organizerId) : null;
          return {
            ...n,
            poolName: pool?.name ?? "Unknown Pool",
            contributionAmount: pool?.contributionAmount ?? 0,
            currency: pool?.currency ?? "PHP",
            organizerName: organizer?.name ?? "Unknown",
          };
        })
    );
  },
});

export const getUnreadCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();
    return unread.length;
  },
});
