"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Home, Wallet, Bell, User, LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/my-pools", label: "My Pools", icon: Wallet },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { convexUser } = useCurrentUser();
  const { signOut } = useClerk();

  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  return (
    <aside className="w-60 h-screen bg-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e] flex items-center justify-center">
          <span className="text-black text-xs font-bold">M</span>
        </div>
        <span className="text-white font-semibold text-sm">MoneyGoRound</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-[#4ade80]/10 text-[#4ade80]"
                  : "text-[#6b7280] hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {label === "Notifications" &&
                  unreadCount !== undefined &&
                  unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-[#f97316] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
              </div>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 pb-5 pt-3 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-3 px-3 py-2">
          {convexUser?.imageUrl ? (
            <img
              src={convexUser.imageUrl}
              alt={convexUser.name ?? "Profile"}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-white text-xs font-semibold">
              {convexUser?.name?.charAt(0) ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">
              {convexUser?.name ?? "—"}
            </p>
            <p className="text-xs text-[#6b7280] truncate">
              {convexUser?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[#6b7280] hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
