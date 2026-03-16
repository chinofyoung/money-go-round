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
| Implementation | New files only, no modifications to existing mobile components | Guarantees mobile stays untouched |

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
- Uses CSS media query + `useIsDesktop()` hook for conditional rendering
- On desktop, `MobileContainer` and `BottomNav` are not rendered at all

### useIsDesktop Hook

```typescript
// hooks/useIsDesktop.ts
// Returns true when viewport ≥ 1024px
// Uses window.matchMedia for SSR-safe media query detection
// Default: false (mobile-first, avoids layout flash)
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

**Styling:**
- Background: `#0d0d1a`
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

**Data sources:** All from existing Convex queries — no backend changes needed:
- `api.pools.listMyPools` — pool list
- `api.pools.getPoolStats` (or computed client-side) — stats
- `api.notifications.list` — activity/notifications
- `api.invitations.listPending` — invitations
- `api.cycles.getUpcoming` (or computed from pool data) — schedule

### Desktop Pool Detail

`components/desktop/DesktopPoolDetail.tsx` — rendered on `/pool/[id]` for desktop.

**Layout:**
- Pool header: name, status badge, edit/delete actions (organizer only)
- Horizontal tab bar: Overview | Members | Payments | Schedule | Announcements
- Tab content area (full width below tabs)

**Tab behavior:**
- Tabs replace the mobile pattern of separate page routes (`/pool/[id]/members`, etc.)
- On mobile, these remain separate pages with `PageHeader` back navigation (unchanged)
- On desktop, clicking a tab switches content without page navigation
- URL updates to reflect active tab (e.g., `/pool/[id]/members`) for shareability
- Direct URL navigation works — loads the correct tab

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
    MobileContainer.tsx     # UNCHANGED
    BottomNav.tsx           # UNCHANGED
    PageHeader.tsx          # UNCHANGED
  desktop/
    DashboardView.tsx       # NEW — desktop home dashboard
    DesktopPoolDetail.tsx   # NEW — tabbed pool detail wrapper
    DesktopPoolsGrid.tsx    # NEW — grid layout for my-pools
hooks/
  useIsDesktop.ts           # NEW — media query hook (≥1024px)
```

**Modified files (minimal changes):**
- `app/page.tsx` — wrap with `ResponsiveLayout`, render `DashboardView` on desktop
- `app/my-pools/page.tsx` — wrap with `ResponsiveLayout`, render grid on desktop
- `app/pool/[id]/page.tsx` — wrap with `ResponsiveLayout`, render tabbed detail on desktop
- `app/notifications/page.tsx` — wrap with `ResponsiveLayout`
- `app/profile/page.tsx` — wrap with `ResponsiveLayout`
- `app/pool/new/page.tsx` — wrap with `ResponsiveLayout`

**Existing files with zero changes:**
- `components/layout/MobileContainer.tsx`
- `components/layout/BottomNav.tsx`
- `components/layout/PageHeader.tsx`
- All `components/ui/*` components
- All `components/pool/*` components
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

## Edge Cases

- **SSR hydration:** `useIsDesktop` defaults to `false` (mobile-first) to avoid layout mismatch. Desktop shell renders after hydration.
- **Window resize:** Hook listens to resize events, layout switches live if user resizes browser.
- **Deep links:** `/pool/[id]/members` on desktop should open the pool detail with Members tab active.
- **Landing page (signed out):** Desktop shows the same landing page but with more horizontal space — centered with max-width, no sidebar.

## Out of Scope

- Backend/Convex changes — all data available via existing queries
- Mobile UI changes — explicitly excluded
- New features — this is purely a layout/presentation change
- Dark/light theme toggle — stays dark only
