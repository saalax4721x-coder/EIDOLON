"use client";

import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

async function refreshSession() {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default function SessionKeeper() {
  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      if (!mounted || document.visibilityState === "hidden") return;
      await refreshSession();
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refresh);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return null;
}
