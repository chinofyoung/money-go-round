import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("payment_accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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

export const add = mutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("ewallet"), v.literal("bank")),
    provider: v.string(),
    accountName: v.string(),
    accountNumber: v.optional(v.string()),
    qrCodeStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payment_accounts", args);
  },
});

export const update = mutation({
  args: {
    accountId: v.id("payment_accounts"),
    provider: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    qrCodeStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { accountId, ...fields }) => {
    await ctx.db.patch(accountId, fields);
  },
});

export const remove = mutation({
  args: { accountId: v.id("payment_accounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (account?.qrCodeStorageId) {
      await ctx.storage.delete(account.qrCodeStorageId);
    }
    await ctx.db.delete(args.accountId);
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
