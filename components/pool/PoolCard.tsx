import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/format";

interface PoolCardProps {
  id: string;
  name: string;
  contributionAmount: number;
  currency: string;
  status: "draft" | "active" | "completed" | "cancelled";
  currentCycle: number;
  maxMembers: number;
  payoutSchedule: string;
  isOrganizer?: boolean;
}

const scheduleLabel: Record<string, string> = {
  weekly:       "Weekly",
  biweekly:     "Every 2 weeks",
  mid_month:    "Mid-month (15th)",
  end_of_month: "End of month",
};

export function PoolCard({
  id,
  name,
  contributionAmount,
  currency,
  status,
  currentCycle,
  maxMembers,
  payoutSchedule,
  isOrganizer,
}: PoolCardProps) {
  const progress = maxMembers > 0 ? (currentCycle / maxMembers) * 100 : 0;

  return (
    <Link
      href={`/pool/${id}`}
      className="block bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 active:bg-[#1c1c1c] transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-white text-sm truncate">{name}</h3>
            {isOrganizer && (
              <span className="shrink-0 text-[10px] text-[#4ade80] font-medium bg-[#4ade80]/10 px-1.5 py-0.5 rounded-full">
                Organizer
              </span>
            )}
          </div>
          <p className="text-xs text-[#6b7280]">{scheduleLabel[payoutSchedule]}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-[#4ade80]">
          {formatCurrency(contributionAmount, currency)}
        </span>
        <span className="text-xs text-[#6b7280]">/ cycle</span>
      </div>

      <ProgressBar value={progress} />

      <div className="flex justify-between mt-2">
        <span className="text-xs text-[#6b7280]">
          Cycle {currentCycle} of {maxMembers}
        </span>
        <span className="text-xs text-[#6b7280]">
          {formatCurrency(contributionAmount * maxMembers, currency)} total
        </span>
      </div>
    </Link>
  );
}
