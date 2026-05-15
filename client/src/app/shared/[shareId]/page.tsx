"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Public share view — no authentication required. */
export default function SharedNotePage() {
  const params = useParams<{ shareId: string }>();
  const [note, setNote] = React.useState<{
    title: string;
    content: string;
    updatedAt: string;
    category: string | null;
    tags: string[];
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await api.shared(params.shareId);
        setNote(res.note);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Not found");
      }
    })();
  }, [params.shareId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">{error}</p>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    );
  }

  if (!note) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Peblo Notes
        </Link>
        <Badge>Public</Badge>
      </div>
      <Card className="glass-panel border-border/60">
        <CardHeader>
          <CardTitle className="text-3xl">{note.title}</CardTitle>
          <p className="text-sm text-muted-foreground">Updated {new Date(note.updatedAt).toLocaleString()}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {note.category && <Badge>{note.category}</Badge>}
            {note.tags.map((t) => (
              <Badge key={t} className="border border-dashed">
                {t}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted/50 [&_pre]:p-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
