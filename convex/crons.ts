import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internalApi = internal as any;

const crons = cronJobs();

crons.daily(
  "check payment notifications",
  { hourUTC: 0, minuteUTC: 0 }, // 8:00 AM PHT (UTC+8)
  internalApi.cronHandlers.checkPaymentNotifications,
);

export default crons;
