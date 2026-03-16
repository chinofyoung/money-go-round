# Desktop Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a desktop dashboard view (≥1024px) with sidebar navigation, while keeping the existing mobile UI completely untouched.

**Architecture:** A `ResponsiveLayout` component uses CSS-only classes (`hidden lg:flex` / `lg:hidden`) to switch between the existing mobile shell and a new desktop shell. Desktop-specific components live in `components/desktop/`. Pool sub-page content is extracted into shared components so both mobile pages and desktop tabs can reuse them.

**Tech Stack:** Next.js 16 (App Router), React 19, Convex, Clerk, Tailwind CSS 4, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-16-desktop-dashboard-design.md`

**Known tradeoffs:**
- CSS-first layout (`hidden lg:flex` / `lg:hidden`) means both mobile and desktop React trees mount on all viewports. This doubles some Convex query subscriptions (e.g., notification count in both `MobileContainer` and `Sidebar`). Acceptable for simplicity; can optimize with conditional unmounting post-hydration in a follow-up.
- `DashboardView` independently fetches pool data that the mobile dashboard children also fetch. On desktop only `DashboardView` is visible, but both subscriptions are active. Same tradeoff.
- "Next payout" stat and "Upcoming schedule" panel are simplified (show pool links rather than actual cycle dates) since full implementation requires N+1 per-pool cycle queries. Can enhance in a follow-up.
- `app/pool/[id]/payments/[paymentId]/page.tsx` is not wrapped with `ResponsiveLayout` in this plan — it is a secondary detail page that can be addressed in a follow-up.

---

## File Structure

```
NEW FILES:
  hooks/useIsDesktop.ts                    — media query hook (≥1024px)
  components/layout/DesktopOnly.tsx         — CSS wrapper: hidden below lg
  components/layout/MobileOnly.tsx          — CSS wrapper: hidden at lg+
  components/layout/ResponsiveLayout.tsx    — switches mobile/desktop shell
  components/layout/Sidebar.tsx             — desktop sidebar navigation
  components/desktop/DashboardView.tsx      — desktop home dashboard
  components/desktop/DesktopPoolDetail.tsx  — tabbed pool detail wrapper
  components/desktop/DesktopPoolsGrid.tsx   — grid layout for my-pools
  components/pool/MembersContent.tsx        — extracted from members/page.tsx
  components/pool/PaymentsContent.tsx       — extracted from payments/page.tsx
  components/pool/ScheduleContent.tsx       — extracted from schedule/page.tsx
  components/pool/AnnounceContent.tsx       — extracted from announce/page.tsx

MODIFIED FILES:
  app/page.tsx                             — wrap with ResponsiveLayout
  app/my-pools/page.tsx                    — wrap with ResponsiveLayout
  app/pool/[id]/page.tsx                   — wrap with ResponsiveLayout
  app/pool/[id]/members/page.tsx           — use MembersContent, redirect on desktop
  app/pool/[id]/payments/page.tsx          — use PaymentsContent, redirect on desktop
  app/pool/[id]/schedule/page.tsx          — use ScheduleContent, redirect on desktop
  app/pool/[id]/announce/page.tsx          — use AnnounceContent, redirect on desktop
  app/pool/[id]/edit/page.tsx              — wrap with ResponsiveLayout
  app/pool/[id]/invite/page.tsx            — wrap with ResponsiveLayout
  app/notifications/page.tsx               — wrap with ResponsiveLayout
  app/profile/page.tsx                     — wrap with ResponsiveLayout
  app/pool/new/page.tsx                    — wrap with ResponsiveLayout
  app/join/[token]/page.tsx                — wrap with ResponsiveLayout

UNCHANGED:
  components/layout/MobileContainer.tsx
  components/layout/BottomNav.tsx
  components/layout/PageHeader.tsx
  All components/ui/* and convex/* files
```

---

## Chunk 1: Foundation — Hook, Wrappers, ResponsiveLayout, Sidebar

### Task 1: Create `useIsDesktop` hook

**Files:**
- Create: `hooks/useIsDesktop.ts`

- [ ] **Step 1: Create the hook file**

```typescript
"use client";

import { useState, useEffect } from "react";

const DESKTOP_BREAKPOINT = 1024;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mql.matches);

    function onChange(e: MediaQueryListEvent) {
      setIsDesktop(e.matches);
    }

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
```

- [ ] **Step 2: Verify the app still compiles**

Run: `npm run build`
Expected: Build succeeds (hook isn't used yet, but validates no syntax errors)

- [ ] **Step 3: Commit**

```bash
git add hooks/useIsDesktop.ts
git commit -m "feat: add useIsDesktop media query hook"
```

---

### Task 2: Create `DesktopOnly` and `MobileOnly` wrappers

**Files:**
- Create: `components/layout/DesktopOnly.tsx`
- Create: `components/layout/MobileOnly.tsx`

- [ ] **Step 1: Create DesktopOnly**

```typescript
export function DesktopOnly({ children }: { children: React.ReactNode }) {
  return <div className="hidden lg:block">{children}</div>;
}
```

- [ ] **Step 2: Create MobileOnly**

```typescript
export function MobileOnly({ children }: { children: React.ReactNode }) {
  return <div className="lg:hidden">{children}</div>;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/DesktopOnly.tsx components/layout/MobileOnly.tsx
git commit -m "feat: add DesktopOnly and MobileOnly CSS wrappers"
```

---

### Task 3: Create `Sidebar` component

**Files:**
- Create: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Create the Sidebar component**

Reference the existing `BottomNav.tsx` (line 7-12) for the tabs array and active detection pattern. The sidebar uses the same 4 nav items and icon imports.

```typescript
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/layout/Sidebar.tsx
git commit -m "feat: add desktop Sidebar component"
```

---

### Task 4: Create `ResponsiveLayout` component

**Files:**
- Create: `components/layout/ResponsiveLayout.tsx`

This is the core layout switcher. It renders both mobile and desktop shells using CSS-only visibility (no hydration flash). On mobile, it renders `MobileContainer`. On desktop, it renders `Sidebar` + main content area.

- [ ] **Step 1: Create ResponsiveLayout**

```typescript
"use client";

import { MobileContainer } from "./MobileContainer";
import { Sidebar } from "./Sidebar";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  /** Desktop content — if provided, rendered instead of children on desktop */
  desktopContent?: React.ReactNode;
  /** Whether to show the sidebar on desktop (false for signed-out pages) */
  showSidebar?: boolean;
}

