import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface MemberRowProps {
  name: string;
  email: string;
  imageUrl?: string | null;
  status: "invited" | "active" | "completed" | "removed";
  isRecipient?: boolean;
  action?: React.ReactNode;
}

export function MemberRow({
  name,
  email,
  imageUrl,
  status,
  isRecipient,
  action,
}: MemberRowProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar src={imageUrl} name={name || email} size="md" />

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
