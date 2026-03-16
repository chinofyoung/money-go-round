# Desktop Dashboard View — Design Spec

## Overview

Add a desktop dashboard view to the MoneyGoRound ROSCA/paluwagan app. The existing mobile UI (430px max-width, BottomNav, MobileContainer) remains completely untouched. Desktop users (≥1024px) get a sidebar-based dashboard layout with richer content panels.

## Approach

**Responsive breakpoint wrapper (Approach A):** A `ResponsiveLayout` component switches between the existing mobile shell and a new desktop shell based on screen width. Mobile code is never modified — desktop components are purely additive.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout structure | Full sidebar + content area | Spacious, professional SaaS feel with labeled nav and user profile |
| Pool detail (desktop) | Full-page with horizontal tabs | Tabs replace separate page navigation; uses full width for content |
| Dashboard panels | All 6: stats, pools, actions, notifications, schedule, invites | Rich comprehensive dashboard |
| Dashboard arrangement | Two-column with right panel | Main content left, secondary info (invites, schedule, activity) right |
| Breakpoint | 1024px (lg) | Below = mobile (unchanged), above = desktop |
| Implementation | Additive new files + minimal page wrappers | Mobile component files unchanged; page files get thin responsive wrappers |

## Architecture

### Responsive Shell

```
<ResponsiveLayout>
  ├─ <1024px:  <MobileContainer> + <BottomNav>  (existing, unchanged)
  └─ ≥1024px:  <DesktopShell>
                  ├─ <Sidebar />
                  └─ <main>{children}</main>
```

- `ResponsiveLayout` wraps page content, replacing direct `MobileContainer` usage in each page
- Uses a **CSS-first approach** for the layout shell to avoid hydration flash (see below)
- `useIsDesktop()` hook used for conditional content rendering (not the shell itself)
- On desktop, `MobileContainer` and `BottomNav` are not rendered at all

**Hydration flash mitigation:** The outer shell uses CSS `hidden lg:flex` / `lg:hidden` classes so the correct layout renders immediately without waiting for JS hydration. The `useIsDesktop` hook is only used for conditional content inside components (e.g., rendering `DashboardView` vs mobile pool list), not for the shell structure itself.

**Integration with auth state:** `ResponsiveLayout` accepts a `showSidebar` prop. Signed-out pages pass `showSidebar={false}` — the desktop shell renders without the sidebar, just a centered max-width container. Signed-in pages pass `showSidebar={true}`.

**Example integration in `app/page.tsx`:**
```tsx
export default function Home() {
  return (
    <>
      <Show when="signed-out">
        <ResponsiveLayout showSidebar={false}>
          {/* Landing page — same content, just wider on desktop */}
          <LandingContent />
        </ResponsiveLayout>
      </Show>
      <Show when="signed-in">
        <ResponsiveLayout showSidebar={true}>
          {/* On mobile: existing pool list. On desktop: DashboardView */}
          <DesktopOnly><DashboardView /></DesktopOnly>
          <MobileOnly><MobilePoolList /></MobileOnly>
        </ResponsiveLayout>
      </Show>
    </>
  );
}
```

`DesktopOnly` and `MobileOnly` are thin wrappers using CSS `hidden lg:block` / `lg:hidden` to avoid hydration issues.

### useIsDesktop Hook

```typescript
// hooks/useIsDesktop.ts
// Returns true when viewport ≥ 1024px
// Uses window.matchMedia for SSR-safe media query detection
// Default: false (mobile-first)
// Used for: conditional data fetching, dynamic content — NOT for layout shell
```

### Desktop Sidebar

`components/layout/Sidebar.tsx` — 240px fixed-width sidebar.

**Contents:**
- Logo + "MoneyGoRound" app name (top)
- Nav items: Dashboard (`/`), My Pools (`/my-pools`), Notifications (`/notifications`), Profile (`/profile`)
- Active state: green highlight `rgba(74,222,128,0.15)` background, `#4ade80` text
- Inactive state: `#6b7280` text
- Notification badge: unread count (orange dot, same as BottomNav)
- User profile section (bottom): avatar + name, sign out action

**Icons** (matching BottomNav for consistency):
- Dashboard: `Home` (lucide-react)
- My Pools: `Wallet` (lucide-react)
- Notifications: `Bell` (lucide-react)
- Profile: `User` (lucide-react)

**Styling:**
- Background: `#0a0a0a` (consistent with existing palette)
- Full viewport height, fixed position
- Border-right: `1px solid #2a2a2a`

### Desktop Dashboard (Home Page)

`components/desktop/DashboardView.tsx` — rendered on `/` for desktop users.

**Header row:**
- "Welcome back, {firstName}!" + date
- "Create Pool" green gradient button (right-aligned)

**Left column (flex: 1):**

1. **Stats row** — 4 stat cards in a horizontal row:
   - Active pools (count)
   - Monthly total (currency)
   - Next payout (date, green highlight)
   - Total members (count across all pools)

