"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GreenButton } from "@/components/ui/GreenButton";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import toast from "react-hot-toast";

type Step = 1 | 2 | 3;

interface FormData {
  name: string;
  description: string;
  contributionAmount: string;
  currency: string;
  payoutSchedule: "weekly" | "biweekly" | "mid_month" | "end_of_month";
  startDate: string;
  orderType: "assigned" | "random";
  paymentVerifier: "organizer" | "recipient";
  joinAsOrganizer: boolean;
}

const DRAFT_KEY = "pool-draft";
const AUTO_SAVE_DELAY = 1500;

const SCHEDULE_OPTIONS = [
  { value: "weekly",       label: "Weekly" },
  { value: "biweekly",     label: "Every 2 weeks" },
  { value: "mid_month",    label: "Mid-month (15th)" },
  { value: "end_of_month", label: "End of month" },
] as const;

const DEFAULT_FORM: FormData = {
  name: "",
  description: "",
  contributionAmount: "",
  currency: "PHP",
  payoutSchedule: "end_of_month",
  startDate: "",
  orderType: "assigned",
  paymentVerifier: "organizer",
  joinAsOrganizer: true,
};

export default function NewPoolPage() {
  const router = useRouter();
  const { convexUser } = useCurrentUser();
  const createPool = useMutation(api.pools.create);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed.form }));
        if (parsed.step) setStep(parsed.step);
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Auto-save draft with debounce
  const saveDraft = useCallback(() => {
    setSaving(true);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step }));
    } catch {
      // storage full or unavailable
    }
    setTimeout(() => setSaving(false), 600);
  }, [form, step]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveDraft, AUTO_SAVE_DELAY);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [form, step, hydrated, saveDraft]);

  function set(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!convexUser) return;
    setLoading(true);
    try {
      const poolId = await createPool({
        organizerId: convexUser._id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        contributionAmount: Number(form.contributionAmount),
        currency: form.currency.trim() || "PHP",
        payoutSchedule: form.payoutSchedule,
        orderType: form.orderType,
        paymentVerifier: form.paymentVerifier,
        startDate: form.startDate ? new Date(form.startDate).getTime() : undefined,
        joinAsOrganizer: form.joinAsOrganizer,
        organizerName: convexUser.name,
        organizerEmail: convexUser.email,
      });
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Pool created!");
      router.push(`/pool/${poolId}/invite`);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const step1Valid = form.name.trim() && form.contributionAmount && Number(form.contributionAmount) > 0;
  const step2Valid = true;

  return (
    <ResponsiveLayout>
      <PageHeader
        title="Create Pool"
        action={
          saving ? (
            <span className="text-[10px] text-[#6b7280]">Saving draft...</span>
          ) : hydrated && form.name ? (
            <span className="text-[10px] text-[#4ade80]">Draft saved</span>
          ) : null
        }
      />

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step
                ? "w-6 bg-[#4ade80]"
                : s < step
                ? "w-2 bg-[#4ade80]/50"
                : "w-2 bg-[#2a2a2a]"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto overflow-x-hidden">
        {/* Step 1: Details */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-white">Group Details</h2>

            <div>
              <label className="text-xs text-[#6b7280] mb-1.5 block">Group Name *</label>
              <input
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
                placeholder="e.g. Office Paluwagan 2025"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-[#6b7280] mb-1.5 block">Description (optional)</label>
              <textarea
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280] resize-none"
                placeholder="What is this group for?"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Amount per cycle *</label>
                <input
                  type="number"
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280]"
                  placeholder="5000"
                  value={form.contributionAmount}
                  onChange={(e) => set("contributionAmount", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Currency</label>
                <input
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80]"
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-white">Schedule</h2>

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

            <div>
              <label className="text-xs text-[#6b7280] mb-1.5 block">Start date (optional)</label>
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
          </>
        )}

        {/* Step 3: Order */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-white">Payout Order</h2>
            <p className="text-sm text-[#6b7280]">How will you decide who gets paid first?</p>

            <div className="space-y-3">
              {[
                {
                  value: "assigned",
                  label: "Organizer assigns",
                  desc: "You drag and drop members to set the payout order after they join.",
                },
                {
                  value: "random",
                  label: "Random draw",
                  desc: "Order is randomly assigned when you start the Pool.",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set("orderType", opt.value as "assigned" | "random")}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                    form.orderType === opt.value
                      ? "bg-[#4ade80]/10 border-[#4ade80]"
                      : "bg-[#141414] border-[#2a2a2a]"
                  }`}
                >
                  <p className={`font-semibold text-sm mb-1 ${form.orderType === opt.value ? "text-[#4ade80]" : "text-white"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-[#6b7280]">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Payment verifier */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-white mb-1">Who verifies payments?</h3>
              <p className="text-xs text-[#6b7280] mb-3">Choose who confirms or rejects payment proofs each cycle.</p>
              <div className="space-y-2">
                {[
                  {
                    value: "organizer",
                    label: "Organizer",
                    desc: "You review and confirm all payments every cycle.",
                  },
                  {
                    value: "recipient",
                    label: "Cycle recipient",
                    desc: "The member receiving the pot that cycle verifies payments.",
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set("paymentVerifier", opt.value as "organizer" | "recipient")}
                    className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                      form.paymentVerifier === opt.value
                        ? "bg-[#4ade80]/10 border-[#4ade80]"
                        : "bg-[#141414] border-[#2a2a2a]"
                    }`}
                  >
                    <p className={`font-semibold text-sm mb-1 ${form.paymentVerifier === opt.value ? "text-[#4ade80]" : "text-white"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-[#6b7280]">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Join as member toggle */}
            <button
              onClick={() => setForm((f) => ({ ...f, joinAsOrganizer: !f.joinAsOrganizer }))}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                form.joinAsOrganizer
                  ? "bg-[#4ade80]/10 border-[#4ade80]"
                  : "bg-[#141414] border-[#2a2a2a]"
              }`}
            >
              <div className="text-left">
                <p className={`font-semibold text-sm mb-0.5 ${form.joinAsOrganizer ? "text-[#4ade80]" : "text-white"}`}>
                  Join as a member
                </p>
                <p className="text-xs text-[#6b7280]">
                  You&apos;ll also contribute and be included in the payout rotation.
                </p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors shrink-0 ml-4 flex items-center px-1 ${form.joinAsOrganizer ? "bg-[#4ade80]" : "bg-[#2a2a2a]"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${form.joinAsOrganizer ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>

            {/* Summary */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-2 mt-2">
              <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider">Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Group</span>
                <span className="text-white font-medium">{form.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Contribution</span>
                <span className="text-[#4ade80] font-semibold">
                  {form.currency} {Number(form.contributionAmount).toLocaleString()} / cycle
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Schedule</span>
                <span className="text-white capitalize">{form.payoutSchedule.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Verifies payments</span>
                <span className="text-white capitalize">{form.paymentVerifier === "recipient" ? "Cycle recipient" : "Organizer"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">You&apos;re a member</span>
                <span className={form.joinAsOrganizer ? "text-[#4ade80] font-medium" : "text-[#6b7280]"}>
                  {form.joinAsOrganizer ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer buttons — always visible above nav */}
      <div className="shrink-0 px-4 py-3 flex gap-3 border-t border-[#2a2a2a] bg-[#0a0a0a]">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="h-12 px-5 rounded-full border border-[#2a2a2a] text-white text-sm font-medium"
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <GreenButton
            fullWidth
            disabled={step === 1 ? !step1Valid : !step2Valid}
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            Continue
          </GreenButton>
        ) : (
          <GreenButton fullWidth disabled={loading} onClick={handleSubmit}>
            {loading ? "Creating..." : "Create Pool"}
          </GreenButton>
        )}
      </div>

    </ResponsiveLayout>
  );
}
