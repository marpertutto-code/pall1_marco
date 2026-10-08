"use client";

import { useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "@/components/icons";

const CHANGE_EVENT = "pall1-theme-change";
const STORAGE_KEY = "pall1-theme";

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(CHANGE_EVENT, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    media.removeEventListener("change", callback);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle({ className = "size-10 rounded-control" }: { className?: string } = {}) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* storage non disponibile */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      aria-pressed={isDark}
      className={[
        // Niente `size`/`rounded` di base: li decide il chiamante, così non si
        // scontrano due utility Tailwind (es. `size-10` contro `size-11`) con
        // esito deciso dall'ordine nel foglio, non dall'ordine della classe.
        "inline-flex items-center justify-center text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isDark ? <IconSun className="size-[18px]" /> : <IconMoon className="size-[18px]" />}
    </button>
  );
}
