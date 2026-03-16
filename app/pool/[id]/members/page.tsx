"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { MembersContent } from "@/components/pool/MembersContent";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { convexUser } = useCurrentUser();
  const pool = useQuery(api.pools.getById, { poolId: id as Id<"pools"> });
  const isOrganizer = convexUser?._id === pool?.organizerId;

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/pool/${id}?tab=members`);
    }
  }, [isDesktop, id, router]);

  // Avoid flash of mobile content on desktop before redirect
  if (isDesktop) return null;

  return (
    <MobileContainer>
      <PageHeader
        title="Members"
        action={
          isOrganizer ? (
            <Link href={`/pool/${id}/invite`}>
              <UserPlus size={20} className="text-[#4ade80]" />
            </Link>
          ) : undefined
        }
      />
      <MembersContent poolId={id} />
    </MobileContainer>
  );
}
