import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { CheckCircle, Clock } from "lucide-react";

interface PaymentRowProps {
  name: string;
  email: string;
  imageUrl?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue";
  confirmedByOrganizer: boolean;
  hasProof?: boolean;
  onConfirm?: () => void;
  onViewProof?: () => void;
  isOrganizer?: boolean;
}

export function PaymentRow({
  name,
  email,
  imageUrl,
  amount,
  currency,
  status,
  confirmedByOrganizer,
  hasProof,
  onConfirm,
  onViewProof,
  isOrganizer,
}: PaymentRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#2a2a2a] last:border-0">
      <Avatar src={imageUrl} name={name || email} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name || email}</p>
        <p className="text-xs text-[#6b7280]">{formatCurrency(amount, currency)}</p>
      </div>

      <div className="flex items-center gap-2">
        {hasProof && onViewProof && (
          <button
            onClick={onViewProof}
            className="text-xs text-[#4ade80] underline underline-offset-2"
          >
            Proof
          </button>
        )}

        {status === "paid" && !confirmedByOrganizer && isOrganizer && onConfirm && (
          <button
            onClick={onConfirm}
            className="flex items-center gap-1 text-xs bg-[#4ade80]/10 text-[#4ade80] px-2 py-1 rounded-full"
          >
            <CheckCircle size={12} />
            Confirm
          </button>
        )}

        {status === "paid" && confirmedByOrganizer ? (
          <CheckCircle size={16} className="text-[#4ade80]" />
        ) : status === "pending" ? (
          <Clock size={16} className="text-[#6b7280]" />
        ) : (
          <StatusBadge status={status} />
        )}
      </div>
    </div>
  );
}