2. **Action items panel** — bordered card:
   - Pending payments you owe (amber color coding)
   - Payments awaiting your review/confirmation (green)
   - Clickable — navigates to relevant pool/payment

3. **Pools grid** — cards displayed in a row (up to 3 visible):
   - Each card: pool name, status badge, member count, per-cycle amount, progress bar
   - "View all →" link to `/my-pools`
   - Clickable — navigates to `/pool/[id]`

**Right column (~280px):**

4. **Pending invitations** — card with accept/decline buttons per invite

5. **Upcoming schedule** — list of next payout dates across all pools, color-coded (green for "you receive")

6. **Activity feed** — recent events: payments submitted, members joined, announcements posted, with relative timestamps

**Data sources** — all derived from existing Convex queries (no new backend queries):

| Panel | Convex Query | Derivation |
|-------|-------------|------------|
| Pools grid | `api.pools.listForUser` | Direct — returns all user's pools |
| Stats: Active pools | `api.pools.listForUser` | Count pools with `status === "active"` |
| Stats: Monthly total | `api.pools.listForUser` | Sum `amount` for active pools (adjusted by frequency) |
| Stats: Next payout | `api.cycles.getCurrentCycle` | Call per active pool, find earliest upcoming date |
| Stats: Total members | `api.members.listByPool` | Call per pool, sum counts. Cap at first 5 pools to limit queries |
| Action items | `api.notifications.listForUser` | Filter for actionable types (payment_due, payment_review) |
| Invitations | `api.notifications.getPendingInvites` | Direct — returns pending invites |
| Schedule | `api.cycles.listByPool` | Call per active pool, merge and sort by date. Cap at 5 pools |
| Activity feed | `api.notifications.listForUser` | Same as notifications — recent items displayed as feed |

**N+1 query note:** Stats and schedule require per-pool queries (`getCurrentCycle`, `listByPool`, `members.listByPool`). To keep this manageable, cap at the first 5 active pools. If the user has more, show "and N more pools..." with a link to My Pools. Convex's reactive queries handle this efficiently since they only re-run when data changes.

### Desktop Pool Detail

`components/desktop/DesktopPoolDetail.tsx` — rendered on `/pool/[id]` for desktop.

**Layout:**
- Pool header: name, status badge, edit/delete actions (organizer only)
- Horizontal tab bar: Overview | Members | Payments | Schedule | Announcements
- Tab content area (full width below tabs)

**Tab routing strategy:** Use `?tab=members` search params (not sub-route interception).

- Clicking a tab calls `router.replace(/pool/[id]?tab=members)` — no full page navigation
- Default (no `?tab`) shows Overview
- On mobile, sub-route pages (`/pool/[id]/members/page.tsx`) remain unchanged
- On desktop, sub-route pages redirect to the tabbed view: if `useIsDesktop()` is true, `router.replace(/pool/[id]?tab=members)` immediately

**Tab content mapping:**

| Tab | Content Source | Notes |
|-----|---------------|-------|
| Overview | Current pool detail page content | Stats, cycle card, action banners, member preview |
| Members | Content from `app/pool/[id]/members/page.tsx` | Member list with drag-and-drop (reuse existing logic, minus MobileContainer/PageHeader wrapper) |
| Payments | Content from `app/pool/[id]/payments/page.tsx` | Payment list and submission |
| Schedule | Content from `app/pool/[id]/schedule/page.tsx` | Payout timeline |
| Announcements | Content from `app/pool/[id]/announce/page.tsx` | Announcement feed |

To reuse tab content without duplicating code, extract the inner content of each sub-page into a shared component (e.g., `components/pool/MembersContent.tsx`). Both the mobile sub-page and the desktop tab import this component. The mobile page wraps it in `MobileContainer` + `PageHeader`; the desktop tab renders it directly.

**Accessibility:** Tab bar uses `role="tablist"`, each tab uses `role="tab"` with `aria-selected`, content area uses `role="tabpanel"`. Arrow keys navigate between tabs.

**Overview tab content (default):**
- Stats row: Status, Per-cycle amount, Total pot, Schedule (4 columns)
- Current cycle card (if active pool)
- Action banners (payment needed, review needed, etc.)
- Member preview grid

### Desktop My Pools Page

`components/desktop/DesktopPoolsGrid.tsx` — grid layout for `/my-pools`.

- "Organizing" section: pools in 2-3 column grid
- "Participating" section: pools in 2-3 column grid
- Same PoolCard component, just in grid instead of stacked list
- Empty state with create pool CTA

### Desktop Notifications Page

- Wider card layout with more horizontal space
- Same notification types and actions
- Cards can be wider, showing more context per row

### Desktop Profile Page

- Centered content card with `max-width: 600px`
- Same sections: user info, payment accounts
- More breathing room around elements

### Desktop Create Pool Page

- Centered form with `max-width: 600px`
- Same 3-step wizard flow
- Steps could optionally show as a horizontal stepper instead of dots

## File Structure

