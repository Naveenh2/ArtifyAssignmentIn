"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { countCharsFromHtml, countWordsFromHtml, toEditorHtml } from "@/lib/editor-html";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "./editor.css";

export type RichTextEditorProps = {
  /** HTML stored in PostgreSQL */
  content: string;
  onChange: (html: string) => void;
  /** Remount editor when note id changes */
  editorKey: string;
  editable?: boolean;
  placeholder?: string;
  className?: string;
};

const SLASH_ITEMS: { label: string; run: (e: Editor) => boolean }[] = [
  { label: "Heading 1", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Bullet list", run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Task list", run: (e) => e.chain().focus().toggleTaskList().run() },
  { label: "Quote", run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code block", run: (e) => e.chain().focus().toggleCodeBlock().run() },
];

/**
 * Notion-style rich text editor — outputs HTML for Prisma `Note.content`.
 */
export function RichTextEditor({
  content,
  onChange,
  editorKey,
  editable = true,
  placeholder = "Start writing, or type '/' for commands…",
  className,
}: RichTextEditorProps) {
  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashIndex, setSlashIndex] = React.useState(0);
  const slashOpenRef = React.useRef(false);
  const slashIndexRef = React.useRef(0);
  const editorRef = React.useRef<Editor | null>(null);

  React.useEffect(() => {
    slashOpenRef.current = slashOpen;
  }, [slashOpen]);

  React.useEffect(() => {
    slashIndexRef.current = slashIndex;
  }, [slashIndex]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        Highlight.configure({ multicolor: false }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
      ],
      content: toEditorHtml(content),
      editable,
      editorProps: {
        attributes: {
          class: "tiptap-editor focus:outline-none",
          spellcheck: "true",
        },
        handleKeyDown: (view, event) => {
          const ed = editorRef.current;
          if (event.key === "/" && editable && !slashOpenRef.current) {
            const { $from } = view.state.selection;
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
            if (textBefore === "" || textBefore.endsWith(" ")) {
              setSlashOpen(true);
              setSlashIndex(0);
              slashOpenRef.current = true;
              slashIndexRef.current = 0;
            }
          }
          if (slashOpenRef.current && ed) {
            if (event.key === "Escape") {
              setSlashOpen(false);
              slashOpenRef.current = false;
              return true;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSlashIndex((i) => {
                const next = (i + 1) % SLASH_ITEMS.length;
                slashIndexRef.current = next;
                return next;
              });
              return true;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setSlashIndex((i) => {
                const next = (i - 1 + SLASH_ITEMS.length) % SLASH_ITEMS.length;
                slashIndexRef.current = next;
                return next;
              });
              return true;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              const item = SLASH_ITEMS[slashIndexRef.current];
              setSlashOpen(false);
              slashOpenRef.current = false;
              item.run(ed);
              return true;
            }
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
    },
    [editorKey, editable, placeholder]
  );

  React.useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  React.useEffect(() => {
    if (!editor) return;
    const html = toEditorHtml(content);
    if (editor.getHTML() !== html && !editor.isFocused) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editorKey, content, editor]);

  const wordCount = countWordsFromHtml(content);
  const charCount = countCharsFromHtml(content);

  if (!editor) {
    return <Skeleton className="min-h-[480px] w-full rounded-xl" />;
  }

  return (
    <div className={cn("tiptap-editor-shell relative", className)}>
      {editable && <EditorToolbar editor={editor} />}
      <div className="tiptap-editor">
        <EditorContent editor={editor} />
      </div>
      {slashOpen && editable && (
        <div
          className="absolute left-4 top-14 z-20 w-52 overflow-hidden rounded-lg border border-border/60 bg-popover/95 py-1 shadow-lg backdrop-blur-xl"
          role="listbox"
        >
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Insert block</p>
          {SLASH_ITEMS.map((item, i) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex w-full px-3 py-2 text-left text-sm hover:bg-accent",
                i === slashIndex && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                setSlashOpen(false);
                slashOpenRef.current = false;
                item.run(editor);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>
          {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} characters
        </span>
        <span className="hidden sm:inline">⌘/Ctrl+S to save · ⌘B/I/U formatting shortcuts</span>
      </div>
    </div>
  );
}

/** Read-only HTML preview (same styles as editor). */
export function RichTextPreview({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn("tiptap-preview rounded-xl border border-border/60 bg-background/40", className)}
      dangerouslySetInnerHTML={{ __html: toEditorHtml(html) }}
    />
  );
}
