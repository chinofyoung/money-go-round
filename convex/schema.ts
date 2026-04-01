import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  pools: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    organizerId: v.id("users"),
    contributionAmount: v.number(),
    currency: v.string(),
    payoutSchedule: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("mid_month"),
      v.literal("end_of_month")
    ),
    orderType: v.union(
      v.literal("assigned"),
      v.literal("random")
    ),
    paymentVerifier: v.optional(v.union(
      v.literal("organizer"),
      v.literal("recipient")
    )),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    maxMembers: v.number(),
    currentCycle: v.number(),
    startDate: v.optional(v.number()),
  }).index("by_organizer", ["organizerId"]),

  pool_members: defineTable({
    poolId: v.id("pools"),
    userId: v.optional(v.id("users")),
    email: v.string(),
    displayName: v.optional(v.string()),
    payoutPosition: v.optional(v.number()),
    status: v.union(
      v.literal("invited"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("removed")
    ),
    joinedAt: v.optional(v.number()),
    invitedAt: v.number(),
  })
    .index("by_pool", ["poolId"])
    .index("by_user", ["userId"])
    .index("by_email_pool", ["email", "poolId"]),

  invitations: defineTable({
    poolId: v.id("pools"),
    email: v.string(),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("declined")
    ),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_email_pool", ["email", "poolId"]),

  payment_cycles: defineTable({
    poolId: v.id("pools"),
    cycleNumber: v.number(),
    recipientMemberId: v.id("pool_members"),
    payoutDate: v.number(),
    totalAmount: v.number(),
    status: v.union(
      v.literal("upcoming"),
      v.literal("current"),
      v.literal("completed")
    ),
  }).index("by_pool", ["poolId"]),

  member_payments: defineTable({
    cycleId: v.id("payment_cycles"),
    memberId: v.id("pool_members"),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue")
    ),
    paidAt: v.optional(v.number()),
    proofStorageId: v.optional(v.id("_storage")),
    confirmedByOrganizer: v.boolean(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_member", ["memberId"]),

  payment_accounts: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("ewallet"), v.literal("bank")),
    provider: v.string(),
    accountName: v.string(),
    accountNumber: v.optional(v.string()),
    qrCodeStorageId: v.optional(v.id("_storage")),
  }).index("by_user", ["userId"]),

  announcements: defineTable({
    poolId: v.optional(v.id("pools")),
    authorId: v.id("users"),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_pool", ["poolId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("payment_due"),
      v.literal("payment_submitted"),
      v.literal("payment_confirmed"),
      v.literal("payment_rejected"),
      v.literal("payment_overdue"),
      v.literal("cycle_advanced"),
      v.literal("payout_upcoming"),
      v.literal("payout_received"),
      v.literal("member_joined"),
      v.literal("order_assigned"),
      v.literal("pool_started"),
      v.literal("invite_received"),
      v.literal("announcement_posted")
    ),
    message: v.string(),
    poolId: v.optional(v.id("pools")),
    invitationToken: v.optional(v.string()),
    paymentId: v.optional(v.id("member_payments")),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
