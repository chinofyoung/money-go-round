/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as announcements from "../announcements.js";
import type * as cronHandlers from "../cronHandlers.js";
import type * as crons from "../crons.js";
import type * as cycles from "../cycles.js";
import type * as invitations from "../invitations.js";
import type * as members from "../members.js";
import type * as notifications from "../notifications.js";
import type * as paymentAccounts from "../paymentAccounts.js";
import type * as payments from "../payments.js";
import type * as pools from "../pools.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  cronHandlers: typeof cronHandlers;
  crons: typeof crons;
  cycles: typeof cycles;
  invitations: typeof invitations;
  members: typeof members;
  notifications: typeof notifications;
  paymentAccounts: typeof paymentAccounts;
  payments: typeof payments;
  pools: typeof pools;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
