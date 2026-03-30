"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { DashboardView } from "@/components/desktop/DashboardView";
import { PoolCard } from "@/components/pool/PoolCard";
import { StatCard } from "@/components/ui/StatCard";
import { GreenButton } from "@/components/ui/GreenButton";
import { Show } from "@clerk/nextjs";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { Plus, Repeat2, Users, CalendarDays } from "lucide-react";
import { PoolCardSkeleton, DashboardStatsSkeleton } from "@/components/ui/Skeleton";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Dashboard() {
  const router = useRouter();
  const { convexUser, isLoaded } = useCurrentUser();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const acceptInvitation = useMutation(api.invitations.accept);
  const declineInvitation = useMutation(api.invitations.decline);

  const pendingInvites = useQuery(
    api.notifications.getPendingInvites,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const poolData = useQuery(
    api.pools.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const organized = poolData?.organized ?? [];
  const member = (poolData?.member ?? []).filter(Boolean);
  const allPools = [...organized, ...member];
  const activePools = allPools.filter((r) => r?.status === "active");
  const totalContributions = activePools.reduce(
    (sum, r) => sum + (r?.contributionAmount ?? 0),
    0
  );

  async function handleAccept(token: string, notifId: string) {
    if (!convexUser) return;
    setActioningId(notifId);
    try {
      const poolId = await acceptInvitation({
        token,
        userId: convexUser._id,
        displayName: convexUser.name,
      });
      toast.success("You've joined the Pool!");
      router.push(`/pool/${poolId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setActioningId(null);
    }
  }

  async function handleDecline(token: string, notifId: string) {
    if (!convexUser) return;
    setActioningId(notifId);
    try {
      await declineInvitation({ token, userId: convexUser._id });
      toast.success("Invitation declined");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to decline");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <>
      {/* ── Signed-out: full landing screen ── */}
      <Show when="signed-out">
        <ResponsiveLayout showSidebar={false}>
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Atmospheric glow */}
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(74,222,128,0.09) 0%, transparent 70%)",
              animation: "glow-pulse 5s ease-in-out infinite",
            }}
          />

          {/* Hero */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16">
            {/* Logo mark */}
            <div
              className="relative mb-8"
              style={{ width: 88, height: 88, animation: "fade-up 0.5s ease both" }}
            >
              <svg viewBox="0 0 88 88" fill="none" className="absolute inset-0 w-full h-full">
                <circle cx="44" cy="44" r="40" stroke="#222" strokeWidth="1.5" />
                <circle cx="44" cy="44" r="27" stroke="#1e1e1e" strokeWidth="1" strokeDasharray="3 6" />
                <circle cx="44" cy="44" r="13" fill="url(#greenCore)" />
                <circle cx="44" cy="44" r="40" stroke="url(#greenArc)" strokeWidth="1.5" strokeDasharray="22 230" strokeLinecap="round" />
                <defs>
                  <radialGradient id="greenCore" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#86efac" />
                    <stop offset="100%" stopColor="#15803d" />
                  </radialGradient>
                  <linearGradient id="greenArc" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Orbiting dot */}
              <div
                className="absolute inset-0"
                style={{ animation: "spin-orbit 6s linear infinite", transformOrigin: "center" }}
              >
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    top: "50%",
                    left: "50%",
                    transform: "translate(calc(-50% + 40px), -50%)",
                    background: "#4ade80",
                    boxShadow: "0 0 8px #4ade80, 0 0 20px rgba(74,222,128,0.4)",
                  }}
                />
              </div>
            </div>

            {/* Wordmark */}
            <h1
              className="text-[2.25rem] font-bold text-white tracking-tight leading-none text-center mb-3"
              style={{ animation: "fade-up 0.5s ease 0.1s both" }}
            >
              Money Go Round
            </h1>

            {/* Tagline */}
            <p
              className="text-[#505050] text-center text-sm leading-relaxed mb-12 max-w-[210px]"
              style={{ animation: "fade-up 0.5s ease 0.2s both" }}
            >
              Save together. Get paid when it&apos;s your turn.
            </p>

            {/* Features */}
            <div
              className="w-full space-y-2.5"
              style={{ animation: "fade-up 0.5s ease 0.3s both" }}
            >
              {[
                {
                  Icon: Repeat2,
                  label: "Rotating payouts",
                  desc: "Everyone gets the full pot, guaranteed",
                },
                {
                  Icon: Users,
                  label: "Invite-only circles",
                  desc: "Your people. Your rules.",
                },
                {
                  Icon: CalendarDays,
                  label: "Stays organized",
                  desc: "Track contributions and schedules",
                },
              ].map(({ Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-3.5 bg-[#111111] border border-[#232323] rounded-2xl px-4 py-3.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-[#4ade80]" />
                  </div>
                  <div>
                    <p className="text-white text-[13px] font-semibold leading-snug">{label}</p>
                    <p className="text-[#4a4a4a] text-xs mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div
            className="px-6 pb-10 pt-6"
            style={{ animation: "fade-up 0.5s ease 0.4s both" }}
          >
            <Link href="/sign-in">
              <GreenButton size="lg" fullWidth>
                Continue with Google
              </GreenButton>
            </Link>
            <p className="text-center text-[#333] text-xs mt-4">
              By continuing you agree to our Terms &amp; Privacy Policy
            </p>
          </div>
        </div>
        </ResponsiveLayout>
      </Show>

      {/* ── Signed-in: dashboard ── */}
      <Show when="signed-in">
        <ResponsiveLayout desktopContent={<DashboardView />}>
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-12 pb-6">
            {/* Greeting */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {convexUser?.imageUrl ? (
                  <img
                    src={convexUser.imageUrl}
                    alt={convexUser.name ?? "Profile"}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2a2a2a] text-white text-sm font-semibold">
                    {convexUser?.name?.charAt(0) ?? "?"}
                  </div>
                )}
                <div>
                  <p className="text-[#6b7280] text-sm">Welcome back</p>
                  <h1 className="text-xl font-bold text-white">
                    {convexUser?.name?.split(" ")[0] ?? "—"}
                  </h1>
                </div>
              </div>
              <Link href="/pool/new">
                <button className="w-10 h-10 rounded-full bg-gradient-to-r from-[#4ade80] to-[#22c55e] flex items-center justify-center active:scale-95 transition-transform">
                  <Plus size={20} className="text-black font-bold" />
                </button>
              </Link>
            </div>

            {/* Stats */}
            {!isLoaded ? (
              <DashboardStatsSkeleton />
            ) : (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Active groups" value={String(activePools.length)} />
                <StatCard
                  label="Monthly"
                  value={formatCurrency(totalContributions, "PHP")}
                />
                <StatCard label="Total groups" value={String(allPools.length)} />
              </div>
            )}

            {/* Pending invites */}
            {pendingInvites && pendingInvites.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
                  Pending Invites
                </p>
                <div className="space-y-2">
                  {pendingInvites.map((inv) => (
                    <div
                      key={inv._id}
                      className="bg-[#1c1c1c] border border-[#4ade80]/20 rounded-2xl p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-[#4ade80]/10 flex items-center justify-center shrink-0">
                          <span className="text-sm">📩</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {inv.poolName}
                          </p>
                          <p className="text-xs text-[#6b7280]">
                            by {inv.organizerName} · {formatCurrency(inv.contributionAmount, inv.currency)}/cycle
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={actioningId === inv._id}
                          onClick={() => handleAccept(inv.invitationToken!, inv._id)}
                          className="flex-1 h-9 rounded-xl bg-[#4ade80] text-black text-xs font-semibold disabled:opacity-50"
                        >
                          {actioningId === inv._id ? "..." : "Accept"}
                        </button>
                        <button
                          disabled={actioningId === inv._id}
                          onClick={() => handleDecline(inv.invitationToken!, inv._id)}
                          className="flex-1 h-9 rounded-xl border border-[#2a2a2a] text-[#6b7280] text-xs font-medium disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pool list */}
            {!isLoaded ? (
              <div className="space-y-3">
                <PoolCardSkeleton />
                <PoolCardSkeleton />
              </div>
            ) : allPools.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="w-16 h-16 rounded-full bg-[#141414] flex items-center justify-center">
                  <Plus size={28} className="text-[#4ade80]" />
                </div>
                <p className="text-[#6b7280] text-sm text-center">
                  No Pools yet. Create one or wait for an invite.
                </p>
                <Link href="/pool/new">
                  <GreenButton>Create Pool</GreenButton>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {organized.map((r) =>
                  r ? (
                    <PoolCard
                      key={r._id}
                      id={r._id}
                      name={r.name}
                      contributionAmount={r.contributionAmount}
                      currency={r.currency}
                      status={r.status}
                      currentCycle={r.currentCycle}
                      maxMembers={r.maxMembers}
                      payoutSchedule={r.payoutSchedule}
                      isOrganizer
                      organizerIsMember={r.organizerIsMember}
                      recipientEarnings={r.recipientEarnings}
                    />
                  ) : null
                )}
                {member.map((r) =>
                  r ? (
                    <PoolCard
                      key={r._id}
                      id={r._id}
                      name={r.name}
                      contributionAmount={r.contributionAmount}
                      currency={r.currency}
                      status={r.status}
                      currentCycle={r.currentCycle}
                      maxMembers={r.maxMembers}
                      payoutSchedule={r.payoutSchedule}
                      organizerIsMember={r.organizerIsMember}
                      recipientEarnings={r.recipientEarnings}
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>
        </ResponsiveLayout>
      </Show>
    </>
  );
}
