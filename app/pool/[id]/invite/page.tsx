"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Check, Home, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  const { convexUser } = useCurrentUser();
  const createInvitation = useMutation(api.invitations.create);
  const pool = useQuery(api.pools.getById, { poolId: id as Id<"pools"> });
  const members = useQuery(api.members.listByPool, { poolId: id as Id<"pools"> });
  const allUsers = useQuery(api.users.listAll);

  const activeCount = members?.filter((m) => m.status === "active").length ?? 0;
  const invitedCount = members?.filter((m) => m.status === "invited").length ?? 0;

  // Emails already in the pool (active or invited)
  const memberEmails = new Set(
    members
      ?.filter((m) => m.status === "active" || m.status === "invited")
      .map((m) => m.email) ?? []
  );

  // Filter users: exclude organizer and already-in-pool members
  const availableUsers = (allUsers ?? []).filter((u) => {
    if (u._id === convexUser?._id) return false; // exclude organizer
    if (memberEmails.has(u.email)) return false; // already in pool
    if (invited.includes(u.email)) return false; // just invited this session
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  async function handleInvite(email: string, userId: string) {
    setLoadingId(userId);
    try {
      await createInvitation({
        poolId: id as Id<"pools">,
        email,
      });
      setInvited((prev) => [email, ...prev]);
      toast.success("Invite sent!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <MobileContainer>
      <PageHeader title="Invite Members" />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
        {/* Pool info */}
        {pool && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
            <p className="text-sm font-semibold text-white mb-1">{pool.name}</p>
            <p className="text-xs text-[#6b7280]">
              {activeCount} of {pool.maxMembers} members joined
              {invitedCount > 0 && ` · ${invitedCount} pending`}
            </p>
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input
            type="text"
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* User list */}
        {availableUsers.length > 0 ? (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl divide-y divide-[#2a2a2a]">
            {availableUsers.map((user) => (
              <div key={user._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar src={user.imageUrl} name={user.name || user.email} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => handleInvite(user.email, user._id)}
                  disabled={loadingId === user._id}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-[#4ade80] text-black text-xs font-semibold active:opacity-80 disabled:opacity-50 transition-opacity"
                >
                  {loadingId === user._id ? "..." : "Invite"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280] text-center py-6">
            {search.trim() ? "No users found" : "All users have been invited"}
          </p>
        )}

        {/* Recently invited */}
        {invited.length > 0 && (
          <div>
            <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
              Just invited
            </p>
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl divide-y divide-[#2a2a2a]">
              {invited.map((e) => (
                <div key={e} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-[#4ade80]/10 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-[#4ade80]" />
                  </div>
                  <span className="text-sm text-white truncate">{e}</span>
                  <span className="text-xs text-[#4ade80] shrink-0">Sent</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to home */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 h-12 rounded-full border border-[#2a2a2a] text-white text-sm font-medium active:bg-white/5 transition-colors"
        >
          <Home size={16} />
          Back to Home
        </Link>
      </div>
    </MobileContainer>
  );
}
