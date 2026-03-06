import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency, formatDate } from "@/lib/format";

interface CycleItem {
  cycleNumber: number;
  payoutDate: number;
  totalAmount: number;
  currency: string;
  status: "upcoming" | "current" | "completed";
  recipientName: string;
  recipientEmail: string;
  recipientImage?: string | null;
}

export function ScheduleTimeline({ cycles }: { cycles: CycleItem[] }) {
  return (
    <div className="flex flex-col">
      {cycles.map((cycle, idx) => (
        <div key={cycle.cycleNumber} className="flex gap-3">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                cycle.status === "completed"
                  ? "bg-[#4ade80]"
                  : cycle.status === "current"
                  ? "bg-[#4ade80] ring-2 ring-[#4ade80]/30"
                  : "bg-[#2a2a2a]"
              }`}
            />
            {idx < cycles.length - 1 && (
              <div
                className={`w-px flex-1 my-1 ${
                  cycle.status === "completed" ? "bg-[#4ade80]/40" : "bg-[#2a2a2a]"
                }`}
              />
            )}
          </div>

          {/* Content */}
          <div
            className={`flex-1 pb-4 ${
              cycle.status === "current" ? "opacity-100" : "opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs font-medium ${
                  cycle.status === "current" ? "text-[#4ade80]" : "text-[#6b7280]"
                }`}
              >
                Cycle {cycle.cycleNumber}
                {cycle.status === "current" && " · Current"}
                {cycle.status === "completed" && " · Done"}
              </span>
              <span className="text-xs text-[#6b7280]">{formatDate(cycle.payoutDate)}</span>
            </div>

            <div className="flex items-center gap-2 bg-[#141414] rounded-xl p-2.5">
              <Avatar
                src={cycle.recipientImage}
                name={cycle.recipientName || cycle.recipientEmail}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {cycle.recipientName || cycle.recipientEmail}
                </p>
              </div>
              <span className="text-sm font-bold text-[#4ade80] shrink-0">
                {formatCurrency(cycle.totalAmount, cycle.currency)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
