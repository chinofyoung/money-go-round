interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-[#6b7280]">{label}</span>
      <span className="text-base font-bold text-white leading-tight">{value}</span>
      {sub && <span className="text-xs text-[#6b7280]">{sub}</span>}
    </div>
  );
}
