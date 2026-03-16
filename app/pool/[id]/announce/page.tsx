"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnnounceContent } from "@/components/pool/AnnounceContent";

export default function AnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isDesktop = useIsDesktop();
  const router = useRouter();

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/pool/${id}?tab=announcements`);
    }
  }, [isDesktop, id, router]);

  if (isDesktop) return null;

  return (
    <MobileContainer>
      <PageHeader title="Announcements" />
      <AnnounceContent poolId={id} />
    </MobileContainer>
  );
}
