"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({ title, showBack = true, action }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-4 bg-[#0a0a0a]/95 backdrop-blur z-10">
      <div className="w-10">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 text-white active:bg-white/10"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>
      <h1 className="text-base font-semibold text-white">{title}</h1>
      <div className="flex items-center justify-end gap-2">{action}</div>
    </header>
  );
}
