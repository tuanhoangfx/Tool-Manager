import type { AppScreen } from "../../lib/workspace-screen";

export function designHref(screen: AppScreen, extra?: { note?: string }) {
  const p = new URLSearchParams();
  p.set("tab", "design");
  p.set("screen", screen);
  if (extra?.note) p.set("note", extra.note);
  return `?${p.toString()}`;
}

export function readNoteIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("note");
}
