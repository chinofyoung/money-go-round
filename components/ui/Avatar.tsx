interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#4ade80]/30 to-[#22c55e]/30 font-semibold text-green-300`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
