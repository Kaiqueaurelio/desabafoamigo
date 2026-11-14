import { useEffect, useState, useCallback } from "react";

function read(key: string, fallback = false): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

/**
 * Persisted collapsible state for a sidebar. Syncs across tabs and
 * across components via a custom event so multiple mounts stay aligned.
 */
export function useSidebarToggle(key: string, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed);

  // hydrate after mount to avoid SSR mismatch
  useEffect(() => {
    setCollapsed(read(key, defaultCollapsed));
  }, [key, defaultCollapsed]);

  useEffect(() => {
    function onSync(e: Event) {
      const detail = (e as CustomEvent<{ key: string; value: boolean }>).detail;
      if (detail?.key === key) setCollapsed(detail.value);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === key && e.newValue !== null) setCollapsed(e.newValue === "1");
    }
    window.addEventListener("sidebar:toggle", onSync as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("sidebar:toggle", onSync as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // localStorage may be unavailable in private browsing or restricted frames.
      }
      window.dispatchEvent(new CustomEvent("sidebar:toggle", { detail: { key, value: next } }));
      return next;
    });
  }, [key]);

  return { collapsed, toggle } as const;
}
