"use client";

import { ButtonHTMLAttributes } from "react";

interface GreenButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}

export function GreenButton({
  children,
  fullWidth = false,
  size = "md",
  className = "",
  disabled,
  ...props
}: GreenButtonProps) {
  const sizeClasses = {
    sm: "h-10 px-5 text-sm",
    md: "h-12 px-6 text-base",
    lg: "h-14 px-8 text-base",
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        "rounded-full font-semibold text-black transition-opacity flex items-center",
        "bg-gradient-to-r from-[#4ade80] to-[#22c55e]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "active:scale-[0.98]",
        fullWidth ? "w-full" : "",
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