```
components/
  layout/
    ResponsiveLayout.tsx    # NEW — switches mobile/desktop shell
    Sidebar.tsx             # NEW — desktop sidebar navigation
    DesktopOnly.tsx         # NEW — CSS wrapper, hidden below lg
    MobileOnly.tsx          # NEW — CSS wrapper, hidden at lg+
    MobileContainer.tsx     # UNCHANGED
    BottomNav.tsx           # UNCHANGED
    PageHeader.tsx          # UNCHANGED
  desktop/
    DashboardView.tsx       # NEW — desktop home dashboard
    DesktopPoolDetail.tsx   # NEW — tabbed pool detail wrapper
    DesktopPoolsGrid.tsx    # NEW — grid layout for my-pools
  pool/
    MembersContent.tsx      # NEW — extracted from members/page.tsx (shared)
    PaymentsContent.tsx     # NEW — extracted from payments/page.tsx (shared)
    ScheduleContent.tsx     # NEW — extracted from schedule/page.tsx (shared)
    AnnounceContent.tsx     # NEW — extracted from announce/page.tsx (shared)
hooks/
  useIsDesktop.ts           # NEW — media query hook (≥1024px)
```

**Modified files (minimal changes — wrapping with ResponsiveLayout):**
- `app/page.tsx` — wrap with `ResponsiveLayout`, render `DashboardView` on desktop
- `app/my-pools/page.tsx` — wrap with `ResponsiveLayout`, render grid on desktop
- `app/pool/[id]/page.tsx` — wrap with `ResponsiveLayout`, render tabbed detail on desktop
- `app/pool/[id]/members/page.tsx` — extract content to `MembersContent`, wrap with `ResponsiveLayout`, redirect to tabbed view on desktop
- `app/pool/[id]/payments/page.tsx` — extract content to `PaymentsContent`, wrap with `ResponsiveLayout`, redirect to tabbed view on desktop
- `app/pool/[id]/schedule/page.tsx` — extract content to `ScheduleContent`, wrap with `ResponsiveLayout`, redirect to tabbed view on desktop
- `app/pool/[id]/announce/page.tsx` — extract content to `AnnounceContent`, wrap with `ResponsiveLayout`, redirect to tabbed view on desktop
- `app/pool/[id]/edit/page.tsx` — wrap with `ResponsiveLayout`
- `app/pool/[id]/invite/page.tsx` — wrap with `ResponsiveLayout`
- `app/notifications/page.tsx` — wrap with `ResponsiveLayout`
- `app/profile/page.tsx` — wrap with `ResponsiveLayout`
- `app/pool/new/page.tsx` — wrap with `ResponsiveLayout`
- `app/join/[token]/page.tsx` — wrap with `ResponsiveLayout` (showSidebar=false)

**Existing files with zero changes:**
- `components/layout/MobileContainer.tsx`
- `components/layout/BottomNav.tsx`
- `components/layout/PageHeader.tsx`
- All `components/ui/*` components
- All `convex/*` backend files
- `hooks/useCurrentUser.ts`

## Styling

Follows existing design system:
- Dark theme: `#0a0a0a` / `#0f0f0f` / `#111` / `#141414` backgrounds
- Green accent: `#4ade80` → `#22c55e` gradient
- Borders: `#2a2a2a`
- Cards: `bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl`
- Text: white headings, `#6b7280` secondary
- Interactive: `active:scale-[0.98]` press feedback
- Tailwind CSS classes throughout (consistent with mobile)

## Loading States

Desktop components need their own skeleton states since the layout differs from mobile:

- **DashboardView:** Skeleton with placeholder stat cards, pool card placeholders, and right panel placeholders
- **DesktopPoolDetail:** Skeleton with tab bar placeholder and content area shimmer
- **DesktopPoolsGrid:** Grid of PoolCard skeleton placeholders

Reuse the existing `Skeleton` component (`components/ui/Skeleton.tsx`) as the building block.

## Edge Cases

- **SSR hydration:** Layout shell uses CSS-only `hidden lg:flex` / `lg:hidden` — no flash. `useIsDesktop` hook used only for content-level decisions, defaults to `false`.
- **Window resize:** Hook listens to resize events, layout switches live if user resizes browser.
- **Deep links:** `/pool/[id]/members` on desktop redirects to `/pool/[id]?tab=members` via `useIsDesktop` check.
- **Landing page (signed out):** `ResponsiveLayout` renders with `showSidebar={false}` — no sidebar, centered max-width container on desktop.
- **Toast positioning:** `react-hot-toast` Toaster stays `top-center` — it centers on the viewport which works for both layouts. Can adjust to content-area-relative positioning in a follow-up if needed.

## Out of Scope

- Backend/Convex changes — all data derived from existing queries
- Mobile UI changes — explicitly excluded
- New features — this is purely a layout/presentation change
- Dark/light theme toggle — stays dark only
- Viewport zoom constraints — existing `maximumScale: 1` remains as-is
