"use client";

import * as React from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Insights } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function InsightsPage() {
  const [data, setData] = React.useState<Insights | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await api.insights();
        setData(res);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load insights");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxWeekly = data ? Math.max(1, ...data.weeklyActivity.map((w) => w.edits)) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Insights</h1>
          <p className="text-muted-foreground">Activity, tags, and AI usage at a glance.</p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/dashboard">Back to notes</Link>
        </Button>
      </div>

      {loading || !data ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total notes" value={data.totalNotes} hint={`${data.activeNotes} active`} />
            <StatCard title="Archived" value={data.archivedCount} hint="Hidden from default list" />
            <StatCard title="AI runs" value={data.aiUsage.reduce((s, a) => s + a.count, 0)} hint="Summary & title assists" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-panel border-border/60">
              <CardHeader>
                <CardTitle>Recently edited</CardTitle>
                <CardDescription>Latest updates across your workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentlyEdited.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
                {data.recentlyEdited.map((n) => (
                  <Link key={n.id} href={`/dashboard/note/${n.id}`} className="block rounded-lg border border-border/50 bg-background/40 p-3 transition hover:border-primary/40">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(n.updatedAt).toLocaleString()}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-panel border-border/60">
              <CardHeader>
                <CardTitle>Most used tags</CardTitle>
                <CardDescription>Where your attention clusters.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.mostUsedTags.length === 0 && <p className="text-sm text-muted-foreground">Add tags to notes to see trends.</p>}
                {data.mostUsedTags.map((t) => (
                  <span key={t.name} className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium">
                    {t.name} · {t.count}
                  </span>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="glass-panel border-border/60">
            <CardHeader>
              <CardTitle>Weekly activity</CardTitle>
              <CardDescription>Note edits aggregated by day (last 14 days).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-end gap-1">
                {data.weeklyActivity.map((w) => {
                  const pct = Math.round((w.edits / maxWeekly) * 100);
                  return (
                    <div key={w.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <div
                        className="w-full max-w-[14px] rounded-full bg-primary/80"
                        style={{ height: `${Math.max(6, pct)}%` }}
                        title={`${w.date}: ${w.edits}`}
                      />
                      <span className="hidden text-[10px] text-muted-foreground sm:block">{w.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/60">
            <CardHeader>
              <CardTitle>AI usage by type</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {data.aiUsage.map((a) => (
                <div key={a.type} className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">{a.type}</p>
                  <p className="text-2xl font-semibold">{a.count}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card className="glass-panel border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-4xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
