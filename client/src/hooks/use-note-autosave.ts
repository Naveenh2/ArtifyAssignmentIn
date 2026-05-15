"use client";

import * as React from "react";
import { useDebouncedCallback } from "use-debounce";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave (default 2s) with Saving / Saved / Error UI states.
 */
export function useNoteAutosave(options: {
  enabled: boolean;
  onSave: () => Promise<void>;
  /** Values that should trigger a debounced save when changed */
  watchKey: string;
  delayMs?: number;
}) {
  const { enabled, onSave, watchKey, delayMs = 2000 } = options;
  const [status, setStatus] = React.useState<AutosaveStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const mounted = React.useRef(true);
  const isFirstRun = React.useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runSave = React.useCallback(async () => {
    if (!enabled) return;
    setStatus("saving");
    setErrorMessage(null);
    try {
      await onSave();
      if (!mounted.current) return;
      setStatus("saved");
    } catch (e) {
      if (!mounted.current) return;
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "Save failed");
    }
  }, [enabled, onSave]);

  const debouncedSave = useDebouncedCallback(runSave, delayMs);

  React.useEffect(() => {
    if (!enabled) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    debouncedSave();
  }, [watchKey, enabled, debouncedSave]);

  const saveNow = React.useCallback(async () => {
    debouncedSave.cancel();
    await runSave();
  }, [debouncedSave, runSave]);

  return { status, errorMessage, saveNow };
}
