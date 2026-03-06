"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { MemberRow } from "@/components/pool/MemberRow";
import { GreenButton } from "@/components/ui/GreenButton";
import { Id } from "@/convex/_generated/dataModel";
import { use, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, UserPlus } from "lucide-react";
import { MembersPageSkeleton } from "@/components/ui/Skeleton";

function SortableMemberRow({
  member,
}: {
  member: { _id: string; displayName?: string | null; email: string; payoutPosition?: number | null; status: "invited" | "active" | "completed" | "removed" };
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: member._id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 border-b border-[#2a2a2a] last:border-0"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-2 text-[#6b7280] cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1">
        <MemberRow
          name={member.displayName ?? ""}
          email={member.email}
          status={member.status}
        />
      </div>
    </div>
  );
}

export default function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { convexUser } = useCurrentUser();
  const updateOrder = useMutation(api.members.updatePayoutOrder);

  const pool = useQuery(api.pools.getById, { poolId: id as Id<"pools"> });
  const members = useQuery(api.members.listByPool, { poolId: id as Id<"pools"> });

  const [localOrder, setLocalOrder] = useState<typeof members | null>(null);

  const isOrganizer = convexUser?._id === pool?.organizerId;
  const canReorder = isOrganizer && pool?.orderType === "assigned" && pool?.status === "draft";

  if (!members) {
    return (
      <MobileContainer>
        <PageHeader title="Members" />
        <MembersPageSkeleton />
      </MobileContainer>
    );
  }

  const displayed = localOrder ?? members ?? [];
  const activeMembers = displayed
    .filter((m) => m.status === "active")
    .sort((a, b) => (a.payoutPosition ?? 0) - (b.payoutPosition ?? 0));
  const invitedMembers = displayed.filter((m) => m.status === "invited");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const list = localOrder ?? members ?? [];
    const oldIdx = list.findIndex((m) => m._id === active.id);
    const newIdx = list.findIndex((m) => m._id === over.id);
    setLocalOrder(arrayMove(list, oldIdx, newIdx));
  }

  async function saveOrder() {
    if (!localOrder) return;
    const active = localOrder.filter((m) => m.status === "active");
    await updateOrder({
      updates: active.map((m, i) => ({
        memberId: m._id as Id<"pool_members">,
        payoutPosition: i + 1,
      })),
    });
    toast.success("Order saved!");
    setLocalOrder(null);
  }

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

      <div className="flex-1 overflow-y-auto pb-6 px-4 pt-4 space-y-4">
        {/* Active members */}
        {activeMembers.length > 0 && (
          <div>
            <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
              Active · {activeMembers.length}
              {canReorder && " · drag to reorder"}
            </p>
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4">
              {canReorder ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={activeMembers.map((m) => m._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {activeMembers.map((m) => (
                      <SortableMemberRow key={m._id} member={m} />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                activeMembers.map((m) => (
                  <MemberRow
                    key={m._id}
                    name={m.displayName ?? ""}
                    email={m.email}
                    status={m.status}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Invited (pending) */}
        {invitedMembers.length > 0 && (
          <div>
            <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider mb-2">
              Invited · {invitedMembers.length}
            </p>
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-4">
              {invitedMembers.map((m) => (
                <MemberRow
                  key={m._id}
                  name={m.displayName ?? ""}
                  email={m.email}
                  status={m.status}
                />
              ))}
            </div>
          </div>
        )}

        {localOrder && canReorder && (
          <GreenButton fullWidth onClick={saveOrder}>
            Save Order
          </GreenButton>
        )}
      </div>
    </MobileContainer>
  );
}
