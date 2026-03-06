"use client";

import { cn } from "@/lib/utils";

// ─── Base shimmer primitive ────────────────────────────────────────────────
// All skeletons are built from this. The shimmer travels left-to-right over
// a dark base, matching the app's #141414 card background.

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-[#1a1a1a]",
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-white/[0.04] before:to-transparent",
        "before:translate-x-[-100%] before:animate-[shimmer_1.6s_ease-in-out_infinite]",
        className
      )}
    />
  );
}

// ─── Pool Card skeleton ────────────────────────────────────────────────────
// Matches PoolCard: name + badge row, large amount, progress bar, footer row.

export function PoolCardSkeleton() {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
      {/* Name row */}
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1 mr-4">
          <Skeleton className="h-4 w-2/3 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* Amount */}
      <Skeleton className="h-7 w-28 rounded-md" />
      {/* Progress bar */}
      <Skeleton className="h-1.5 w-full rounded-full" />
      {/* Footer */}
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-3 w-24 rounded-md" />
      </div>
    </div>
  );
}

// ─── Dashboard stats skeleton ──────────────────────────────────────────────
// Matches the 3-column StatCard grid on the home dashboard.

export function DashboardStatsSkeleton() {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 grid grid-cols-3 gap-4 mb-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-14 rounded-md" />
          <Skeleton className="h-5 w-10 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── Pool detail page skeleton ─────────────────────────────────────────────
// Matches the full layout of pool/[id]/page.tsx:
// stats card → cycle card → quick links → members preview.

export function PoolDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 space-y-3">
      {/* Stats card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-12 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-14 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-1 border-t border-[#2a2a2a]">
          <Skeleton className="h-3 w-10 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-3 w-10 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>

      {/* Cycle card */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-32 rounded-md" />
        {/* Recipient row */}
        <div className="bg-[#141414] rounded-xl p-3 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <div className="space-y-1.5 text-right">
            <Skeleton className="h-3 w-16 rounded-md ml-auto" />
            <Skeleton className="h-3 w-12 rounded-md ml-auto" />
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3.5 ${i < 2 ? "border-b border-[#2a2a2a]" : ""}`}
          >
            <Skeleton className="h-4.5 w-4.5 rounded-md shrink-0" />
            <Skeleton className="h-4 flex-1 max-w-[120px] rounded-md" />
          </div>
        ))}
      </div>

      {/* Members preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-3 w-12 rounded-md" />
        </div>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 divide-y divide-[#2a2a2a]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Payment review page skeleton ─────────────────────────────────────────
// Matches pool/[id]/payments/[paymentId]/page.tsx layout:
// member info card → proof of payment card.

export function PaymentReviewSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
      {/* Member info card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="pt-3 border-t border-[#2a2a2a] space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3.5 w-16 rounded-md" />
              <Skeleton className="h-3.5 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Proof of payment card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        <Skeleton className="h-3 w-32 rounded-md" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── Join page skeleton ────────────────────────────────────────────────────
// Matches join/[token]/page.tsx: header, details card, total pot callout.

export function JoinPageSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pb-8 px-4 pt-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-3 w-32 rounded-md" />
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-3 w-36 rounded-md" />
      </div>

      {/* Details card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
            </div>
            {i < 3 && <div className="h-px bg-[#2a2a2a] mt-3" />}
          </div>
        ))}
      </div>

      {/* Total pot callout */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 flex flex-col items-center gap-2">
        <Skeleton className="h-3 w-40 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      {/* CTA buttons */}
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

// ─── Members page skeleton ─────────────────────────────────────────────────
// Matches members/page.tsx: section label + member rows.

export function MembersPageSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 space-y-4">
      <div>
        <Skeleton className="h-3 w-24 rounded-md mb-2" />
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 divide-y divide-[#2a2a2a]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-3 w-36 rounded-md" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Payments page skeleton ────────────────────────────────────────────────
// Matches payments/page.tsx: cycle card + payment rows.

export function PaymentsPageSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 space-y-4 pt-2">
      {/* Cycle card */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-32 rounded-md" />
        <div className="bg-[#141414] rounded-xl p-3 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
        </div>
      </div>

      {/* My contribution card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>

      {/* All contributions list */}
      <div>
        <Skeleton className="h-3 w-36 rounded-md mb-2" />
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 divide-y divide-[#2a2a2a]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Notifications page skeleton ───────────────────────────────────────────
// Matches notifications/page.tsx: notification rows.

export function NotificationsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 space-y-2 pt-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex gap-3 p-4 rounded-2xl border border-[#2a2a2a] bg-[#141414]"
        >
          <Skeleton className="h-7 w-7 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-4/5 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Profile page skeleton ─────────────────────────────────────────────────
// Matches profile/page.tsx: avatar card + stats grid.

export function ProfileSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4">
      {/* Profile card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-3.5 w-44 rounded-md" />
        </div>
      </div>

      {/* Stats */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>

      {/* Sign out button placeholder */}
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

// ─── My Pools page skeleton ────────────────────────────────────────────────
// Matches my-pools/page.tsx: section label + pool cards.

export function MyPoolsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-2 space-y-4">
      <div>
        <Skeleton className="h-3 w-20 rounded-md mb-2" />
        <div className="space-y-3">
          <PoolCardSkeleton />
          <PoolCardSkeleton />
        </div>
      </div>
    </div>
  );
}

// ─── Edit pool page skeleton ───────────────────────────────────────────────
// Matches edit/page.tsx: form fields before data loads.

export function EditPoolSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-28 rounded-md" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32 rounded-md" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── Schedule page skeleton ────────────────────────────────────────────────
// Matches schedule/page.tsx: timeline rows.

export function ScheduleSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 py-4 space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3">
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center shrink-0 pt-1">
            <Skeleton className="h-3 w-3 rounded-full" />
            {i < 4 && <div className="w-px h-10 bg-[#2a2a2a] mt-1" />}
          </div>
          {/* Cycle row content */}
          <div className="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-xl p-3 space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-3.5 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
