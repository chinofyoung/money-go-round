"use client";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { GreenButton } from "@/components/ui/GreenButton";
import { SignOutButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { Plus, Trash2, QrCode, Landmark, Wallet } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

type AccountType = "ewallet" | "bank";

interface AccountForm {
  type: AccountType;
  provider: string;
  accountName: string;
  accountNumber: string;
}

const DEFAULT_FORM: AccountForm = {
  type: "ewallet",
  provider: "",
  accountName: "",
  accountNumber: "",
};

const EWALLET_PROVIDERS = ["GCash", "Maya", "GrabPay", "ShopeePay"];
const BANK_PROVIDERS = ["BDO", "BPI", "Metrobank", "UnionBank", "Landbank", "PNB"];

export default function ProfilePage() {
  const { convexUser, clerkUser } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AccountForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrStorageId, setQrStorageId] = useState<Id<"_storage"> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const poolData = useQuery(
    api.pools.listForUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const paymentAccounts = useQuery(
    api.paymentAccounts.listByUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const addAccount = useMutation(api.paymentAccounts.add);
  const removeAccount = useMutation(api.paymentAccounts.remove);
  const generateUploadUrl = useMutation(api.paymentAccounts.generateUploadUrl);

  const organized = poolData?.organized ?? [];
  const member = (poolData?.member ?? []).filter(Boolean);
  const total = organized.length + member.length;
  const active = [...organized, ...member].filter((r) => r?.status === "active").length;

  async function handleUploadQr() {
    if (!fileRef.current?.files?.[0]) return;
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
      setQrStorageId(storageId);
      toast.success("QR code uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveAccount() {
    if (!convexUser || !form.provider.trim() || !form.accountName.trim()) return;
    setSaving(true);
    try {
      await addAccount({
        userId: convexUser._id,
        type: form.type,
        provider: form.provider.trim(),
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim() || undefined,
        qrCodeStorageId: qrStorageId ?? undefined,
      });
      toast.success("Payment account added");
      setForm(DEFAULT_FORM);
      setQrStorageId(null);
      setShowForm(false);
    } catch {
      toast.error("Failed to add account");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(accountId: Id<"payment_accounts">) {
    setDeletingId(accountId);
    try {
      await removeAccount({ accountId });
      toast.success("Account removed");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setDeletingId(null);
    }
  }

  if (!convexUser) {
    return (
      <MobileContainer>
        <PageHeader title="Profile" showBack={false} />
        <ProfileSkeleton />
        <BottomNav />
      </MobileContainer>
    );
  }

  const providers = form.type === "ewallet" ? EWALLET_PROVIDERS : BANK_PROVIDERS;

  return (
    <MobileContainer>
      <PageHeader title="Profile" showBack={false} />

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pt-4 pb-4">
        {/* Profile card */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col items-center gap-3">
          <Avatar
            src={clerkUser?.imageUrl}
            name={convexUser?.name ?? "U"}
            size="lg"
          />
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">{convexUser?.name}</h2>
            <p className="text-sm text-[#6b7280]">{convexUser?.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs text-[#6b7280]">Total Pools</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#4ade80]">{active}</p>
            <p className="text-xs text-[#6b7280]">Active</p>
          </div>
        </div>

        {/* Payment Accounts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider">
              Payment Accounts
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 text-xs text-[#4ade80]"
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </div>

          {/* Existing accounts */}
          {paymentAccounts && paymentAccounts.length > 0 && (
            <div className="space-y-2 mb-3">
              {paymentAccounts.map((acc) => (
                <div
                  key={acc._id}
                  className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {acc.type === "ewallet" ? (
                        <Wallet size={14} className="text-[#4ade80]" />
                      ) : (
                        <Landmark size={14} className="text-[#4ade80]" />
                      )}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80]">
                        {acc.type === "ewallet" ? "E-Wallet" : "Bank"}
                      </span>
                      <span className="text-sm font-semibold text-white">{acc.provider}</span>
                    </div>
                    <button
                      disabled={deletingId === acc._id}
                      onClick={() => handleDelete(acc._id)}
                      className="p-1.5 rounded-lg text-[#6b7280] hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-white">{acc.accountName}</p>
                  {acc.accountNumber && (
                    <p className="text-sm text-[#6b7280] font-mono mt-0.5">{acc.accountNumber}</p>
                  )}
                  {acc.qrCodeUrl && (
                    <img
                      src={acc.qrCodeUrl}
                      alt={`${acc.provider} QR`}
                      className="mt-2 w-full max-w-[160px] rounded-xl border border-[#2a2a2a]"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {paymentAccounts && paymentAccounts.length === 0 && !showForm && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 text-center">
              <p className="text-sm text-[#6b7280] mb-2">
                No payment accounts yet.
              </p>
              <p className="text-xs text-[#6b7280]">
                Add your GCash, Maya, or bank account so members know where to send payments.
              </p>
            </div>
          )}

          {/* Add account form */}
          {showForm && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
              <p className="text-sm font-semibold text-white">Add Payment Account</p>

              {/* Type toggle */}
              <div className="flex gap-2">
                {(["ewallet", "bank"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t, provider: "" }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      form.type === t
                        ? "bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80]"
                        : "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                    }`}
                  >
                    {t === "ewallet" ? "E-Wallet" : "Bank"}
                  </button>
                ))}
              </div>

              {/* Provider quick-select */}
              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Provider</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {providers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm((f) => ({ ...f, provider: p }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.provider === p
                          ? "bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80]"
                          : "bg-[#0a0a0a] border-[#2a2a2a] text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
                  placeholder="Or type provider name"
                  value={form.provider}
                  onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                />
              </div>

              {/* Account name */}
              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Account Name</label>
                <input
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
                  placeholder="e.g. Juan Dela Cruz"
                  value={form.accountName}
                  onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
                />
              </div>

              {/* Account number */}
              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Account Number (optional)</label>
                <input
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
                  placeholder="e.g. 0917 123 4567"
                  value={form.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                />
              </div>

              {/* QR Code upload */}
              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">QR Code (optional)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadQr}
                />
                {qrStorageId ? (
                  <div className="flex items-center gap-2 bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-xl px-4 py-2.5">
                    <QrCode size={16} className="text-[#4ade80]" />
                    <span className="text-sm text-[#4ade80]">QR uploaded</span>
                    <button
                      onClick={() => {
                        setQrStorageId(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="ml-auto text-xs text-[#6b7280]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-[#6b7280]"
                  >
                    <QrCode size={16} />
                    {uploading ? "Uploading..." : "Upload QR Code"}
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setForm(DEFAULT_FORM);
                    setQrStorageId(null);
                  }}
                  className="flex-1 h-10 rounded-xl border border-[#2a2a2a] text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <GreenButton
                  onClick={handleSaveAccount}
                  disabled={!form.provider.trim() || !form.accountName.trim() || saving}
                >
                  {saving ? "Saving..." : "Save"}
                </GreenButton>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <SignOutButton>
          <button className="w-full h-12 rounded-full border border-red-500/30 text-red-400 text-sm font-medium">
            Sign out
          </button>
        </SignOutButton>
      </div>

      <BottomNav />
    </MobileContainer>
  );
}
