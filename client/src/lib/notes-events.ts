/** Fired after notes are created, updated, or deleted so the dashboard can refetch. */
export const NOTES_CHANGED_EVENT = "peblo-notes-changed";

export function notifyNotesChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTES_CHANGED_EVENT));
  }
}
