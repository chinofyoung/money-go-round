# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run all` - Run Convex + Next.js dev servers concurrently
- `npm run dev` - Next.js dev server only
- `npx convex dev` - Convex dev server only
- `npm run build` - Production build
- `npm run lint` - ESLint

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **Convex 1.32** - Realtime backend (queries, mutations, schema)
- **Clerk 7** - Authentication (@clerk/nextjs)
- **Tailwind CSS 4** - Styling (via @tailwindcss/postcss)
- **TypeScript 5** - Strict mode enabled
- **date-fns**, **@dnd-kit**, **Lucide React**

## Architecture

### Data Model (convex/schema.ts)

Core relationship chain: **Pool → Members → Payment Cycles → Member Payments**

- **pools**: Status lifecycle is `draft → active → completed/cancelled`
- **pool_members**: Status is `invited → active → completed/removed` (soft-deleted, never hard-deleted)
- **payment_cycles**: One per member, generated at activation with computed payout dates
- **member_payments**: One per cycle per paying member, tracks payment proof via Convex storage

### Pool Lifecycle (convex/pools.ts)

1. **Draft**: Organizer creates pool, invites members, configures settings
2. **Activation** (`pools.activate`): Requires ≥2 active members. If `orderType === "random"`, shuffles and assigns payout positions. Generates all cycles + member_payments upfront. Only counts paying members (organizer excluded if non-paying).
3. **Active**: Payments submitted → verified → cycle completes → next cycle activates. Cycle advancement is atomic (all payments must confirm before next cycle).
4. **Completed**: Last cycle finishes → pool status auto-updates.

### Organizer-as-Member Distinction

The organizer can optionally join as a paying or non-paying member. This affects `maxMembers`, paying member counts, payment generation, and notification targeting throughout the codebase.

### Payment Verification (convex/payments.ts)

Two modes controlled by `pool.paymentVerifier`:
- `"organizer"` (default): Pool organizer confirms all payments
- `"recipient"`: Current cycle's payout recipient confirms payments

### Auth Flow

- ClerkProvider wraps ConvexProviderWithClerk in root layout
- `useCurrentUser` hook auto-upserts Clerk user into Convex on auth state change
- Convex is source-of-truth for user data; Clerk handles authentication only
- Middleware protects all routes except `/`, `/sign-in`, `/sso-callback`

### Responsive Layout System

Uses a **bifurcated mobile/desktop pattern**, not just responsive CSS:

- **ResponsiveLayout** (`components/layout/ResponsiveLayout.tsx`): Renders different component trees based on viewport — mobile gets `MobileContainer` + bottom nav, desktop gets sidebar + `desktopContent` prop
- **useIsDesktop** hook (`hooks/useIsDesktop.ts`): Uses `useSyncExternalStore` with media query (breakpoint: 1024px). Returns `false` on server to prevent hydration mismatch.
- Pool detail sub-pages (`/members`, `/schedule`, `/payments`) redirect to `?tab=` query params on desktop, rendering inside `DesktopPoolDetail` tabs instead of separate pages
- Desktop components live in `components/desktop/`

### Convex Usage Patterns

- Queries: `useQuery(api.module.queryName, args)` — pass `"skip"` as args to conditionally skip
- Mutations: `useMutation(api.module.mutationName)`
- All tables use `.withIndex()` for optimized queries
- File uploads use `generateUploadUrl` mutation → client upload → store returned `storageId`

### UI / Styling

- Mobile-first design (max-width 430px via MobileContainer)
- Dark theme with green accent gradient (`#4ade80` → `#22c55e`)
- Custom UI components (no shadcn) in `components/ui/`
- Locale is `en-PH` (Philippine locale) — see `lib/format.ts`
- Path alias: `@/*` maps to project root

### Invitation System (convex/invitations.ts)

- Token-based (32-char random), 7-day expiry
- Creates both invitation record + pool_member (status: "invited") on invite
- Duplicate pending invites return existing token
- Join flow at `/join/[token]/`
