"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentsContent } from "@/components/pool/PaymentsContent";

export default function PaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isDesktop = useIsDesktop();
  const router = useRouter();

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/pool/${id}?tab=payments`);
    }
  }, [isDesktop, id, router]);

  if (isDesktop) return null;

  return (
    <MobileContainer>
      <PageHeader title="Payments" />
      <PaymentsContent poolId={id} />
    </MobileContainer>
  );
}
