import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