export function ResponsiveLayout({
  children,
  desktopContent,
  showSidebar = true,
}: ResponsiveLayoutProps) {
  return (
    <>
      {/* Mobile shell — hidden on lg+ */}
      <div className="lg:hidden">
        <MobileContainer>{children}</MobileContainer>
      </div>

      {/* Desktop shell — hidden below lg */}
      <div className="hidden lg:flex h-screen bg-black">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          {desktopContent ?? children}
        </main>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/layout/ResponsiveLayout.tsx
git commit -m "feat: add ResponsiveLayout component"
```

---

## Chunk 2: Desktop Dashboard (Home Page)

### Task 5: Create `DashboardView` component

**Files:**
- Create: `components/desktop/DashboardView.tsx`

This is the main desktop dashboard with two-column layout. Reference `app/page.tsx` (lines 27-45) for the data fetching pattern and (lines 207-356) for the signed-in content.

- [ ] **Step 1: Create the DashboardView component**

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PoolCard } from "@/components/pool/PoolCard";
import { StatCard } from "@/components/ui/StatCard";
import { GreenButton } from "@/components/ui/GreenButton";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Zap, Calendar, Activity } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export function DashboardView() {
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

  const notifications = useQuery(
    api.notifications.listForUser,
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

  // Action items from notifications
  const actionItems = (notifications ?? []).filter(
    (n) =>
      !n.read &&
      (n.type === "payment_due" ||
        n.type === "payment_submitted" ||
        n.type === "payout_upcoming")
  );

  // Recent activity (last 10 notifications)
  const recentActivity = (notifications ?? []).slice(0, 10);

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

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {convexUser?.name?.split(" ")[0] ?? "—"}!
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">{today}</p>
        </div>
        <Link href="/pool/new">
          <GreenButton>
            <Plus size={16} className="mr-2" />
            Create Pool
          </GreenButton>
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Left column — main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Stats row */}
          {isLoaded && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Active Pools</p>
                <p className="text-2xl font-bold text-white">
                  {activePools.length}
                </p>
              </div>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Monthly Total</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(totalContributions, "PHP")}
                </p>
              </div>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Total Pools</p>
                <p className="text-2xl font-bold text-white">
                  {allPools.length}
                </p>
              </div>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
                <p className="text-xs text-[#6b7280] mb-1">Total Members</p>
                <p className="text-2xl font-bold text-white">—</p>
              </div>
            </div>
          )}

          {/* Action items */}
          {actionItems.length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-[#f59e0b]" />
                <h2 className="text-sm font-semibold text-[#f59e0b]">
                  Action Items
                </h2>
              </div>
              <div className="space-y-2">
                {actionItems.slice(0, 5).map((item) => (
                  <Link
                    key={item._id}
                    href={item.poolId ? `/pool/${item.poolId}` : "#"}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] hover:border-[#4ade80]/30 transition-colors"
                  >
                    <span className="text-sm">
                      {item.type === "payment_due"
                        ? "💸"
                        : item.type === "payment_submitted"
                          ? "🔍"
                          : "📋"}
                    </span>
                    <p className="text-sm text-white flex-1">{item.message}</p>
                    <span className="text-xs text-[#6b7280]">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pools grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                My Pools
              </h2>
              <Link
                href="/my-pools"
                className="text-xs text-[#4ade80] hover:underline"
              >
                View all →
              </Link>
            </div>
            {allPools.length === 0 ? (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <Plus size={24} className="text-[#4ade80]" />
                </div>
                <p className="text-sm text-[#6b7280]">
                  No pools yet. Create one or wait for an invite.
                </p>
                <Link href="/pool/new">
                  <GreenButton>Create Pool</GreenButton>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {allPools.slice(0, 6).map((r) =>
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
                    />
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column — secondary info */}
        <div className="w-72 shrink-0 space-y-6">
          {/* Pending invitations */}
          {pendingInvites && pendingInvites.length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-4">
                Invitations
              </h2>
              <div className="space-y-3">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv._id}
                    className="bg-[#0a0a0a] rounded-xl p-3 space-y-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white truncate">
                        {inv.poolName}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        by {inv.organizerName} ·{" "}
                        {formatCurrency(inv.contributionAmount, inv.currency)}
                        /cycle
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={actioningId === inv._id}
                        onClick={() =>
                          handleAccept(inv.invitationToken!, inv._id)
                        }
                        className="flex-1 h-8 rounded-lg bg-[#4ade80] text-black text-xs font-semibold disabled:opacity-50"
                      >
                        {actioningId === inv._id ? "..." : "Accept"}
                      </button>
                      <button
                        disabled={actioningId === inv._id}
                        onClick={() =>
                          handleDecline(inv.invitationToken!, inv._id)
                        }
                        className="flex-1 h-8 rounded-lg border border-[#2a2a2a] text-[#6b7280] text-xs font-medium disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming schedule placeholder */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-[#6b7280]" />
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                Upcoming
              </h2>
            </div>
            {activePools.length === 0 ? (
              <p className="text-xs text-[#6b7280]">
                No upcoming payouts yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activePools.slice(0, 5).map((pool) =>
                  pool ? (
                    <Link
                      key={pool._id}
                      href={`/pool/${pool._id}/schedule`}
                      className="block p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <p className="text-xs font-medium text-white truncate">
                        {pool.name}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        {formatCurrency(pool.contributionAmount, pool.currency)}
                        /cycle
                      </p>
                    </Link>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#6b7280]" />
              <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider">
                Activity
              </h2>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-[#6b7280]">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.slice(0, 8).map((n) => (
                  <div key={n._id} className="flex items-start gap-2 py-1.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-[#2a2a2a]" : "bg-[#4ade80]"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-[#d1d5db] line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-[#6b7280] mt-0.5">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/desktop/DashboardView.tsx
git commit -m "feat: add desktop DashboardView component"
```

---

### Task 6: Integrate ResponsiveLayout into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

The home page currently wraps everything in `<MobileContainer>`. Replace it with `<ResponsiveLayout>` so mobile stays identical but desktop gets the `DashboardView`.

- [ ] **Step 1: Refactor app/page.tsx**

The key changes:
1. Replace `<MobileContainer>` import with `<ResponsiveLayout>` import
2. Add `DashboardView` import
3. For signed-out: wrap in `<ResponsiveLayout showSidebar={false}>`
4. For signed-in: pass mobile content as `children`, desktop content as `desktopContent`

The signed-out landing content stays exactly the same — it just gets wrapped differently.
The signed-in mobile content stays exactly the same — the `<MobileContainer>` is now inside `ResponsiveLayout`.

Replace the entire return statement structure:

**Old pattern (lines 78-358):**
```tsx
return (
  <MobileContainer>
    <Show when="signed-out">...</Show>
    <Show when="signed-in">...</Show>
  </MobileContainer>
);
```

**New pattern:**
```tsx
return (
  <>
    <Show when="signed-out">
      <ResponsiveLayout showSidebar={false}>
        {/* Exact same landing page content from lines 81-203 */}
      </ResponsiveLayout>
    </Show>
    <Show when="signed-in">
      <ResponsiveLayout desktopContent={<DashboardView />}>
        {/* Exact same signed-in content from lines 208-355 */}
      </ResponsiveLayout>
    </Show>
  </>
);
```

Changes to imports:
- Remove: `import { MobileContainer } from "@/components/layout/MobileContainer";`
- Add: `import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";`
- Add: `import { DashboardView } from "@/components/desktop/DashboardView";`

All internal content (the landing page JSX, the dashboard JSX, hooks, state, handlers) stays **exactly** the same. Only the wrapping container changes.

- [ ] **Step 2: Test mobile view**

Run: `npm run dev`
Open browser at mobile width (<1024px). Verify the dashboard looks identical to before — same MobileContainer, same BottomNav, same content.

- [ ] **Step 3: Test desktop view**

Open browser at desktop width (≥1024px). Verify:
- Sidebar appears on the left with nav items
- DashboardView renders in the main area
- Stats, action items, pools grid, and right panel all display

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate ResponsiveLayout into home page"
```

---

## Chunk 3: Extract Pool Sub-Page Content into Shared Components

### Task 7: Extract `MembersContent` from members page

**Files:**
- Create: `components/pool/MembersContent.tsx`
- Modify: `app/pool/[id]/members/page.tsx`

Extract the inner content of the members page (everything between `<MobileContainer>` and `</MobileContainer>`, minus the PageHeader) into a shared component. The `SortableMemberRow` local component moves with it since it's only used there.

- [ ] **Step 1: Create MembersContent**

Move the content from `app/pool/[id]/members/page.tsx` lines 32-201 (everything inside MobileContainer except PageHeader) into `components/pool/MembersContent.tsx`. The component receives `poolId: string` as a prop.

Include:
- The `SortableMemberRow` local component (lines 32-63)
- All the hooks/state from the page (pool query, members query, localOrder, sensors, handleDragEnd, saveOrder)
- All the JSX for active members, invited members, and save order button (lines 139-201)

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MemberRow } from "@/components/pool/MemberRow";
import { GreenButton } from "@/components/ui/GreenButton";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, UserPlus } from "lucide-react";
import { MembersPageSkeleton } from "@/components/ui/Skeleton";

function SortableMemberRow({
  member,
}: {
  member: {
    _id: string;
    displayName?: string | null;
    email: string;
    payoutPosition?: number | null;
    status: "invited" | "active" | "completed" | "removed";
  };
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: member._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 border-b border-[#2a2a2a] last:border-0"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-2 text-[#6b7280] cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1">
        <MemberRow
          name={member.displayName ?? ""}
          email={member.email}
          status={member.status}
        />
      </div>
    </div>
  );
}

export function MembersContent({
  poolId,
  showHeader = false,
}: {
  poolId: string;
  showHeader?: boolean;
}) {
  const { convexUser } = useCurrentUser();
  const updateOrder = useMutation(api.members.updatePayoutOrder);

  const pool = useQuery(api.pools.getById, {
    poolId: poolId as Id<"pools">,
  });
  const members = useQuery(api.members.listByPool, {
    poolId: poolId as Id<"pools">,
  });

  const [localOrder, setLocalOrder] = useState<typeof members | null>(null);

  const isOrganizer = convexUser?._id === pool?.organizerId;
  const canReorder =
    isOrganizer && pool?.orderType === "assigned" && pool?.status === "draft";

  if (!members) {
    return <MembersPageSkeleton />;
  }

  const displayed = localOrder ?? members ?? [];
  const activeMembers = displayed
    .filter((m) => m.status === "active")
    .sort((a, b) => (a.payoutPosition ?? 0) - (b.payoutPosition ?? 0));
  const invitedMembers = displayed.filter((m) => m.status === "invited");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = localOrder ?? members ?? [];
    const oldIdx = list.findIndex((m) => m._id === active.id);
    const newIdx = list.findIndex((m) => m._id === over.id);
    setLocalOrder(arrayMove(list, oldIdx, newIdx));
  }

  async function saveOrder() {
    if (!localOrder) return;
    const active = localOrder.filter((m) => m.status === "active");
    await updateOrder({
      updates: active.map((m, i) => ({
        memberId: m._id as Id<"pool_members">,
        payoutPosition: i + 1,
      })),
    });
    toast.success("Order saved!");
    setLocalOrder(null);
  }

  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 pt-4 space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Members</h2>
          {isOrganizer && (
            <Link href={`/pool/${poolId}/invite`}>
              <UserPlus size={20} className="text-[#4ade80]" />
            </Link>
          )}
        </div>
      )}

      {activeMembers.length > 0 && (
        <div>
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
            Active · {activeMembers.length}
            {canReorder && " · drag to reorder"}
          </p>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4">
            {canReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeMembers.map((m) => m._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {activeMembers.map((m) => (
                    <SortableMemberRow key={m._id} member={m} />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              activeMembers.map((m) => (
                <MemberRow
                  key={m._id}
                  name={m.displayName ?? ""}
                  email={m.email}
                  status={m.status}
                />
              ))
            )}
          </div>
        </div>
      )}

      {invitedMembers.length > 0 && (
        <div>
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
            Invited · {invitedMembers.length}
          </p>
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4">
            {invitedMembers.map((m) => (
              <MemberRow
                key={m._id}
                name={m.displayName ?? ""}
                email={m.email}
                status={m.status}
              />
            ))}
          </div>
        </div>
      )}

      {localOrder && canReorder && (
        <GreenButton fullWidth onClick={saveOrder}>
          Save Order
        </GreenButton>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update members page to use MembersContent**

Replace the content of `app/pool/[id]/members/page.tsx` with a thin wrapper:

```typescript
"use client";

import { use } from "react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { MembersContent } from "@/components/pool/MembersContent";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Id } from "@/convex/_generated/dataModel";
import { UserPlus } from "lucide-react";

export default function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { convexUser } = useCurrentUser();
  const pool = useQuery(api.pools.getById, { poolId: id as Id<"pools"> });
  const isOrganizer = convexUser?._id === pool?.organizerId;

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/pool/${id}?tab=members`);
    }
  }, [isDesktop, id, router]);

  // Avoid flash of mobile content on desktop before redirect
  if (isDesktop) return null;

  return (
    <MobileContainer>
      <PageHeader
        title="Members"
        action={
          isOrganizer ? (
            <Link href={`/pool/${id}/invite`}>
              <UserPlus size={20} className="text-[#4ade80]" />
            </Link>
          ) : undefined
        }
      />
      <MembersContent poolId={id} />
    </MobileContainer>
  );
}
```

- [ ] **Step 3: Verify mobile view still works**

Run: `npm run dev`
Navigate to a pool's members page on mobile width. Verify it looks and works exactly the same.

- [ ] **Step 4: Commit**

```bash
git add components/pool/MembersContent.tsx app/pool/[id]/members/page.tsx
git commit -m "refactor: extract MembersContent shared component"
```

---

### Task 8: Extract `PaymentsContent` from payments page

**Files:**
- Create: `components/pool/PaymentsContent.tsx`
- Modify: `app/pool/[id]/payments/page.tsx`

Same pattern as Task 7. Extract the inner content from `app/pool/[id]/payments/page.tsx` (lines 102-230, everything inside MobileContainer minus PageHeader) into a shared component.

- [ ] **Step 1: Create PaymentsContent**

Move all the content (cycle overview, recipient banner, payment accounts, payment action, all contributions) into `components/pool/PaymentsContent.tsx`. The component receives `poolId: string` as a prop.

Include all hooks/state: pool query, members query, currentCycle query, cyclePayments query, verifierAccounts query, generateUploadUrl mutation, markPaid mutation, confirmPayment mutation, fileRef, uploading state, handleUploadAndPay, handleConfirm.

- [ ] **Step 2: Update payments page to use PaymentsContent**

Same thin wrapper pattern as members page — `MobileContainer` + `PageHeader` + `PaymentsContent` + desktop redirect.

- [ ] **Step 3: Verify mobile view**

- [ ] **Step 4: Commit**

```bash
git add components/pool/PaymentsContent.tsx app/pool/[id]/payments/page.tsx
git commit -m "refactor: extract PaymentsContent shared component"
```

---

### Task 9: Extract `ScheduleContent` from schedule page

**Files:**
- Create: `components/pool/ScheduleContent.tsx`
- Modify: `app/pool/[id]/schedule/page.tsx`

- [ ] **Step 1: Create ScheduleContent**

Extract from `app/pool/[id]/schedule/page.tsx` lines 38-57. Component receives `poolId: string`.

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScheduleTimeline } from "@/components/pool/ScheduleTimeline";
import { Id } from "@/convex/_generated/dataModel";
import { ScheduleSkeleton } from "@/components/ui/Skeleton";

export function ScheduleContent({ poolId }: { poolId: string }) {
  const pool = useQuery(api.pools.getById, { poolId: poolId as Id<"pools"> });
  const cycles = useQuery(api.cycles.listByPool, {
    poolId: poolId as Id<"pools">,
  });
  const members = useQuery(api.members.listByPool, {
    poolId: poolId as Id<"pools">,
  });

  const sorted = [...(cycles ?? [])].sort(
    (a, b) => a.cycleNumber - b.cycleNumber
  );

  const cycleItems = sorted.map((cycle) => {
    const recipient = members?.find((m) => m._id === cycle.recipientMemberId);
    return {
      cycleNumber: cycle.cycleNumber,
      payoutDate: cycle.payoutDate,
      totalAmount: cycle.totalAmount,
      currency: pool?.currency ?? "PHP",
      status: cycle.status,
      recipientName: recipient?.displayName ?? "",
      recipientEmail: recipient?.email ?? "",
    };
  });

  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 py-4">
      {!pool ? (
        <ScheduleSkeleton />
      ) : pool.status === "draft" ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-[#6b7280] text-sm text-center">
            Schedule will be generated once the Pool is started.
          </p>
        </div>
      ) : cycleItems.length === 0 ? (
        <ScheduleSkeleton />
      ) : (
        <ScheduleTimeline cycles={cycleItems} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update schedule page to use ScheduleContent**

- [ ] **Step 3: Verify mobile view**

- [ ] **Step 4: Commit**

```bash
git add components/pool/ScheduleContent.tsx app/pool/[id]/schedule/page.tsx
git commit -m "refactor: extract ScheduleContent shared component"
```

---

### Task 10: Extract `AnnounceContent` from announce page

**Files:**
- Create: `components/pool/AnnounceContent.tsx`
- Modify: `app/pool/[id]/announce/page.tsx`

- [ ] **Step 1: Create AnnounceContent**

Extract from `app/pool/[id]/announce/page.tsx` lines 50-104. Component receives `poolId: string`.

Include: pool query, announcements query, postAnnouncement mutation, message state, posting state, handlePost function, all the JSX (organizer post form, empty state, announcement cards).

- [ ] **Step 2: Update announce page to use AnnounceContent**

- [ ] **Step 3: Verify mobile view**

- [ ] **Step 4: Commit**

```bash
git add components/pool/AnnounceContent.tsx app/pool/[id]/announce/page.tsx
git commit -m "refactor: extract AnnounceContent shared component"
```

---

## Chunk 4: Desktop Pool Detail with Tabs

### Task 11: Create `DesktopPoolDetail` tabbed component

**Files:**
- Create: `components/desktop/DesktopPoolDetail.tsx`

This renders the pool detail page with horizontal tabs on desktop. It reuses the shared content components from Tasks 7-10.

- [ ] **Step 1: Create DesktopPoolDetail**

The component:
- Receives `poolId: string` and reads `?tab` from search params
- Renders pool header (name, status, edit/delete actions)
- Renders tab bar with 5 tabs: Overview, Members, Payments, Schedule, Announcements
- Tab bar uses `role="tablist"`, tabs use `role="tab"` with `aria-selected`
- Clicking a tab calls `router.replace(`/pool/${id}?tab=${tab}`)
- Renders the appropriate content component based on active tab
- Overview tab renders the existing pool detail content (stats, cycle card, action banners, member preview)

Reference `app/pool/[id]/page.tsx` for the Overview tab content (lines 131-385).

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter, useSearchParams } from "next/navigation";
import { CycleCard } from "@/components/pool/CycleCard";
import { MemberRow } from "@/components/pool/MemberRow";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { GreenButton } from "@/components/ui/GreenButton";
import { MembersContent } from "@/components/pool/MembersContent";
import { PaymentsContent } from "@/components/pool/PaymentsContent";
import { ScheduleContent } from "@/components/pool/ScheduleContent";
import { AnnounceContent } from "@/components/pool/AnnounceContent";
import { formatCurrency, formatDate, SCHEDULE_LABELS } from "@/lib/format";
import Link from "next/link";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Trash2, Calendar, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "members", label: "Members" },
  { key: "payments", label: "Payments" },
  { key: "schedule", label: "Schedule" },
  { key: "announcements", label: "Announcements" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function computeEndDate(
  startDate: number,
  schedule: string,
  numMembers: number
): number {
  const date = new Date(startDate);
  const i = numMembers - 1;
  if (schedule === "weekly") date.setDate(date.getDate() + i * 7);
  else if (schedule === "biweekly") date.setDate(date.getDate() + i * 14);
  else if (schedule === "mid_month") {
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

export function DesktopPoolDetail({ poolId }: { poolId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabKey) || "overview";
  const { convexUser } = useCurrentUser();

  const pool = useQuery(api.pools.getById, {
    poolId: poolId as Id<"pools">,
  });
  const members = useQuery(api.members.listByPool, {
    poolId: poolId as Id<"pools">,
  });
  const currentCycle = useQuery(api.cycles.getCurrentCycle, {
    poolId: poolId as Id<"pools">,
  });
  const cyclePayments = useQuery(
    api.payments.listByCycle,
    currentCycle ? { cycleId: currentCycle._id } : "skip"
  );

  const activate = useMutation(api.pools.activate);
  const removePool = useMutation(api.pools.remove);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const today = toDateInputValue(Date.now());
  const [startDateInput, setStartDateInput] = useState(today);
  const [starting, setStarting] = useState(false);

  if (!pool) {
    return (
      <div className="p-8 max-w-[1000px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#1a1a1a] rounded-lg w-48" />
          <div className="h-12 bg-[#1a1a1a] rounded-xl" />
          <div className="h-64 bg-[#1a1a1a] rounded-xl" />
        </div>
      </div>
    );
  }

  const isOrganizer = convexUser?._id === pool.organizerId;
  const activeMembers =
    members?.filter((m) => m.status === "active") ?? [];
  const paidCount =
    cyclePayments?.filter((p) => p.confirmedByOrganizer).length ?? 0;
  const recipient = currentCycle
    ? members?.find((m) => m._id === currentCycle.recipientMemberId)
    : null;
  const myMember = members?.find((m) => m.userId === convexUser?._id);
  const isRecipient = myMember?._id === currentCycle?.recipientMemberId;
  const myPayment = cyclePayments?.find((p) => p.memberId === myMember?._id);

  const startTs = new Date(startDateInput).getTime();
  const memberCount =
    pool.status === "draft" ? activeMembers.length : pool.maxMembers;
  const organizerIsMember = activeMembers.some(
    (m) => m.userId === pool.organizerId
  );
  const payingCount = memberCount - (organizerIsMember ? 1 : 0);
  const endDate = computeEndDate(startTs, pool.payoutSchedule, memberCount);

  async function handleStart() {
    setStarting(true);
    try {
      await activate({
        poolId: poolId as Id<"pools">,
        startDate: startTs,
      });
      toast.success("Pool started!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start pool"
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await removePool({ poolId: poolId as Id<"pools"> });
      toast.success("Pool deleted");
      router.replace("/my-pools");
    } catch {
      toast.error("Failed to delete pool.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function setTab(tab: TabKey) {
    router.replace(`/pool/${poolId}?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Delete this pool?
                </p>
                <p className="text-xs text-[#6b7280]">
                  This permanently deletes all data.
                </p>
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">{pool.name}</h1>
          <StatusBadge status={pool.status} />
        </div>
        {isOrganizer && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Trash2 size={16} className="text-red-400" />
            </button>
            <Link
              href={`/pool/${poolId}/edit`}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Pencil size={16} className="text-[#6b7280]" />
            </Link>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 border-b border-[#2a2a2a] mb-6"
        role="tablist"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === key
                ? "text-[#4ade80]"
                : "text-[#6b7280] hover:text-white"
            }`}
          >
            {label}
            {activeTab === key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4ade80]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="grid grid-cols-4 gap-4">
                <StatCard
                  label="Per cycle"
                  value={formatCurrency(
                    pool.contributionAmount,
                    pool.currency
                  )}
                />
                <StatCard
                  label="Total pot"
                  value={formatCurrency(
                    pool.contributionAmount * payingCount,
                    pool.currency
                  )}
                />
                <StatCard
                  label="Schedule"
                  value={SCHEDULE_LABELS[pool.payoutSchedule]}
                />
                <StatCard
                  label="Members"
                  value={`${activeMembers.length}`}
                />
              </div>
              <div className="flex justify-between text-xs pt-3 mt-3 border-t border-[#2a2a2a]">
                <span className="text-[#6b7280]">Verifies payments</span>
                <span className="text-white capitalize">
                  {pool.paymentVerifier === "recipient"
                    ? "Cycle recipient"
                    : "Organizer"}
                </span>
              </div>
              {pool.startDate && (
                <div className="flex justify-between text-xs pt-3 mt-3 border-t border-[#2a2a2a]">
                  <span className="text-[#6b7280]">Starts</span>
                  <span className="text-white">
                    {formatDate(pool.startDate)}
                  </span>
                  <span className="text-[#6b7280]">Ends</span>
                  <span className="text-white">
                    {formatDate(
                      computeEndDate(
                        pool.startDate,
                        pool.payoutSchedule,
                        memberCount
                      )
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Current cycle */}
            {pool.status === "active" && currentCycle && recipient && (
              <div className="space-y-3">
                <CycleCard
                  cycleNumber={currentCycle.cycleNumber}
                  totalCycles={memberCount}
                  recipientName={recipient.displayName ?? ""}
                  recipientEmail={recipient.email}
                  payoutDate={currentCycle.payoutDate}
                  totalAmount={currentCycle.totalAmount}
                  currency={pool.currency}
                  paidCount={paidCount}
                  totalMembers={activeMembers.length - 1}
                />

                {/* Action banners */}
                {isRecipient ? (
                  <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-xl">🎉</span>
                    <div>
                      <p className="text-sm font-semibold text-[#4ade80]">
                        You&apos;re receiving this cycle!
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        No payment needed — you&apos;ll receive the pot on{" "}
                        {formatDate(currentCycle.payoutDate)}.
                      </p>
                    </div>
                  </div>
                ) : myPayment?.status === "pending" ? (
                  <button
                    onClick={() => setTab("payments")}
                    className="w-full flex items-center gap-3 bg-[#4ade80] rounded-2xl p-4 hover:bg-[#3bcb6e] transition-colors"
                  >
                    <span className="text-xl">💸</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold text-black">Pay Now</p>
                      <p className="text-xs text-black/60">
                        Upload your{" "}
                        {formatCurrency(
                          pool.contributionAmount,
                          pool.currency
                        )}{" "}
                        payment proof
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-black/40" />
                  </button>
                ) : myPayment?.status === "paid" &&
                  !myPayment.confirmedByOrganizer ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-xl">⏳</span>
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">
                        Payment submitted
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        Waiting for organizer to confirm.
                      </p>
                    </div>
                  </div>
                ) : myPayment?.confirmedByOrganizer ? (
                  <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <p className="text-sm text-[#4ade80]">
                      Your payment has been confirmed.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* Draft state */}
            {pool.status === "draft" && isOrganizer && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 space-y-4 max-w-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6b7280]">
                    {activeMembers.length} members joined
                  </span>
                  <Link
                    href={`/pool/${poolId}/invite`}
                    className="text-xs text-[#4ade80]"
                  >
                    + Invite
                  </Link>
                </div>
                <div>
                  <label className="text-xs text-[#6b7280] mb-1.5 block">
                    Start date
                  </label>
                  <div className="relative rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] overflow-hidden focus-within:border-[#4ade80]">
                    <Calendar
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none"
                    />
                    <input
                      type="date"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      className="w-full bg-transparent rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-[#6b7280] bg-[#0a0a0a] rounded-xl px-4 py-2.5">
                  <span>Estimated end date</span>
                  <span className="text-white font-medium">
                    {formatDate(endDate)}
                  </span>
                </div>
                <GreenButton
                  fullWidth
                  disabled={starting || activeMembers.length < 2}
                  onClick={handleStart}
                >
                  {starting ? "Starting..." : "Start Pool"}
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
                  {activeMembers.length} members joined
                </p>
              </div>
            )}

            {/* Members preview */}
            {activeMembers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Members</h3>
                  <button
                    onClick={() => setTab("members")}
                    className="text-xs text-[#4ade80] hover:underline"
                  >
                    See all
                  </button>
                </div>
                <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4 divide-y divide-[#2a2a2a]">
                  {activeMembers.slice(0, 4).map((member) => (
                    <MemberRow
                      key={member._id}
                      name={member.displayName ?? ""}
                      email={member.email}
                      status={member.status}
                      isRecipient={
                        member._id === currentCycle?.recipientMemberId
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "members" && <MembersContent poolId={poolId} />}
        {activeTab === "payments" && <PaymentsContent poolId={poolId} />}
        {activeTab === "schedule" && <ScheduleContent poolId={poolId} />}
        {activeTab === "announcements" && <AnnounceContent poolId={poolId} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add components/desktop/DesktopPoolDetail.tsx
git commit -m "feat: add DesktopPoolDetail tabbed component"
```

---

### Task 12: Integrate ResponsiveLayout into pool detail page

**Files:**
- Modify: `app/pool/[id]/page.tsx`

- [ ] **Step 1: Wrap pool detail page with ResponsiveLayout**

Same pattern as Task 6:
- Replace `<MobileContainer>` import with `<ResponsiveLayout>` import
- Add `DesktopPoolDetail` import
- Pass existing mobile content as children, `<DesktopPoolDetail poolId={id} />` as `desktopContent`

Changes to imports:
- Remove: `import { MobileContainer } from "@/components/layout/MobileContainer";`
- Add: `import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";`
- Add: `import { DesktopPoolDetail } from "@/components/desktop/DesktopPoolDetail";`

Replace `<MobileContainer>` with `<ResponsiveLayout desktopContent={<DesktopPoolDetail poolId={id} />}>` and `</MobileContainer>` with `</ResponsiveLayout>`.

- [ ] **Step 2: Test mobile and desktop views**

- [ ] **Step 3: Commit**

```bash
git add app/pool/[id]/page.tsx
git commit -m "feat: integrate ResponsiveLayout into pool detail page"
```

---

## Chunk 5: Wrap Remaining Pages with ResponsiveLayout

### Task 13: Create `DesktopPoolsGrid` and wrap my-pools page

**Files:**
- Create: `components/desktop/DesktopPoolsGrid.tsx`
- Modify: `app/my-pools/page.tsx`

- [ ] **Step 1: Create DesktopPoolsGrid**

A simple component that displays the pools in a 2-3 column grid. Reuses `PoolCard`. Reference `app/my-pools/page.tsx` for the data fetching pattern.

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PoolCard } from "@/components/pool/PoolCard";
import { GreenButton } from "@/components/ui/GreenButton";
import Link from "next/link";
import { Plus } from "lucide-react";

export function DesktopPoolsGrid() {
  const { convexUser } = useCurrentUser();

  const poolData = useQuery(
    api.pools.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const organized = poolData?.organized ?? [];
  const member = (poolData?.member ?? []).filter(Boolean);

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">My Pools</h1>
        <Link href="/pool/new">
          <GreenButton>
            <Plus size={16} className="mr-2" />
            Create Pool
          </GreenButton>
        </Link>
      </div>

      {organized.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-4">
            Organizing
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
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
                />
              ) : null
            )}
          </div>
        </div>
      )}

      {member.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-4">
            Participating
          </p>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
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
                />
              ) : null
            )}
          </div>
        </div>
      )}

      {organized.length === 0 && member.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-14 h-14 rounded-full bg-[#141414] flex items-center justify-center">
            <Plus size={24} className="text-[#4ade80]" />
          </div>
          <p className="text-[#6b7280] text-sm text-center">
            You&apos;re not part of any Pool yet.
          </p>
          <Link href="/pool/new">
            <GreenButton>Create Pool</GreenButton>
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wrap my-pools page with ResponsiveLayout**

Replace `<MobileContainer>` with `<ResponsiveLayout desktopContent={<DesktopPoolsGrid />}>`.

- [ ] **Step 3: Test both views**

- [ ] **Step 4: Commit**

```bash
git add components/desktop/DesktopPoolsGrid.tsx app/my-pools/page.tsx
git commit -m "feat: add desktop grid view for my-pools page"
```

---

### Task 14: Wrap remaining pages with ResponsiveLayout

**Files:**
- Modify: `app/notifications/page.tsx`
- Modify: `app/profile/page.tsx`
- Modify: `app/pool/new/page.tsx`
- Modify: `app/pool/[id]/edit/page.tsx`
- Modify: `app/pool/[id]/invite/page.tsx`
- Modify: `app/join/[token]/page.tsx`

For these pages, the desktop view is simply the mobile content rendered wider inside the desktop shell (sidebar + main area). No custom desktop components needed — just `ResponsiveLayout` wrapping.

- [ ] **Step 1: Wrap notifications page**

Replace `<MobileContainer>` with `<ResponsiveLayout>`. The content renders in the desktop shell's main area with full width. Keep `PageHeader` for the mobile view but add a desktop header:

```tsx
<ResponsiveLayout>
  {/* The existing page content, minus MobileContainer wrapper */}
</ResponsiveLayout>
```

Note: Since `ResponsiveLayout` already includes `MobileContainer` for mobile, just pass the inner content as children. On desktop, the same content renders in the main area.

For pages that currently have this pattern:
```tsx
<MobileContainer>
  <PageHeader title="..." />
  <content />
</MobileContainer>
```

Change to:
```tsx
<ResponsiveLayout>
  <PageHeader title="..." />
  <content />
</ResponsiveLayout>
```

The `PageHeader` with back button will show on both mobile and desktop, which is acceptable for these secondary pages.

- [ ] **Step 2: Wrap profile page** — same pattern

- [ ] **Step 3: Wrap create pool page** — same pattern. On desktop, add `<div className="max-w-[600px] mx-auto">` around the form content for centered layout.

- [ ] **Step 4: Wrap pool edit page** — same pattern

- [ ] **Step 5: Wrap pool invite page** — same pattern

- [ ] **Step 6: Wrap join page** — use `<ResponsiveLayout showSidebar={false}>` since this is a pre-auth page

- [ ] **Step 7: Test all pages on both mobile and desktop**

Run: `npm run dev`
Verify each page:
- Mobile: looks exactly like before
- Desktop: renders inside the sidebar + main area layout

- [ ] **Step 8: Commit**

```bash
git add app/notifications/page.tsx app/profile/page.tsx app/pool/new/page.tsx app/pool/[id]/edit/page.tsx app/pool/[id]/invite/page.tsx app/join/[token]/page.tsx
git commit -m "feat: wrap remaining pages with ResponsiveLayout"
```

---

## Chunk 6: Polish and Verification

### Task 15: Final verification pass

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Manual verification checklist**

Run: `npm run dev`

Desktop (≥1024px):
- [ ] Home page shows sidebar + DashboardView with two-column layout
- [ ] Sidebar nav highlights current page
- [ ] Sidebar notification badge shows unread count
- [ ] Clicking a pool card navigates to pool detail with tabs
- [ ] Pool detail tabs switch content without full page reload
- [ ] URL updates with `?tab=members` etc.
- [ ] Direct URL `/pool/[id]?tab=schedule` loads correct tab
- [ ] My Pools shows grid layout
- [ ] Pool sub-route URLs (`/pool/[id]/members`) redirect to tabbed view
- [ ] Create Pool form is centered with max-width
- [ ] Signed-out landing page has no sidebar

Mobile (<1024px):
- [ ] Home page looks exactly like before
- [ ] BottomNav works correctly
- [ ] Pool detail navigates to separate pages (not tabs)
- [ ] All sub-pages have PageHeader with back button
- [ ] No visual changes at all from original mobile view

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix: polish desktop dashboard"
```
