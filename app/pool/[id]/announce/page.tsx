"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { GreenButton } from "@/components/ui/GreenButton";
import { Id } from "@/convex/_generated/dataModel";
import { use, useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import toast from "react-hot-toast";

export default function AnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { convexUser } = useCurrentUser();
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const pool = useQuery(api.pools.getById, { poolId: id as Id<"pools"> });
  const announcements = useQuery(api.announcements.listByPool, {
    poolId: id as Id<"pools">,
  });
  const postAnnouncement = useMutation(api.announcements.post);

  const isOrganizer = convexUser?._id === pool?.organizerId;

  async function handlePost() {
    if (!convexUser || !message.trim()) return;
    setPosting(true);
    try {
      await postAnnouncement({
        poolId: id as Id<"pools">,
        authorId: convexUser._id,
        message: message.trim(),
      });
      setMessage("");
      toast.success("Announcement posted");
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <MobileContainer>
      <PageHeader title="Announcements" />

      <div className="flex-1 overflow-y-auto pb-6 px-4 py-4 space-y-3">
        {isOrganizer && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
            <textarea
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#4ade80] placeholder:text-[#6b7280] resize-none"
              placeholder="Write an announcement for your group…"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <GreenButton
              fullWidth
              size="sm"
              disabled={!message.trim() || posting}
              onClick={handlePost}
            >
              {posting ? "Posting…" : "Post Announcement"}
            </GreenButton>
          </div>
        )}

        {announcements?.length === 0 && (
          <div className="flex flex-col items-center py-12">
            <p className="text-[#6b7280] text-sm text-center">
              No announcements yet.
            </p>
          </div>
        )}

        {announcements?.map((a) => (
          <div
            key={a._id}
            className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Avatar name={pool?.name ?? "O"} size="sm" />
              <div>
                <p className="text-xs font-semibold text-white">Organizer</p>
                <p className="text-[10px] text-[#6b7280]">
                  {formatRelativeTime(a.createdAt)}
                </p>
              </div>
            </div>
            <p className="text-sm text-[#d1d5db] whitespace-pre-wrap">{a.message}</p>
          </div>
        ))}
      </div>
    </MobileContainer>
  );
}
