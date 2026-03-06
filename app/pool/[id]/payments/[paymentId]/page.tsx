"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { Id } from "@/convex/_generated/dataModel";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { PaymentReviewSkeleton } from "@/components/ui/Skeleton";

export default function PaymentReviewPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const { id, paymentId } = use(params);
  const router = useRouter();
  const { convexUser } = useCurrentUser();
  const [acting, setActing] = useState(false);

  const data = useQuery(api.payments.getPaymentDetail, {
    paymentId: paymentId as Id<"member_payments">,
  });

  const confirmPayment = useMutation(api.payments.confirmPayment);
  const rejectPayment = useMutation(api.payments.rejectPayment);

  if (!data) {
    return (
      <MobileContainer>
        <PageHeader title="Review Payment" />
        <PaymentReviewSkeleton />
      </MobileContainer>
    );
  }

  const { payment, member, pool, proofUrl } = data;

  if (!payment || !member) {
    return (
      <MobileContainer>
        <PageHeader title="Review Payment" />
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[#6b7280] text-sm">Payment not found.</p>
        </div>
      </MobileContainer>
    );
  }

  const isOrganizer = convexUser?._id === pool?.organizerId;
  // Server enforces authorization; client shows buttons to organizer or anyone
  // who arrived here via notification (recipient verifier)
  const canReview =
    (isOrganizer || pool?.paymentVerifier === "recipient") &&
    payment.status === "paid" &&
    !payment.confirmedByOrganizer;

  async function handleConfirm() {
    if (!convexUser) return;
    setActing(true);
    try {
      await confirmPayment({
        paymentId: paymentId as Id<"member_payments">,
        organizerId: convexUser._id,
      });
      toast.success("Payment confirmed!");
      router.back();
    } catch {
      toast.error("Failed to confirm payment.");
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!convexUser) return;
    setActing(true);
    try {
      await rejectPayment({
        paymentId: paymentId as Id<"member_payments">,
        organizerId: convexUser._id,
      });
      toast.success("Payment rejected.");
      router.back();
    } catch {
      toast.error("Failed to reject payment.");
    } finally {
      setActing(false);
    }
  }

  return (
    <MobileContainer>
      <PageHeader title="Review Payment" />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
        {/* Member info */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Avatar name={member.displayName || member.email} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {member.displayName || member.email}
              </p>
              <p className="text-xs text-[#6b7280]">{member.email}</p>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          <div className="mt-3 pt-3 border-t border-[#2a2a2a] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Amount</span>
              <span className="text-[#4ade80] font-semibold">
                {formatCurrency(payment.amount, pool?.currency ?? "PHP")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Pool</span>
              <span className="text-white">{pool?.name ?? "—"}</span>
            </div>
            {payment.paidAt && (
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Submitted</span>
                <span className="text-white">{formatDate(payment.paidAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Proof of payment */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
          <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-3">
            Proof of Payment
          </p>
          {proofUrl ? (
            <a href={proofUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={proofUrl}
                alt="Payment proof"
                className="w-full rounded-xl border border-[#2a2a2a] max-h-[400px] object-contain bg-black"
              />
              <p className="text-xs text-[#4ade80] text-center mt-2">Tap to view full size</p>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-[#6b7280]">
              <ImageIcon size={32} />
              <p className="text-sm">No proof uploaded</p>
            </div>
          )}
        </div>

        {/* Status info for already reviewed */}
        {payment.confirmedByOrganizer && (
          <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-[#4ade80] shrink-0" />
            <p className="text-sm text-[#4ade80]">This payment has been confirmed.</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {canReview && (
        <div className="shrink-0 px-4 py-3 flex gap-3 border-t border-[#2a2a2a] bg-[#0a0a0a]">
          <button
            disabled={acting}
            onClick={handleReject}
            className="flex-1 h-12 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <XCircle size={16} />
            Reject
          </button>
          <button
            disabled={acting}
            onClick={handleConfirm}
            className="flex-1 h-12 rounded-full bg-[#4ade80] text-black text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle size={16} />
            Verify
          </button>
        </div>
      )}
    </MobileContainer>
  );
}
