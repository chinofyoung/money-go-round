"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GreenButton } from "@/components/ui/GreenButton";
import { Id } from "@/convex/_generated/dataModel";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { EditPoolSkeleton, Skeleton } from "@/components/ui/Skeleton";

const SCHEDULE_OPTIONS = [
  { value: "weekly",       label: "Weekly" },
  { value: "biweekly",     label: "Every 2 weeks" },
  { value: "mid_month",    label: "Mid-month (15th)" },
  { value: "end_of_month", label: "End of month" },
] as const;

export default function EditPoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const updatePool = useMutation(api.pools.update);
  const pool = useQuery(api.pools.getById, { poolId: id as Id<"pools"> });

  const [form, setForm] = useState({
    name: "",
    description: "",
    contributionAmount: "",
    currency: "PHP",
    payoutSchedule: "end_of_month" as "weekly" | "biweekly" | "mid_month" | "end_of_month",
    paymentVerifier: "organizer" as "organizer" | "recipient",
    startDate: "",
  });
  const [loading, setLoading] = useState(false);

  // Populate form once pool loads
  useEffect(() => {
    if (!pool) return;
    setForm({
      name: pool.name,
      description: pool.description ?? "",
      contributionAmount: String(pool.contributionAmount),
      currency: pool.currency,
      payoutSchedule: pool.payoutSchedule,
      paymentVerifier: pool.paymentVerifier ?? "organizer",
      startDate: pool.startDate
        ? new Date(pool.startDate).toISOString().split("T")[0]
        : "",
    });
  }, [pool]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await updatePool({
        poolId: id as Id<"pools">,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        contributionAmount: Number(form.contributionAmount),
        currency: form.currency.trim().toUpperCase(),
        payoutSchedule: form.payoutSchedule,
        paymentVerifier: form.paymentVerifier,
        startDate: form.startDate ? new Date(form.startDate).getTime() : undefined,
      });
      toast.success("Pool updated!");
      router.back();
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  if (!pool) {
    return (
      <ResponsiveLayout>
        <PageHeader title="Edit Pool" />
        <EditPoolSkeleton />
        <div className="px-4 py-4 border-t border-[#2a2a2a]">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </ResponsiveLayout>
    );
  }

  const isDraft = pool?.status === "draft";

  return (
    <ResponsiveLayout>
      <PageHeader title="Edit Pool" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="text-xs text-[#6b7280] mb-1.5 block">Group Name</label>
          <input
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-[#6b7280] mb-1.5 block">Description</label>
          <textarea
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280] resize-none"
            rows={3}
            placeholder="Optional"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#6b7280] mb-1.5 block">Amount per cycle</label>
            <input
              type="number"
              className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80]"
              value={form.contributionAmount}
              onChange={(e) => set("contributionAmount", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[#6b7280] mb-1.5 block">Currency</label>
            <input
              className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80]"
              value={form.currency}
              maxLength={3}
              onChange={(e) => set("currency", e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {isDraft && (
          <div>
            <label className="text-xs text-[#6b7280] mb-2 block">Payout frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {SCHEDULE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set("payoutSchedule", opt.value)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium border transition-colors text-left ${
                    form.payoutSchedule === opt.value
                      ? "bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80]"
                      : "bg-[#141414] border-[#2a2a2a] text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment verifier — editable anytime */}
        <div>
          <label className="text-xs text-[#6b7280] mb-2 block">Who verifies payments?</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "organizer", label: "Organizer" },
              { value: "recipient", label: "Cycle Recipient" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => set("paymentVerifier", opt.value)}
                className={`py-3 px-4 rounded-xl text-sm font-medium border transition-colors text-left ${
                  form.paymentVerifier === opt.value
                    ? "bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80]"
                    : "bg-[#141414] border-[#2a2a2a] text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#6b7280] mb-1.5 block">Start date</label>
          <div className="relative rounded-xl border border-[#2a2a2a] bg-[#141414] overflow-hidden focus-within:border-[#4ade80]">
            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none" />
            <input
              type="date"
              className="w-full max-w-full min-w-0 bg-transparent rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-[#2a2a2a]">
        <GreenButton fullWidth disabled={!form.name.trim() || loading} onClick={handleSave}>
          {loading ? "Saving…" : "Save Changes"}
        </GreenButton>
      </div>
    </ResponsiveLayout>
  );
}
