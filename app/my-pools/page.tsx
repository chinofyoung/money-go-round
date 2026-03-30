"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { DesktopPoolsGrid } from "@/components/desktop/DesktopPoolsGrid";
import { PageHeader } from "@/components/layout/PageHeader";
import { PoolCard } from "@/components/pool/PoolCard";
import { GreenButton } from "@/components/ui/GreenButton";
import Link from "next/link";
import { MyPoolsSkeleton } from "@/components/ui/Skeleton";

export default function MyPoolsPage() {
  const { convexUser } = useCurrentUser();

  const poolData = useQuery(
    api.pools.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const organized = poolData?.organized ?? [];
  const member = (poolData?.member ?? []).filter(Boolean);

  if (poolData === undefined) {
    return (
      <ResponsiveLayout desktopContent={<DesktopPoolsGrid />}>
        <PageHeader title="My Pools" showBack={false} />
        <MyPoolsSkeleton />
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout desktopContent={<DesktopPoolsGrid />}>
      <PageHeader title="My Pools" showBack={false} />

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4">
        {organized.length > 0 && (
          <div>
            <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
              Organizing
            </p>
            <div className="space-y-3">
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
          <div>
            <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
              Participating
            </p>
            <div className="space-y-3">
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
            <p className="text-[#6b7280] text-sm text-center">
              You're not part of any Pool yet.
            </p>
            <Link href="/pool/new">
              <GreenButton>Create Pool</GreenButton>
            </Link>
          </div>
        )}
      </div>

    </ResponsiveLayout>
  );
}
