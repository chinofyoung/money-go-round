"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PoolCard } from "@/components/pool/PoolCard";
import { GreenButton } from "@/components/ui/GreenButton";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Zap, Calendar, Activity } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export function DashboardView() {
  const router = useRouter();
  const { convexUser, isLoaded } = useCurrentUser();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const acceptInvitation = useMutation(api.invitations.accept);
  const declineInvitation = useMutation(api.invitations.decline);

  const pendingInvites = useQuery(
    api.notifications.getPendingInvites,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const poolData = useQuery(
    api.pools.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const notifications = useQuery(
    api.notifications.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const organized = poolData?.organized ?? [];
  const member = (poolData?.member ?? []).filter(Boolean);
  const allPools = [...organized, ...member];
  const activePools = allPools.filter((r) => r?.status === "active");
  const totalContributions = activePools.reduce(
    (sum, r) => sum + (r?.contributionAmount ?? 0),
    0
  );

  // Action items from notifications
  const actionItems = (notifications ?? []).filter(
    (n) =>
      !n.read &&
      (n.type === "payment_due" ||
        n.type === "payment_submitted" ||
        n.type === "payout_upcoming")
  );

  // Recent activity (last 10 notifications)
  const recentActivity = (notifications ?? []).slice(0, 10);

  async function handleAccept(token: string, notifId: string) {
    if (!convexUser) return;
    setActioningId(notifId);
    try {
      const poolId = await acceptInvitation({
        token,
        userId: convexUser._id,
        displayName: convexUser.name,
      });
      toast.success("You've joined the Pool!");
      router.push(`/pool/${poolId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setActioningId(null);
    }
  }

  async function handleDecline(token: string, notifId: string) {
    if (!convexUser) return;
    setActioningId(notifId);
    try {
      await declineInvitation({ token, userId: convexUser._id });
      toast.success("Invitation declined");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to decline");
    } finally {
      setActioningId(null);
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {convexUser?.name?.split(" ")[0] ?? "—"}!
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">{today}</p>
        </div>
        <Link href="/pool/new">
          <GreenButton>
            <Plus size={16} className="mr-2" />
            Create Pool
          </GreenButton>
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Left column — main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Stats row */}
          {isLoaded && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Active Pools</p>
                <p className="text-2xl font-bold text-white">
                  {activePools.length}
                </p>
              </div>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Monthly Total</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalContributions, "PHP")}
                </p>
              </div>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Total Pools</p>
                <p className="text-2xl font-bold text-white">
                  {allPools.length}
                </p>
              </div>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Total Members</p>
                <p className="text-2xl font-bold text-white">—</p>
              </div>
            </div>
          )}

          {/* Action items */}
          {actionItems.length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-[#f59e0b]" />
                <h2 className="text-sm font-semibold text-[#f59e0b]">
                  Action Items
                </h2>
              </div>
              <div className="space-y-2">
                {actionItems.slice(0, 5).map((item) => (
                  <Link
                    key={item._id}
                    href={item.poolId ? `/pool/${item.poolId}` : "#"}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#4ade80]/30 transition-colors"
                  >
                    <span className="text-sm">
                      {item.type === "payment_due"
                        ? "💸"
                        : item.type === "payment_submitted"
                          ? "🔍"
                          : "📋"}
                    </span>
                    <p className="text-sm text-white flex-1">{item.message}</p>
                    <span className="text-xs text-[#6b7280]">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pools grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                My Pools
              </h2>
              <Link
                href="/my-pools"
                className="text-xs text-[#4ade80] hover:underline"
              >
                View all →
              </Link>
            </div>
            {allPools.length === 0 ? (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <Plus size={24} className="text-[#4ade80]" />
                </div>
                <p className="text-sm text-[#6b7280]">
                  No pools yet. Create one or wait for an invite.
                </p>
                <Link href="/pool/new">
                  <GreenButton>Create Pool</GreenButton>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {allPools.slice(0, 6).map((r) =>
                  r ? (
                    <PoolCard
                      key={r._id}
                      id={r._id}
                      name={r.name}
                      contributionAmount={r.contributionAmount}
                      currency={r.currency}
                      status={r.status}
                      currentCycle={r.currentCycle}
                      maxMembers={r.maxMembers}
                      payoutSchedule={r.payoutSchedule}
                      organizerIsMember={r.organizerIsMember}
                      recipientEarnings={r.recipientEarnings}
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column — secondary info */}
        <div className="w-72 shrink-0 space-y-6">
          {/* Pending invitations */}
          {pendingInvites && pendingInvites.length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
                Invitations
              </h2>
              <div className="space-y-3">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv._id}
                    className="bg-[#0a0a0a] rounded-xl p-3 space-y-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white truncate">
                        {inv.poolName}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        by {inv.organizerName} ·{" "}
                        {formatCurrency(inv.contributionAmount, inv.currency)}
                        /cycle
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={actioningId === inv._id}
                        onClick={() =>
                          handleAccept(inv.invitationToken!, inv._id)
                        }
                        className="flex-1 h-8 rounded-lg bg-[#4ade80] text-black text-xs font-semibold disabled:opacity-50"
                      >
                        {actioningId === inv._id ? "..." : "Accept"}
                      </button>
                      <button
                        disabled={actioningId === inv._id}
                        onClick={() =>
                          handleDecline(inv.invitationToken!, inv._id)
                        }
                        className="flex-1 h-8 rounded-lg border border-[#2a2a2a] text-[#6b7280] text-xs font-medium disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming schedule */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-[#6b7280]" />
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                Upcoming
              </h2>
            </div>
            {activePools.length === 0 ? (
              <p className="text-xs text-[#6b7280]">
                No upcoming payouts yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activePools.slice(0, 5).map((pool) =>
                  pool ? (
                    <Link
                      key={pool._id}
                      href={`/pool/${pool._id}/schedule`}
                      className="block p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <p className="text-xs font-medium text-white truncate">
                        {pool.name}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        {formatCurrency(pool.contributionAmount, pool.currency)}
                        /cycle
                      </p>
                    </Link>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#6b7280]" />
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                Activity
              </h2>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-[#6b7280]">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.slice(0, 8).map((n) => (
                  <div key={n._id} className="flex items-start gap-2 py-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-[#2a2a2a]" : "bg-[#4ade80]"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-[#d1d5db] line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-[#6b7280] mt-0.5">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
