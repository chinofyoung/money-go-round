"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { BottomNav } from "./BottomNav";

export function MobileContainer({ children }: { children: React.ReactNode }) {
  const { convexUser } = useCurrentUser();
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  return (
    <div className="h-[100dvh] bg-slate-900 flex justify-center overflow-hidden">
      <div className="bg-black w-full max-w-[430px] flex flex-col h-full relative">
        {children}
        <BottomNav unreadCount={unreadCount ?? 0} />
      </div>
    </div>
  );
}
