"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Id } from "@/convex/_generated/dataModel";
import { use } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Check, Home, Mail } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);

  const createInvitation = useMutation(api.invitations.create);
  const pool = useQuery(api.pools.getById, { poolId: id as Id<"pools"> });
  const members = useQuery(api.members.listByPool, { poolId: id as Id<"pools"> });

  const activeCount = members?.filter((m) => m.status === "active").length ?? 0;
  const invitedCount = members?.filter((m) => m.status === "invited").length ?? 0;

  // Emails already in the pool (active or invited)
  const memberEmails = new Set(
    members
      ?.filter((m) => m.status === "active" || m.status === "invited")
      .map((m) => m.email) ?? []
  );

  async function handleInvite() {
    const trimmed = email.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (memberEmails.has(trimmed)) {
      setError("This person is already in the pool.");
      return;
    }

    if (invited.includes(trimmed)) {
      setError("You already invited this email in this session.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await createInvitation({
        poolId: id as Id<"pools">,
        email: trimmed,
      });
      setEmail("");
      setInvited((prev) => [trimmed, ...prev]);
      toast.success("Invite sent!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleInvite();
  }

  return (
    <ResponsiveLayout>
      <PageHeader title="Invite Members" />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
        {/* Pool info */}
        {pool && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
            <p className="text-sm font-semibold text-white mb-1">{pool.name}</p>
            <p className="text-xs text-[#6b7280]">
              {activeCount} members joined
              {invitedCount > 0 && ` · ${invitedCount} pending`}
            </p>
          </div>
        )}

        {/* Email input + send button */}
        <div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
              <input
                type="email"
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={loading}
              className="shrink-0 px-4 py-3 rounded-xl bg-[#4ade80] text-black text-sm font-semibold active:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {loading ? "..." : "Send Invite"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>

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
    </ResponsiveLayout>
  );
}
