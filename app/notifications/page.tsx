"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatRelativeTime } from "@/lib/format";
import { Bell } from "lucide-react";
import { NotificationsSkeleton } from "@/components/ui/Skeleton";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState } from "react";

const ICON_MAP: Record<string, string> = {
  payment_due: "⏰",
  payment_submitted: "📤",
  payment_confirmed: "✅",
  payment_rejected: "❌",
  payout_upcoming: "📅",
  payout_received: "💰",
  member_joined: "👋",
  order_assigned: "🎯",
  pool_started: "🚀",
  invite_received: "📩",
  announcement_posted: "📢",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { convexUser } = useCurrentUser();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const notifications = useQuery(
    api.notifications.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const clearRead = useMutation(api.notifications.clearRead);
  const acceptInvitation = useMutation(api.invitations.accept);
  const declineInvitation = useMutation(api.invitations.decline);

  async function handleAccept(token: string, notificationId: string) {
    if (!convexUser) return;
    setActioningId(notificationId);
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

  async function handleDecline(token: string, notificationId: string) {
    if (!convexUser) return;
    setActioningId(notificationId);
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
    <MobileContainer>
      <PageHeader
        title="Notifications"
        showBack={false}
        action={
          notifications && notifications.length > 0 ? (
            <button
              onClick={() => convexUser && clearRead({ userId: convexUser._id })}
              className="text-xs text-[#4ade80] shrink-0"
            >
              Clear all
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto px-4 space-y-2 pt-4">
        {notifications === undefined ? (
          <NotificationsSkeleton />
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Bell size={32} className="text-[#2a2a2a]" />
            <p className="text-[#6b7280] text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isInvite = n.type === "invite_received" && n.invitationToken && !n.read;
            const isPaymentReview = n.type === "payment_submitted" && n.paymentId && n.poolId;
            const isAnnouncement = n.type === "announcement_posted" && n.poolId;
            const isActioning = actioningId === n._id;
            const isClickable = isPaymentReview || isAnnouncement || (!isInvite && !n.read);

            return (
              <div
                key={n._id}
                onClick={() => {
                  if (isPaymentReview) {
                    markRead({ notificationId: n._id });
                    router.push(`/pool/${n.poolId}/payments/${n.paymentId}`);
                    return;
                  }
                  if (isAnnouncement) {
                    markRead({ notificationId: n._id });
                    router.push(`/pool/${n.poolId}/announce`);
                    return;
                  }
                  if (!isInvite && !n.read) markRead({ notificationId: n._id });
                }}
                className={`flex gap-3 p-4 rounded-2xl border transition-colors ${n.read
                    ? "bg-[#141414] border-[#2a2a2a]"
                    : "bg-[#1c1c1c] border-[#4ade80]/20"
                  } ${isClickable ? "cursor-pointer" : ""}`}
              >
                <span className="text-xl shrink-0 mt-0.5">
                  {ICON_MAP[n.type] ?? "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-snug">{n.message}</p>
                  <p className="text-xs text-[#6b7280] mt-1">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                  {isPaymentReview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead({ notificationId: n._id });
                        router.push(`/pool/${n.poolId}/payments/${n.paymentId}`);
                      }}
                      className="mt-3 h-8 w-full rounded-xl bg-[#4ade80]/10 text-[#4ade80] text-xs font-semibold"
                    >
                      Review Payment
                    </button>
                  )}
                  {isInvite && n.invitationToken && (
                    <div className="flex gap-2 mt-3">
                      <button
                        disabled={isActioning}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(n.invitationToken!, n._id);
                        }}
                        className="flex-1 h-8 rounded-xl bg-[#4ade80] text-black text-xs font-semibold disabled:opacity-50"
                      >
                        {isActioning ? "…" : "Accept"}
                      </button>
                      <button
                        disabled={isActioning}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDecline(n.invitationToken!, n._id);
                        }}
                        className="flex-1 h-8 rounded-xl border border-[#2a2a2a] text-[#6b7280] text-xs font-medium disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                {!n.read && !isInvite && (
                  <div className="w-2 h-2 rounded-full bg-[#4ade80] shrink-0 mt-1.5" />
                )}
              </div>
            );
          })
        )}
      </div>

    </MobileContainer>
  );
}
