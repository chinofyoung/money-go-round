"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CycleCard } from "@/components/pool/CycleCard";
import { PaymentRow } from "@/components/pool/PaymentRow";
import { GreenButton } from "@/components/ui/GreenButton";
import { PaymentsPageSkeleton } from "@/components/ui/Skeleton";
import { RecipientEarningsCard } from "@/components/pool/RecipientEarningsCard";
import { Id } from "@/convex/_generated/dataModel";
import toast from "react-hot-toast";

interface PaymentsContentProps {
  poolId: string;
}

export function PaymentsContent({ poolId }: PaymentsContentProps) {
  const { convexUser } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const pool = useQuery(api.pools.getById, { poolId: poolId as Id<"pools"> });
  const members = useQuery(api.members.listByPool, { poolId: poolId as Id<"pools"> });
  const currentCycle = useQuery(api.cycles.getCurrentCycle, { poolId: poolId as Id<"pools"> });
  const cyclePayments = useQuery(
    api.payments.listByCycle,
    currentCycle ? { cycleId: currentCycle._id } : "skip"
  );

  const verifierAccounts = useQuery(
    api.payments.getVerifierAccounts,
    pool?.status === "active" ? { poolId: poolId as Id<"pools"> } : "skip"
  );

  const generateUploadUrl = useMutation(api.payments.generateUploadUrl);
  const markPaid = useMutation(api.payments.markPaid);
  const confirmPayment = useMutation(api.payments.confirmPayment);

  const isOrganizer = convexUser?._id === pool?.organizerId;
  const myMember = members?.find((m) => m.userId === convexUser?._id);
  const myPayment = cyclePayments?.find((p) => p.memberId === myMember?._id);
  const recipient = currentCycle
    ? members?.find((m) => m._id === currentCycle.recipientMemberId)
    : null;
  const isRecipient = myMember?._id === currentCycle?.recipientMemberId;
  const isVerifier =
    pool?.paymentVerifier === "recipient"
      ? myMember?._id === currentCycle?.recipientMemberId || isOrganizer
      : isOrganizer;
  const paidCount = cyclePayments?.filter((p) => p.confirmedByOrganizer).length ?? 0;
  const activeMembers = members?.filter((m) => m.status === "active") ?? [];

  async function handleUploadAndPay() {
    if (!fileRef.current?.files?.[0] || !myPayment) return;
    setUploading(true);
    try {
      const file = fileRef.current.files[0];
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await markPaid({ paymentId: myPayment._id, proofStorageId: storageId });
      toast.success("Payment submitted! Waiting for organizer confirmation.");
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirm(paymentId: Id<"member_payments">) {
    if (!convexUser) return;
    try {
      await confirmPayment({ paymentId, organizerId: convexUser._id });
      toast.success("Payment confirmed!");
    } catch {
      toast.error("Failed to confirm.");
    }
  }

  if (!pool || !members) {
    return <PaymentsPageSkeleton />;
  }

  return (
    <div className="flex-1 overflow-y-auto pb-6 px-4 space-y-4 pt-4">
      {pool?.status !== "active" ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-[#6b7280] text-sm text-center">
            Payments will appear once the Pool is active.
          </p>
        </div>
      ) : (
        <>
          {/* Cycle overview */}
          {currentCycle && recipient && (
            <CycleCard
              cycleNumber={currentCycle.cycleNumber}
              totalCycles={activeMembers.length}
              recipientName={recipient.displayName ?? ""}
              recipientEmail={recipient.email}
              payoutDate={currentCycle.payoutDate}
              totalAmount={currentCycle.totalAmount}
              currency={pool.currency}
              paidCount={paidCount}
              totalMembers={activeMembers.length - 1}
            />
          )}

          {/* Recipient banner + earnings */}
          {isRecipient && (
            <>
              <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-xl">🎉</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#4ade80]">You&apos;re receiving this cycle!</p>
                  <p className="text-xs text-[#6b7280]">No payment needed this round.</p>
                </div>
              </div>
              <RecipientEarningsCard
                paidCount={paidCount}
                totalMembers={activeMembers.length - 1}
                contributionAmount={pool.contributionAmount}
                currency={pool.currency}
              />
            </>
          )}

          {/* Payment accounts — show to payers */}
          {!isRecipient && myPayment && myPayment.status === "pending" && verifierAccounts && verifierAccounts.length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
              <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider">
                Send payment to
              </p>
              {verifierAccounts.map((acc) => (
                <div key={acc._id} className="bg-[#0a0a0a] rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80]">
                      {acc.type === "ewallet" ? "E-Wallet" : "Bank"}
                    </span>
                    <span className="text-sm font-semibold text-white">{acc.provider}</span>
                  </div>
                  <p className="text-sm text-white">{acc.accountName}</p>
                  {acc.accountNumber && (
                    <p className="text-sm text-[#6b7280] font-mono">{acc.accountNumber}</p>
                  )}
                  {acc.qrCodeUrl && (
                    <img
                      src={acc.qrCodeUrl}
                      alt={`${acc.provider} QR`}
                      className="w-full max-w-[200px] mx-auto rounded-xl border border-[#2a2a2a]"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* My payment action — only show if not the recipient */}
          {!isRecipient && myPayment && myPayment.status === "pending" && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white">My contribution</p>
              <p className="text-xs text-[#6b7280]">
                Upload your GCash or bank transfer screenshot as proof of payment.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadAndPay}
              />
              <GreenButton
                fullWidth
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : "Upload Payment Proof"}
              </GreenButton>
            </div>
          )}

          {!isRecipient && myPayment?.status === "paid" && !myPayment.confirmedByOrganizer && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <p className="text-sm text-yellow-400">
                Payment submitted — waiting for organizer confirmation.
              </p>
            </div>
          )}

          {/* All payments (verifier view) */}
          {isVerifier && cyclePayments && members && (
            <div>
              <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
                All Contributions
              </p>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4">
                {cyclePayments.map((payment) => {
                  const member = members.find((m) => m._id === payment.memberId);
                  if (!member) return null;
                  return (
                    <PaymentRow
                      key={payment._id}
                      name={member.displayName ?? ""}
                      email={member.email}
                      amount={payment.amount}
                      currency={pool.currency}
                      status={payment.status}
                      confirmedByOrganizer={payment.confirmedByOrganizer}
                      hasProof={!!payment.proofStorageId}
                      isOrganizer={isVerifier}
                      onConfirm={() => handleConfirm(payment._id)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
