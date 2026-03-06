"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Bell, User } from "lucide-react";

const tabs = [
  { href: "/",              label: "Home",          icon: Home },
  { href: "/my-pools",    label: "My Pools",      icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile",      label: "Profile",        icon: User },
];

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 bg-[#141414] border-t border-[#2a2a2a] flex items-center justify-around px-2 pb-safe">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-colors ${
              active ? "text-[#4ade80]" : "text-[#6b7280]"
            }`}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {label === "Notifications" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f97316] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium ${active ? "text-[#4ade80]" : "text-[#6b7280]"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
