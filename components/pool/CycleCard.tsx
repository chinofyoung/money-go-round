import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/format";

interface CycleCardProps {
  cycleNumber: number;
  totalCycles: number;
  recipientName: string;
  recipientEmail: string;
  recipientImage?: string | null;
  payoutDate: number;
  totalAmount: number;
  currency: string;
  paidCount: number;
  totalMembers: number;
}

export function CycleCard({
  cycleNumber,
  totalCycles,
  recipientName,
  recipientEmail,
  recipientImage,
  payoutDate,
  totalAmount,
  currency,
  paidCount,
  totalMembers,
}: CycleCardProps) {
  const progress = totalMembers > 0 ? (paidCount / totalMembers) * 100 : 0;

  return (
    <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-[#6b7280]">Current Cycle</p>
          <p className="text-sm font-semibold text-white">
            Cycle {cycleNumber} of {totalCycles}
          </p>
        </div>
        <span className="text-xl font-bold text-[#4ade80]">
          {formatCurrency(totalAmount, currency)}
        </span>
      </div>

      <ProgressBar value={progress} className="mb-2" />
      <p className="text-xs text-[#6b7280] mb-3">
        {paidCount} of {totalMembers} members paid
      </p>

      <div className="flex items-center gap-3 bg-[#141414] rounded-xl p-3">
        <Avatar src={recipientImage} name={recipientName || recipientEmail} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#6b7280]">Payout recipient</p>
          <p className="text-sm font-semibold text-white truncate">
            {recipientName || recipientEmail}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6b7280]">Payout date</p>
          <p className="text-xs font-medium text-white">{formatDate(payoutDate)}</p>
        </div>
      </div>
    </div>
  );
}
