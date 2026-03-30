"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PoolCard } from "@/components/pool/PoolCard";
import { GreenButton } from "@/components/ui/GreenButton";
import Link from "next/link";
import { Plus } from "lucide-react";

export function DesktopPoolsGrid() {
  const { convexUser } = useCurrentUser();

  const poolData = useQuery(
    api.pools.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const organized = poolData?.organized ?? [];
  const member = (poolData?.member ?? []).filter(Boolean);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">My Pools</h1>
        <Link href="/pool/new">
          <GreenButton>
            <Plus size={16} className="mr-2" />
            Create Pool
          </GreenButton>
        </Link>
      </div>

      {organized.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-4">
            Organizing
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {organized.map((r) =>
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
                  isOrganizer
                  organizerIsMember={r.organizerIsMember}
                  recipientEarnings={r.recipientEarnings}
                />
              ) : null
            )}
          </div>
        </div>
      )}

      {member.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-4">
            Participating
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {member.map((r) =>
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
        </div>
      )}

      {organized.length === 0 && member.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-14 h-14 rounded-full bg-[#141414] flex items-center justify-center">
            <Plus size={24} className="text-[#4ade80]" />
          </div>
          <p className="text-[#6b7280] text-sm text-center">
            You&apos;re not part of any Pool yet.
          </p>
          <Link href="/pool/new">
            <GreenButton>Create Pool</GreenButton>
          </Link>
        </div>
      )}
    </div>
  );
}
