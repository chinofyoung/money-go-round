import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export const create = mutation({
  args: {
    poolId: v.id("pools"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing pending invite
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email_pool", (q) =>
        q.eq("email", args.email).eq("poolId", args.poolId)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .unique();

    if (existing) return existing.token;

    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("invitations", {
      poolId: args.poolId,
      email: args.email,
      token,
      status: "pending",
      expiresAt,
    });

    // Add member record as invited
    await ctx.db.insert("pool_members", {
      poolId: args.poolId,
      email: args.email,
      status: "invited",
      invitedAt: Date.now(),
    });

    // Notify the invited user if they already have an account
    const pool = await ctx.db.get(args.poolId);
    const invitedUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (invitedUser && pool) {
      await ctx.db.insert("notifications", {
        userId: invitedUser._id,
        type: "invite_received",
        message: `You've been invited to join "${pool.name}"`,
        poolId: args.poolId,
        invitationToken: token,
        read: false,
        createdAt: Date.now(),
      });
    }

    return token;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) return null;

    const pool = await ctx.db.get(invitation.poolId);
    const organizer = pool ? await ctx.db.get(pool.organizerId) : null;
    const memberCount = await ctx.db
      .query("pool_members")
      .withIndex("by_pool", (q) => q.eq("poolId", invitation.poolId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return {
      invitation,
      pool,
      organizer,
      activeMemberCount: memberCount.length,
    };
  },
});

export const accept = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") throw new Error("Invitation already used");
    if (invitation.expiresAt < Date.now()) throw new Error("Invitation expired");

    // Update invitation status
    await ctx.db.patch(invitation._id, { status: "accepted" });

    // Update member record
    const member = await ctx.db
      .query("pool_members")
      .withIndex("by_email_pool", (q) =>
        q.eq("email", invitation.email).eq("poolId", invitation.poolId)
      )
      .unique();

    if (member) {
      await ctx.db.patch(member._id, {
        userId: args.userId,
        displayName: args.displayName,
        status: "active",
        joinedAt: Date.now(),
      });
    }

    // Mark invite_received notification as read
    const inviteNotification = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("invitationToken"), invitation.token))
      .first();
    if (inviteNotification) {
      await ctx.db.patch(inviteNotification._id, { read: true });
    }

    // Notify organizer
    const pool = await ctx.db.get(invitation.poolId);
    if (pool) {
      await ctx.db.insert("notifications", {
        userId: pool.organizerId,
        type: "member_joined",
        message: `${args.displayName} joined your Pool "${pool.name}"`,
        poolId: invitation.poolId,
        read: false,
        createdAt: Date.now(),
      });
    }

    return invitation.poolId;
  },
});

export const decline = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) throw new Error("Invitation not found");
    if (invitation.status !== "pending") throw new Error("Invitation already used");

    await ctx.db.patch(invitation._id, { status: "declined" });

    // Remove the invited member record
    const member = await ctx.db
      .query("pool_members")
      .withIndex("by_email_pool", (q) =>
        q.eq("email", invitation.email).eq("poolId", invitation.poolId)
      )
      .unique();

    if (member) {
      await ctx.db.patch(member._id, { status: "removed" });
    }

    // Mark invite_received notification as read
    const inviteNotification = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("invitationToken"), invitation.token))
      .first();
    if (inviteNotification) {
      await ctx.db.patch(inviteNotification._id, { read: true });
    }
  },
});
