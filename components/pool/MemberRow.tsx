import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface MemberRowProps {
  name: string;
  email: string;
  imageUrl?: string | null;
  payoutPosition?: number | null;
  status: "invited" | "active" | "completed" | "removed";
  isRecipient?: boolean;
  action?: React.ReactNode;
}

export function MemberRow({
  name,
  email,
  imageUrl,
  payoutPosition,
  status,
  isRecipient,
  action,
}: MemberRowProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative">
        <Avatar src={imageUrl} name={name || email} size="md" />
        {payoutPosition && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#4ade80] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
            {payoutPosition}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {name || email}
          {isRecipient && (
            <span className="ml-2 text-[10px] text-[#4ade80] font-semibold">
              RECIPIENT
            </span>
          )}
        </p>
        <p className="text-xs text-[#6b7280] truncate">{email}</p>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {action}
      </div>
    </div>
  );
}
