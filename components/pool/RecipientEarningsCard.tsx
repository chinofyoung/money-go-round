import { formatCurrency } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface RecipientEarningsCardProps {
  paidCount: number;
  totalMembers: number;
  contributionAmount: number;
  currency: string;
}

export function RecipientEarningsCard({
  paidCount,
  totalMembers,
  contributionAmount,
  currency,
}: RecipientEarningsCardProps) {
  const received = paidCount * contributionAmount;
  const total = totalMembers * contributionAmount;
  const remaining = total - received;
  const progress = totalMembers > 0 ? (paidCount / totalMembers) * 100 : 0;

  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
      <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider">
        Your Earnings
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0a0a0a] rounded-xl p-3">
          <p className="text-xs text-[#6b7280] mb-1">Received</p>
          <p className="text-lg font-bold text-[#4ade80]">
            {formatCurrency(received, currency)}
          </p>
          <p className="text-xs text-[#6b7280]">
            {paidCount} of {totalMembers} paid
          </p>
        </div>
        <div className="bg-[#0a0a0a] rounded-xl p-3">
          <p className="text-xs text-[#6b7280] mb-1">Remaining</p>
          <p className="text-lg font-bold text-white">
            {formatCurrency(remaining, currency)}
          </p>
          <p className="text-xs text-[#6b7280]">
            {totalMembers - paidCount} pending
          </p>
        </div>
      </div>
      <ProgressBar value={progress} />
    </div>
  );
}
