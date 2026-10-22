"use client";

import { useEffect, useState } from "react";

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

async function refreshSession() {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
    });
    return response.status;
  } catch {
    return 0;
  }
}

export default function SessionKeeper() {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let mounted = true;
    let authenticated = false;
    let inFlight = true;
    const abort = new AbortController();
    const publish = (value: boolean) => {
      if (!mounted) return;
      authenticated = value;
      document.documentElement.dataset.authenticated = String(value);
      window.dispatchEvent(new CustomEvent("eidolon:session", { detail: { authenticated: value } }));
    };
    fetch("/api/auth/session", { cache: "no-store", signal: abort.signal }).then(async response => {
      if (response.ok) { const data = await response.json(); publish(data.authenticated === true); }
      else if (response.status === 401) publish(false);
    }).catch(() => {}).finally(() => { inFlight = false; });

    const refresh = async () => {
      if (!mounted || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const status = await refreshSession();
        if (!mounted) return;
        if (status >= 200 && status < 300) { publish(true); setExpired(false); }
        else if (status === 401) { if (authenticated) setExpired(true); publish(false); }
      } finally { inFlight = false; }
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refresh);

    return () => {
      mounted = false;
      abort.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return expired ? <aside className="session-notice" role="status"><span>Your EIDOLON session ended. Sign in again to continue private work.</span><a href="/auth">Sign in</a><button type="button" onClick={() => setExpired(false)} aria-label="Dismiss session notice">×</button></aside> : null;
}
