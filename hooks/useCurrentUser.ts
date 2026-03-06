"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const upsert = useMutation(api.users.upsertFromClerk);

  const convexUser = useQuery(
    api.users.getByClerkId,
    isLoaded && user ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !user) return;
    upsert({
      clerkId: user.id,
      name: user.fullName ?? user.emailAddresses[0]?.emailAddress ?? "User",
      email: user.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: user.imageUrl,
    });
  }, [isLoaded, user, upsert]);

  return {
    clerkUser: user,
    convexUser,
    isLoaded: isLoaded && convexUser !== undefined,
  };
}
