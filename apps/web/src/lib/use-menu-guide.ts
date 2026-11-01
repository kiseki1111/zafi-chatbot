"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function useMenuGuide(menuKey: string) {
  const { user } = useAuthStore();
  const userId = user?.id || "guest";
  const storageKey = `menu_guide_seen:${userId}:${menuKey}`;

  const [seen, setSeen] = useState<boolean>(true); // default true agar tidak flick saat hydrating

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const isSeen = localStorage.getItem(storageKey) === "true";
      setSeen(isSeen);
    } catch {
      setSeen(false);
    }
  }, [storageKey]);

  const markSeen = useCallback(() => {
    setSeen(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {}
    }
  }, [storageKey]);

  const reset = useCallback(() => {
    setSeen(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [storageKey]);

  return { seen, markSeen, reset };
}
