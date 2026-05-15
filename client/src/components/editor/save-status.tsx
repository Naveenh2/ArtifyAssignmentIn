"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import type { AutosaveStatus } from "@/hooks/use-note-autosave";
import { cn } from "@/lib/utils";

export function SaveStatus({
  status,
  errorMessage,
  className,
}: {
  status: AutosaveStatus;
  errorMessage?: string | null;
  className?: string;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium transition-opacity",
        status === "saved" && "text-muted-foreground",
        status === "saving" && "text-muted-foreground",
        status === "error" && "text-destructive",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden />
          Saved
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {errorMessage ?? "Could not save"}
        </>
      )}
    </div>
  );
}
