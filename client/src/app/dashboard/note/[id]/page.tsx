"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Ban,
  Copy,
  FilePlus2,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { notifyNotesChanged } from "@/lib/notes-events";
import type { AiResult, Note, NoteAi } from "@/lib/types";
import { countWordsFromHtml } from "@/lib/editor-html";
import { useNoteSocket } from "@/lib/socket";
import { useNoteAutosave } from "@/hooks/use-note-autosave";
import { RichTextEditor, RichTextPreview } from "@/components/editor/rich-text-editor";
import { SaveStatus } from "@/components/editor/save-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function noteAiToResult(ai: NoteAi): AiResult {
  return {
    summary: ai.summary,
    action_items: ai.action_items,
    suggested_title: ai.suggested_title,
    model: ai.model ?? undefined,
    generated_at: ai.generatedAt,
    from_cache: true,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Note workspace with Tiptap rich text (HTML in DB), autosave, AI, share. */
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
  const aiContentSnapshot = React.useRef<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { note: n } = await api.note(params.id);
      setNote(n);
      setTitle(n.title);
      setContent(n.content);
      setCategory(n.category ?? "");
      setTagsInput(n.tags.map((t) => t.name).join(", "));
      if (n.ai && !n.ai.stale) {
        setAiResult(noteAiToResult(n.ai));
      } else {
        setAiResult(null);
      }
      aiContentSnapshot.current = JSON.stringify({
        title: n.title,
        content: n.content,
        category: n.category ?? "",
        tags: n.tags.map((t) => t.name).sort(),
      });
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
    if (loading || !note?.ai || note.ai.stale) return;
    const current = JSON.stringify({
      title,
      content,
      category,
      tags: tagsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .sort(),
    });
    if (aiContentSnapshot.current && current !== aiContentSnapshot.current) {
      setNote((n) => (n?.ai ? { ...n, ai: { ...n.ai, stale: true } } : n));
    }
  }, [title, content, category, tagsInput, loading, note?.ai]);

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

  const autosaveWatchKey = React.useMemo(
    () => JSON.stringify({ title, content, category }),
    [title, content, category]
  );

  const { status: saveStatus, errorMessage: saveError, saveNow } = useNoteAutosave({
    enabled: !!note && !loading,
    watchKey: autosaveWatchKey,
    delayMs: 2000,
    onSave: async () => {
      if (!note) return;
      await persist({ title, content, category: category || null });
      socket?.emit("note-delta", { noteId: note.id, title, content });
    },
  });

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow().then(() => toast.success("Saved"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveNow]);

  const wordCount = countWordsFromHtml(content);
  const canRunAi = wordCount >= 8;

  function openAiDialog() {
    setAiOpen(true);
    setAiError(null);
    if (note?.ai && !note.ai.stale && !aiResult) {
      setAiResult(noteAiToResult(note.ai));
    }
  }

  async function runAi(regenerate = false) {
    if (!note) return;
    if (!canRunAi) {
      toast.error("Write at least 8 words before generating a summary");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    if (regenerate) setAiResult(null);
    try {
      const res = await api.generateSummary(note.id, { regenerate });
      setAiResult(res);
      setNote((n) =>
        n
          ? {
              ...n,
              ai: {
                summary: res.summary,
                action_items: res.action_items,
                suggested_title: res.suggested_title,
                generatedAt: res.generated_at ?? new Date().toISOString(),
                model: res.model ?? null,
                stale: false,
              },
            }
          : n
      );
      aiContentSnapshot.current = JSON.stringify({
        title,
        content,
        category,
        tags: tagsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .sort(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI request failed";
      setAiError(msg);
      if (regenerate) setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  }

  async function copySummary() {
    if (!aiResult?.summary) return;
    await navigator.clipboard.writeText(aiResult.summary);
    toast.success("Summary copied");
  }

  function insertSummaryIntoNote() {
    if (!aiResult) return;
    const items =
      aiResult.action_items.length > 0
        ? `<ul>${aiResult.action_items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
        : "<p><em>No action items</em></p>";
    const block = `<hr><h2>AI Summary</h2><p>${escapeHtml(aiResult.summary)}</p><h3>Action items</h3>${items}`;
    setContent((c) => (c.trim() ? `${c}${block}` : `<p></p>${block}`));
    toast.success("Summary inserted into note");
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
        <SaveStatus status={saveStatus} errorMessage={saveError} className="ml-auto sm:ml-0" />
        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <Button variant="secondary" className="gap-2 rounded-full" onClick={openAiDialog}>
            <Sparkles className="h-4 w-4" /> AI assist
          </Button>
          <Dialog
            open={aiOpen}
            onOpenChange={(open) => {
              setAiOpen(open);
              if (!open) setAiError(null);
            }}
          >
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>AI insights</DialogTitle>
                {aiResult?.generated_at && (
                  <p className="text-xs text-muted-foreground">
                    {aiResult.from_cache ? "Cached" : "Generated"}{" "}
                    {new Date(aiResult.generated_at).toLocaleString()}
                    {note.ai?.stale && " · note changed since last run"}
                  </p>
                )}
              </DialogHeader>
              {aiError ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive">{aiError}</p>
                  <Button size="sm" variant="outline" onClick={() => void runAi(true)} disabled={!canRunAi || aiLoading}>
                    Retry
                  </Button>
                </div>
              ) : aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </div>
              ) : aiResult ? (
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => void copySummary()}>
                      <Copy className="h-3.5 w-3.5" /> Copy summary
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={insertSummaryIntoNote}>
                      <FilePlus2 className="h-3.5 w-3.5" /> Insert into note
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => void runAi(true)}
                      disabled={!canRunAi || aiLoading}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                    </Button>
                  </div>
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
              ) : (
                <div className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Generate a summary, action items, and title suggestion from your note.
                    {!canRunAi && " Add at least 8 words to enable AI."}
                  </p>
                  {note.ai?.stale && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Your note changed since the last AI run. Regenerate for an updated summary.
                    </p>
                  )}
                  <Button
                    className="gap-2 rounded-full"
                    disabled={!canRunAi || aiLoading}
                    onClick={() => void runAi(false)}
                  >
                    <Sparkles className="h-4 w-4" /> Generate summary
                  </Button>
                </div>
              )}
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
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-4">
            <RichTextEditor
              editorKey={note.id}
              content={content}
              onChange={setContent}
              placeholder="Start writing your note…"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-4">
            <RichTextPreview html={content} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
