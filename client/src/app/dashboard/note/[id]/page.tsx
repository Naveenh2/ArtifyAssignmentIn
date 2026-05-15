"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Archive,
  ArrowLeft,
  Ban,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { notifyNotesChanged } from "@/lib/notes-events";
import type { AiResult, Note } from "@/lib/types";
import { useNoteSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/**
 * Note workspace: autosave, markdown preview, AI assist, sharing, archive, optional Socket.io sync.
 */
export default function NoteEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const socket = useNoteSocket();

  const [note, setNote] = React.useState<Note | null>(null);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { note: n } = await api.note(params.id);
      setNote(n);
      setTitle(n.title);
      setContent(n.content);
      setCategory(n.category ?? "");
      setTagsInput(n.tags.map((t) => t.name).join(", "));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load note");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!socket || !params.id) return;
    socket.emit("join-note", params.id);
    const onDelta = (payload: { content?: string; title?: string; from?: string }) => {
      if (payload.from === socket.id) return;
      if (typeof payload.title === "string") setTitle(payload.title);
      if (typeof payload.content === "string") setContent(payload.content);
    };
    socket.on("note-delta", onDelta);
    return () => {
      socket.emit("leave-note", params.id);
      socket.off("note-delta", onDelta);
    };
  }, [socket, params.id]);

  const persist = React.useCallback(
    async (patch: Partial<Note> & { tagNames?: string[] }) => {
      if (!note) return;
      const tagNames =
        patch.tagNames ??
        tagsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      const { note: updated } = await api.patchNote(note.id, {
        ...patch,
        tagNames,
      });
      setNote(updated);
    },
    [note, tagsInput]
  );

  const debouncedSave = useDebouncedCallback(async () => {
    if (!note) return;
    try {
      await persist({ title, content, category: category || null });
      socket?.emit("note-delta", { noteId: note.id, title, content });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Autosave failed");
    }
  }, 900);

  React.useEffect(() => {
    if (!note || loading) return;
    debouncedSave();
  }, [title, content, category, note, loading, debouncedSave]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void (async () => {
          try {
            await persist({ title, content, category: category || null });
            toast.success("Saved");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed");
          }
        })();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [persist, title, content, category]);

  async function runAi() {
    if (!note) return;
    setAiLoading(true);
    setAiOpen(true);
    setAiResult(null);
    setAiError(null);
    try {
      const res = await api.generateSummary(note.id);
      setAiResult(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI request failed";
      setAiError(msg);
      setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  }

  async function applySuggestedTitle() {
    if (!aiResult?.suggested_title || !note) return;
    setTitle(aiResult.suggested_title);
    try {
      await persist({ title: aiResult.suggested_title });
      toast.success("Title updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update title");
    }
  }

  async function toggleArchive() {
    if (!note) return;
    try {
      const { note: updated } = await api.patchNote(note.id, {
        archived: !note.archived,
        tagNames: tagsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setNote(updated);
      toast.success(note.archived ? "Restored" : "Archived");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function remove() {
    if (!note) return;
    if (!confirm("Delete this note permanently?")) return;
    try {
      await api.deleteNote(note.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "Note not found") {
        toast.error(msg || "Delete failed");
        return;
      }
    }
    toast.success("Note deleted");
    notifyNotesChanged();
    router.replace("/dashboard");
    router.refresh();
  }

  async function revoke() {
    if (!note?.shareId) return;
    try {
      await api.revokeShare(note.id);
      setNote((n) => (n ? { ...n, shareId: null } : n));
      toast.success("Public link revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke share");
    }
  }

  async function share() {
    if (!note) return;
    try {
      const { shareId } = await api.shareNote(note.id);
      const url = `${window.location.origin}/shared/${shareId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Public link copied");
      setNote((n) => (n ? { ...n, shareId } : n));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
    }
  }

  async function saveMeta() {
    try {
      await persist({ tagNames: tagsInput.split(",").map((s) => s.trim()).filter(Boolean) });
      toast.success("Tags saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save tags");
    }
  }

  if (loading || !note) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading note…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        {note.archived && <Badge>Archived</Badge>}
        {note.shareId && (
          <Badge className="border border-dashed border-primary/40 bg-primary/10 text-primary">Shared</Badge>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="gap-2 rounded-full"
            onClick={() => {
              setAiOpen(true);
              void runAi();
            }}
          >
            <Sparkles className="h-4 w-4" /> AI assist
          </Button>
          <Dialog
            open={aiOpen}
            onOpenChange={(open) => {
              setAiOpen(open);
              if (!open) setAiError(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI insights</DialogTitle>
              </DialogHeader>
              {aiError ? (
                <p className="text-sm text-muted-foreground">{aiError}</p>
              ) : aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </div>
              ) : aiResult ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Summary</p>
                    <p className="leading-relaxed">{aiResult.summary}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Action items</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {aiResult.action_items.length === 0 && <li className="text-muted-foreground">None detected</li>}
                      {aiResult.action_items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Suggested title</p>
                      <p className="font-medium">{aiResult.suggested_title}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => void applySuggestedTitle()}>
                      <Wand2 className="h-4 w-4" /> Apply
                    </Button>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => void share()}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          {note.shareId && (
            <Button variant="outline" className="gap-2 rounded-full text-muted-foreground" onClick={() => void revoke()}>
              <Ban className="h-4 w-4" /> Revoke link
            </Button>
          )}
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => void toggleArchive()}>
            <Archive className="h-4 w-4" /> {note.archived ? "Restore" : "Archive"}
          </Button>
          <Button variant="destructive" className="gap-2 rounded-full" onClick={() => void remove()}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Card className="glass-panel space-y-4 border-border/60 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Work" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <div className="flex gap-2">
            <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ideas, planning" />
            <Button type="button" variant="secondary" onClick={() => void saveMeta()}>
              Save tags
            </Button>
          </div>
        </div>
        <Separator />
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Markdown preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="mt-4">
            <textarea
              className="min-h-[420px] w-full rounded-xl border border-border/60 bg-background/40 p-4 font-mono text-sm leading-relaxed shadow-inner backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted/50 [&_pre]:p-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "_Nothing to preview yet._"}</ReactMarkdown>
            </div>
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground">Autosaves after you pause typing. Press ⌘/Ctrl + S to save immediately.</p>
      </Card>
    </div>
  );
}
