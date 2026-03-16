"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { GreenButton } from "@/components/ui/GreenButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SignInButton } from "@clerk/nextjs";
import { formatCurrency, SCHEDULE_LABELS } from "@/lib/format";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Users, Calendar, DollarSign } from "lucide-react";
import { JoinPageSkeleton } from "@/components/ui/Skeleton";

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { clerkUser, convexUser } = useCurrentUser();
  const [joining, setJoining] = useState(false);
  const [declining, setDeclining] = useState(false);

  const data = useQuery(api.invitations.getByToken, { token });
  const acceptInvitation = useMutation(api.invitations.accept);
  const declineInvitation = useMutation(api.invitations.decline);

  async function handleJoin() {
    if (!convexUser) return;
    setJoining(true);
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
      setJoining(false);
    }
  }

  async function handleDecline() {
    if (!convexUser) return;
    setDeclining(true);
    try {
      await declineInvitation({ token, userId: convexUser._id });
      toast.success("Invitation declined");
      router.push("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to decline");
    } finally {
      setDeclining(false);
    }
  }

  if (data === undefined) {
    return (
      <ResponsiveLayout showSidebar={false}>
        <JoinPageSkeleton />
      </ResponsiveLayout>
    );
  }

  if (!data || !data.pool) {
    return (
      <ResponsiveLayout showSidebar={false}>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <p className="text-2xl">🔗</p>
          <h1 className="text-xl font-bold text-white text-center">
            Invite link not found
          </h1>
          <p className="text-[#6b7280] text-sm text-center">
            This link may have expired or already been used.
          </p>
        </div>
      </ResponsiveLayout>
    );
  }

  const { pool, organizer, activeMemberCount, invitation } = data;
  const isExpired = invitation.expiresAt < Date.now();
  const isFinalized = invitation.status === "accepted" || invitation.status === "declined";

  return (
    <ResponsiveLayout showSidebar={false}>
      <div className="flex-1 overflow-y-auto pb-8 px-4 pt-16">
        <div className="text-center mb-8">
          <p className="text-[#6b7280] text-sm mb-1">You're invited to join</p>
          <h1 className="text-2xl font-bold text-white mb-2">{pool.name}</h1>
          <p className="text-sm text-[#6b7280]">
            Organized by {organizer?.name ?? "Unknown"}
          </p>
        </div>

        {/* Pool details */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <DollarSign size={16} className="text-[#4ade80]" />
            <div className="flex-1">
              <p className="text-xs text-[#6b7280]">Contribution per cycle</p>
              <p className="text-base font-bold text-[#4ade80]">
                {formatCurrency(pool.contributionAmount, pool.currency)}
              </p>
            </div>
          </div>
          <div className="h-px bg-[#2a2a2a]" />
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-[#6b7280]" />
            <div>
              <p className="text-xs text-[#6b7280]">Payout schedule</p>
              <p className="text-sm text-white">{SCHEDULE_LABELS[pool.payoutSchedule]}</p>
            </div>
          </div>
          <div className="h-px bg-[#2a2a2a]" />
          <div className="flex items-center gap-3">
            <Users size={16} className="text-[#6b7280]" />
            <div>
              <p className="text-xs text-[#6b7280]">Members</p>
              <p className="text-sm text-white">
                {activeMemberCount} joined
              </p>
            </div>
          </div>
          <div className="h-px bg-[#2a2a2a]" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#6b7280]">Status</p>
            <StatusBadge status={pool.status} />
          </div>
        </div>

        {/* Total pot callout */}
        <div className="bg-[#4ade80]/5 border border-[#4ade80]/20 rounded-2xl p-4 mb-6 text-center">
          <p className="text-xs text-[#6b7280] mb-1">Total pot per member receives</p>
          <p className="text-3xl font-bold text-[#4ade80]">
            {formatCurrency(pool.contributionAmount * activeMemberCount, pool.currency)}
          </p>
        </div>

        {/* CTA */}
        {isExpired || isFinalized ? (
          <div className="text-center">
            <p className="text-[#6b7280] text-sm">
              {invitation.status === "accepted"
                ? "This invite has already been accepted."
                : invitation.status === "declined"
                ? "This invite was declined."
                : "This invite link has expired."}
            </p>
          </div>
        ) : !clerkUser ? (
          <div className="space-y-3">
            <p className="text-[#6b7280] text-sm text-center">
              Sign in with Google to join this Pool.
            </p>
            <SignInButton>
              <GreenButton fullWidth size="lg">
                Sign in with Google to Join
              </GreenButton>
            </SignInButton>
          </div>
        ) : (
          <div className="space-y-3">
            <GreenButton fullWidth size="lg" disabled={joining || declining} onClick={handleJoin}>
              {joining ? "Joining…" : "Join Pool"}
            </GreenButton>
            <button
              disabled={joining || declining}
              onClick={handleDecline}
              className="w-full h-12 rounded-full border border-[#2a2a2a] text-[#6b7280] text-sm font-medium disabled:opacity-50"
            >
              {declining ? "Declining…" : "Decline"}
            </button>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}
