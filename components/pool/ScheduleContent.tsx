"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScheduleTimeline } from "@/components/pool/ScheduleTimeline";
import { Id } from "@/convex/_generated/dataModel";
import { ScheduleSkeleton } from "@/components/ui/Skeleton";

export function ScheduleContent({ poolId }: { poolId: string }) {
  const pool = useQuery(api.pools.getById, { poolId: poolId as Id<"pools"> });
  const cycles = useQuery(api.cycles.listByPool, { poolId: poolId as Id<"pools"> });
  const members = useQuery(api.members.listByPool, { poolId: poolId as Id<"pools"> });

  const sorted = [...(cycles ?? [])].sort((a, b) => a.cycleNumber - b.cycleNumber);

  const cycleItems = sorted.map((cycle) => {
    const recipient = members?.find((m) => m._id === cycle.recipientMemberId);
    return {
      cycleNumber: cycle.cycleNumber,
      payoutDate: cycle.payoutDate,
      totalAmount: cycle.totalAmount,
      currency: pool?.currency ?? "PHP",
      status: cycle.status,
      recipientName: recipient?.displayName ?? "",
      recipientEmail: recipient?.email ?? "",
    };
  });

  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 py-4">
      {!pool ? (
        <ScheduleSkeleton />
      ) : pool.status === "draft" ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-[#6b7280] text-sm text-center">
            Schedule will be generated once the Pool is started.
          </p>
        </div>
      ) : cycleItems.length === 0 ? (
        <ScheduleSkeleton />
      ) : (
        <ScheduleTimeline cycles={cycleItems} />
      )}
    </div>
  );
}
