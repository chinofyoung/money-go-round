interface ProgressBarProps {
  value: number; // 0–100
  color?: "green" | "orange" | "yellow";
  className?: string;
}

export function ProgressBar({ value, color = "green", className = "" }: ProgressBarProps) {
  const fill = {
    green:  "bg-gradient-to-r from-[#4ade80] to-[#22c55e]",
    orange: "bg-[#f97316]",
    yellow: "bg-[#eab308]",
  }[color];

  return (
    <div className={`h-1.5 w-full rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${fill}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
