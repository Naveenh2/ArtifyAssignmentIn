"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, LineChart, LogOut, Moon, NotebookPen, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Notes", icon: NotebookPen },
  { href: "/dashboard/insights", label: "Insights", icon: LineChart },
];

/**
 * Dashboard chrome: glass sidebar, theme toggle, responsive collapse on small screens.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "glass-panel fixed inset-y-0 left-0 z-40 w-64 border-y-0 border-l-0 transition-transform max-lg:border-r lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">Peblo Notes</span>
        </div>
        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <nav className="flex flex-col gap-1 p-3">
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <Button variant={active ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
          <Separator className="my-2" />
          <div className="space-y-2 px-3 pb-6">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{user.name ?? "Welcome"}</p>
              <p className="truncate">{user.email}</p>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              Toggle theme
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </ScrollArea>
      </aside>
      {open && <button type="button" className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl lg:hidden">
          <Button size="icon" variant="outline" onClick={() => setOpen((v) => !v)}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Menu</span>
        </header>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
