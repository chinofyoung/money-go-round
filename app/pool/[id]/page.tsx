"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CycleCard } from "@/components/pool/CycleCard";
import { MemberRow } from "@/components/pool/MemberRow";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GreenButton } from "@/components/ui/GreenButton";
import { formatCurrency, formatDate, SCHEDULE_LABELS } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Users, Calendar, MessageSquare, ChevronRight, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { PoolDetailSkeleton } from "@/components/ui/Skeleton";

function computeEndDate(
  startDate: number,
  schedule: string,
  numMembers: number
): number {
  const date = new Date(startDate);
  const i = numMembers - 1;
  if (schedule === "weekly") {
    date.setDate(date.getDate() + i * 7);
  } else if (schedule === "biweekly") {
    date.setDate(date.getDate() + i * 14);
  } else if (schedule === "mid_month") {
    date.setMonth(date.getMonth() + i);
    date.setDate(15);
  } else if (schedule === "end_of_month") {
    date.setMonth(date.getMonth() + i + 1);
    date.setDate(0);
  }
  return date.getTime();
}

function toDateInputValue(ts: number) {
  return new Date(ts).toISOString().split("T")[0];
}

export default function PoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { convexUser } = useCurrentUser();
  const activate = useMutation(api.pools.activate);
  const removePool = useMutation(api.pools.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pool= useQuery(api.pools.getById, { poolId: id as Id<"pools"> });
  const members = useQuery(api.members.listByPool, { poolId: id as Id<"pools"> });
  const currentCycle = useQuery(api.cycles.getCurrentCycle, { poolId: id as Id<"pools"> });
  const cyclePayments = useQuery(
    api.payments.listByCycle,
    currentCycle ? { cycleId: currentCycle._id } : "skip"
  );

  const today = toDateInputValue(Date.now());
  const [startDateInput, setStartDateInput] = useState(today);
  const [starting, setStarting] = useState(false);

  if (!pool) {
    return (
      <MobileContainer>
        <PageHeader title="Pool" />
        <PoolDetailSkeleton />
      </MobileContainer>
    );
  }

  const isOrganizer = convexUser?._id === pool.organizerId;
  const activeMembers = members?.filter((m) => m.status === "active") ?? [];
  const paidCount = cyclePayments?.filter((p) => p.confirmedByOrganizer).length ?? 0;

  const recipient = currentCycle
    ? members?.find((m) => m._id === currentCycle.recipientMemberId)
    : null;

  const myMember = members?.find((m) => m.userId === convexUser?._id);
  const isRecipient = myMember?._id === currentCycle?.recipientMemberId;
  const myPayment = cyclePayments?.find((p) => p.memberId === myMember?._id);

  const startTs = new Date(startDateInput).getTime();
  const endDate = computeEndDate(startTs, pool.payoutSchedule, pool.maxMembers);

  async function handleStart() {
    setStarting(true);
    try {
      await activate({ poolId: id as Id<"pools">, startDate: startTs });
      toast.success("Pool started!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start pool");
    } finally {
      setStarting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await removePool({ poolId: id as Id<"pools"> });
      toast.success("Pool deleted");
      router.replace("/my-pools");
    } catch {
      toast.error("Failed to delete pool.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const quickLinks = [
    { href: `members`, label: "Members", icon: Users, count: activeMembers.length },
    { href: `schedule`, label: "Schedule", icon: Calendar, count: pool.maxMembers },
    { href: `announce`, label: "Announcements", icon: MessageSquare },
  ];

  return (
    <MobileContainer>
      <PageHeader
        title={pool.name}
        action={
          isOrganizer ? (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 active:bg-white/10"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
              <Link
                href={`/pool/${id}/edit`}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 active:bg-white/10"
              >
                <Pencil size={16} className="text-[#6b7280]" />
              </Link>
            </>
          ) : (
            <StatusBadge status={pool.status} />
          )
        }
      />

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-8">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Delete this pool?</p>
                <p className="text-xs text-[#6b7280]">This permanently deletes all data.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-11 rounded-xl border border-[#2a2a2a] text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-6 px-4 pt-4 space-y-3">
        {/* Stats */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6b7280]">Status</span>
            <StatusBadge status={pool.status} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Per cycle"
              value={formatCurrency(pool.contributionAmount, pool.currency)}
            />
            <StatCard
              label="Total pot"
              value={formatCurrency(
                pool.contributionAmount * pool.maxMembers,
                pool.currency
              )}
            />
            <StatCard
              label="Schedule"
              value={SCHEDULE_LABELS[pool.payoutSchedule]}
            />
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-[#2a2a2a]">
            <span className="text-[#6b7280]">Verifies payments</span>
            <span className="text-white capitalize">
              {pool.paymentVerifier === "recipient" ? "Cycle recipient" : "Organizer"}
            </span>
          </div>
          {pool.startDate && (
            <div className="flex justify-between text-xs pt-1 border-t border-[#2a2a2a]">
              <span className="text-[#6b7280]">Starts</span>
              <span className="text-white">{formatDate(pool.startDate)}</span>
              <span className="text-[#6b7280]">Ends</span>
              <span className="text-white">
                {formatDate(computeEndDate(pool.startDate, pool.payoutSchedule, pool.maxMembers))}
              </span>
            </div>
          )}
        </div>

        {/* Current cycle */}
        {pool.status === "active" && currentCycle && recipient && (
          <div className="space-y-3">
            <Link href={`/pool/${id}/payments`} className="block">
              <CycleCard
                cycleNumber={currentCycle.cycleNumber}
                totalCycles={pool.maxMembers}
                recipientName={recipient.displayName ?? ""}
                recipientEmail={recipient.email}
                payoutDate={currentCycle.payoutDate}
                totalAmount={currentCycle.totalAmount}
                currency={pool.currency}
                paidCount={paidCount}
                totalMembers={activeMembers.length - 1}
              />
            </Link>

            {/* Action banner */}
            {isRecipient ? (
              <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#4ade80]">You&apos;re receiving this cycle!</p>
                  <p className="text-xs text-[#6b7280]">No payment needed — you&apos;ll receive the pot on {formatDate(currentCycle.payoutDate)}.</p>
                </div>
              </div>
            ) : myPayment?.status === "pending" ? (
              <Link
                href={`/pool/${id}/payments`}
                className="flex items-center gap-3 bg-[#4ade80] rounded-2xl p-4 active:bg-[#3bcb6e] transition-colors"
              >
                <span className="text-xl">💸</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-black">Pay Now</p>
                  <p className="text-xs text-black/60">
                    Upload your {formatCurrency(pool.contributionAmount, pool.currency)} payment proof
                  </p>
                </div>
                <ChevronRight size={20} className="text-black/40" />
              </Link>
            ) : myPayment?.status === "paid" && !myPayment.confirmedByOrganizer ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-xl">⏳</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-400">Payment submitted</p>
                  <p className="text-xs text-[#6b7280]">Waiting for organizer to confirm.</p>
                </div>
              </div>
            ) : myPayment?.confirmedByOrganizer ? (
              <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-xl">✅</span>
                <p className="text-sm text-[#4ade80]">Your payment has been confirmed.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Draft state */}
        {pool.status === "draft" && isOrganizer && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280]">
                {activeMembers.length} of {pool.maxMembers} members joined
              </span>
              <Link href={`/pool/${id}/invite`} className="text-xs text-[#4ade80]">
                + Invite
              </Link>
            </div>

            <div>
              <label className="text-xs text-[#6b7280] mb-1.5 block">Start date</label>
              <div className="relative rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] overflow-hidden focus-within:border-[#4ade80]">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none" />
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full max-w-full min-w-0 bg-transparent rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-between text-xs text-[#6b7280] bg-[#0a0a0a] rounded-xl px-4 py-2.5">
              <span>Estimated end date</span>
              <span className="text-white font-medium">{formatDate(endDate)}</span>
            </div>

            <GreenButton
              fullWidth
              disabled={starting || activeMembers.length < 2}
              onClick={handleStart}
            >
              {starting ? "Starting…" : "Start Pool"}
            </GreenButton>
            {activeMembers.length < 2 && (
              <p className="text-xs text-[#6b7280] text-center">
                Need at least 2 members to start
              </p>
            )}
          </div>
        )}

        {pool.status === "draft" && !isOrganizer && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#6b7280]">
              {activeMembers.length} of {pool.maxMembers} members joined
            </p>
          </div>
        )}

        {/* Quick nav links */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {quickLinks.map((link, idx) => (
            <Link
              key={link.href}
              href={`/pool/${id}/${link.href}`}
              className={`flex items-center gap-3 px-4 py-3.5 active:bg-white/5 ${
                idx < quickLinks.length - 1 ? "border-b border-[#2a2a2a]" : ""
              }`}
            >
              <link.icon size={18} className="text-[#6b7280]" />
              <span className="flex-1 text-sm text-white">{link.label}</span>
              {link.count !== undefined && (
                <span className="text-xs text-[#6b7280] mr-1">{link.count}</span>
              )}
              <ChevronRight size={16} className="text-[#6b7280]" />
            </Link>
          ))}
        </div>

        {/* Recent members preview */}
        {activeMembers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Members</h3>
              <Link href={`/pool/${id}/members`} className="text-xs text-[#4ade80]">
                See all
              </Link>
            </div>
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 divide-y divide-[#2a2a2a]">
              {activeMembers.slice(0, 4).map((member) => (
                <MemberRow
                  key={member._id}
                  name={member.displayName ?? ""}
                  email={member.email}
                  payoutPosition={member.payoutPosition}
                  status={member.status}
                  isRecipient={member._id === currentCycle?.recipientMemberId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileContainer>
  );
}
