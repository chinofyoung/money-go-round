# Moneygoround

Rotating savings group (ROSCA/paluwagan) platform.

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
- **date-fns** - Date utilities
- **@dnd-kit** - Drag and drop (member ordering)
- **Lucide React** - Icons

## Project Structure

```
app/                    # Next.js App Router pages
  pool/[id]/            # Pool detail routes (members, payments, schedule, etc.)
  join/[token]/         # Invitation join flow
  my-pools/             # User's pools list
  notifications/        # Notification center
convex/                 # Convex backend
  schema.ts             # Database schema (users, pools, pool_members, payments, etc.)
  pools.ts              # Pool CRUD & activation logic
  members.ts            # Membership management
  payments.ts           # Payment submission/confirmation
  cycles.ts             # Payment cycle queries
  invitations.ts        # Token-based invitations
  notifications.ts      # Notification system
components/
  providers/            # ConvexClientProvider (Clerk + Convex integration)
  layout/               # MobileContainer, BottomNav, PageHeader
  pool/                 # PoolCard, CycleCard, MemberRow, ScheduleTimeline
  ui/                   # GreenButton, StatCard, StatusBadge, Avatar, Skeleton
hooks/useCurrentUser.ts # Clerk-to-Convex user sync hook
lib/format.ts           # Currency & date formatting
lib/utils.ts            # cn() classname helper
```

## Key Patterns

### Auth Flow
- ClerkProvider wraps ConvexProviderWithClerk in root layout
- `useCurrentUser` hook auto-upserts Clerk user into Convex on auth
- Middleware protects all routes except `/`, `/sign-in`, `/sso-callback`

### Convex Usage
- Queries: `useQuery(api.module.queryName, args)` - pass `"skip"` to skip
- Mutations: `useMutation(api.module.mutationName)`
- All tables use `.withIndex()` for optimized queries
- Schema defined in `convex/schema.ts` with typed indexes

### UI / Styling
- Mobile-first design (max-width 430px via MobileContainer)
- Dark theme with green accent gradient (#4ade80 to #22c55e)
- Custom UI components (no shadcn) - all in `components/ui/`
- Path alias: `@/*` maps to project root
