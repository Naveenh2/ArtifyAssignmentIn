"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { NOTES_CHANGED_EVENT, notifyNotesChanged } from "@/lib/notes-events";
import type { Note } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { notes: list } = await api.notes({
        search: query || undefined,
        tag: tag || undefined,
        archived: showArchived ? true : false,
        sort: "updatedAt_desc",
      });
      setNotes(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [query, tag, showArchived]);

  /** Refetch when landing on /dashboard or when another view mutates notes. */
  React.useEffect(() => {
    if (pathname !== "/dashboard") return;
    void load();
  }, [pathname, load]);

  React.useEffect(() => {
    const onChanged = () => void load();
    window.addEventListener(NOTES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(NOTES_CHANGED_EVENT, onChanged);
  }, [load]);

  const debouncedSetQuery = useDebouncedCallback((value: string) => setQuery(value), 350);

  React.useEffect(() => {
    debouncedSetQuery(search);
  }, [search, debouncedSetQuery]);

  const allTags = React.useMemo(() => {
    const map = new Map<string, true>();
    notes.forEach((n) => n.tags.forEach((t) => map.set(t.name, true)));
    return [...map.keys()].sort();
  }, [notes]);

  async function createNote() {
    try {
      const { note } = await api.createNote({ title: "Untitled", content: "", tagNames: [] });
      toast.success("Note created");
      router.push(`/dashboard/note/${note.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create note");
    }
  }

  async function handleDeleteNote(note: Note, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete “${note.title}”?`)) return;
    const prev = notes;
    setNotes((list) => list.filter((n) => n.id !== note.id));
    try {
      await api.deleteNote(note.id);
      toast.success("Note deleted");
      notifyNotesChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Already removed server-side — keep optimistic UI in sync
      if (msg === "Note not found") {
        toast.success("Note deleted");
        notifyNotesChanged();
        return;
      }
      setNotes(prev);
      toast.error(msg || "Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">Search, tag, and open any note. Auto-save keeps edits safe.</p>
        </div>
        <Button onClick={() => void createNote()} className="gap-2 self-start rounded-full">
          <Plus className="h-4 w-4" /> New note
        </Button>
      </div>

      <Card className="glass-panel border-border/60">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search titles and content…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background/60 px-2 text-sm backdrop-blur-sm"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              <option value="">All tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Button type="button" variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? "Showing archived" : "Show archived"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)
            : notes.map((note) => (
                <div key={note.id} className="group relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 z-10 h-8 w-8 opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete note"
                    onClick={(e) => void handleDeleteNote(note, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Link href={`/dashboard/note/${note.id}`}>
                    <Card className="h-full border-border/60 bg-background/30 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="line-clamp-2 text-base">{note.title}</CardTitle>
                      <CardDescription>{new Date(note.updatedAt).toLocaleString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-1">
                      {note.category && <Badge>{note.category}</Badge>}
                      {note.tags.map((t) => (
                        <Badge key={t.id} className="border border-dashed border-border/60">
                          {t.name}
                        </Badge>
                      ))}
                    </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
        </CardContent>
      </Card>
    </div>
  );
}
