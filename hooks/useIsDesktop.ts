"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_BREAKPOINT = 1024;
const MEDIA_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MEDIA_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(MEDIA_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
