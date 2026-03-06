type Status = "active" | "draft" | "completed" | "cancelled" | "pending" | "paid" | "overdue" | "invited" | "removed";

const config: Record<Status, { label: string; classes: string }> = {
  active:    { label: "Active",    classes: "bg-green-500/15 text-green-400" },
  draft:     { label: "Draft",     classes: "bg-white/10 text-gray-400" },
  completed: { label: "Completed", classes: "bg-blue-500/15 text-blue-400" },
  cancelled: { label: "Cancelled", classes: "bg-red-500/15 text-red-400" },
  pending:   { label: "Pending",   classes: "bg-yellow-500/15 text-yellow-400" },
  paid:      { label: "Paid",      classes: "bg-green-500/15 text-green-400" },
  overdue:   { label: "Overdue",   classes: "bg-orange-500/15 text-orange-400" },
  invited:   { label: "Invited",   classes: "bg-purple-500/15 text-purple-400" },
  removed:   { label: "Removed",   classes: "bg-red-500/15 text-red-400" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, classes } = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
