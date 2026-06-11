import type { NoteListItem } from "../notes/types";
import type { CookieBinding } from "./cookieBridge";

export type CookieAutoRow = {
  binding: CookieBinding;
  note: NoteListItem | undefined;
  lines: string[];
};
