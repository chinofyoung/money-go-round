"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ScheduleContent } from "@/components/pool/ScheduleContent";

export default function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isDesktop = useIsDesktop();
  const router = useRouter();

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/pool/${id}?tab=schedule`);
    }
  }, [isDesktop, id, router]);

  if (isDesktop) return null;

  return (
    <MobileContainer>
      <PageHeader title="Payout Schedule" />
      <ScheduleContent poolId={id} />
    </MobileContainer>
  );
}
