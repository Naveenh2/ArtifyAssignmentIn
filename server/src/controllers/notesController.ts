import type { Prisma } from "@prisma/client";
import type { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { runCombinedAi } from "../services/aiService.js";
import { AIUsageType } from "@prisma/client";

function noteSelect() {
  return {
    id: true,
    title: true,
    content: true,
    archived: true,
    category: true,
    createdAt: true,
    updatedAt: true,
    noteTags: { select: { tag: { select: { id: true, name: true } } } },
    shared: { select: { shareId: true } },
  } satisfies Prisma.NoteSelect;
}

type NotePayload = Prisma.NoteGetPayload<{ select: ReturnType<typeof noteSelect> }>;

export async function listNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const q = req.query as Record<string, string | undefined>;
    const search = q.search?.trim();
    const tag = q.tag?.trim();
    const archived = q.archived === "true" ? true : q.archived === "false" ? false : undefined;
    const sort = q.sort === "updatedAt_asc" ? "asc" : "desc";

    const where: Prisma.NoteWhereInput = { userId };
    if (archived !== undefined) where.archived = archived;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }
    if (tag) {
      where.noteTags = { some: { tag: { name: { equals: tag, mode: "insensitive" }, userId } } };
    }

    const notes = (await prisma.note.findMany({
      where,
      orderBy: { updatedAt: sort },
      select: noteSelect(),
    })) as NotePayload[];
    return res.json({
      notes: notes.map(serializeNote),
    });
  } catch (e) {
    next(e);
  }
}

export async function getNote(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const note = (await prisma.note.findFirst({
      where: { id, userId },
      select: noteSelect(),
    })) as NotePayload | null;
    if (!note) {
      throw new AppError(404, "Note not found");
    }
    return res.json({ note: serializeNote(note) });
  } catch (e) {
    next(e);
  }
}

export async function createNote(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { title, content, category, tagNames } = req.body as {
      title?: string;
      content?: string;
      category?: string | null;
      tagNames?: string[];
    };

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.note.create({
        data: {
          userId,
          title: title?.trim() || "Untitled",
          content: content ?? "",
          category: category?.trim() || null,
        },
        select: { id: true },
      });
      if (tagNames?.length) {
        await syncTags(tx, userId, created.id, tagNames);
      }
      return (await tx.note.findUniqueOrThrow({
        where: { id: created.id },
        select: noteSelect(),
      })) as NotePayload;
    });

    return res.status(201).json({ note: serializeNote(note) });
  } catch (e) {
    next(e);
  }
}

export async function updateNote(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const { title, content, archived, category, tagNames } = req.body as {
      title?: string;
      content?: string;
      archived?: boolean;
      category?: string | null;
      tagNames?: string[];
    };

    const existing = await prisma.note.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new AppError(404, "Note not found");
    }

    const note = await prisma.$transaction(async (tx) => {
      await tx.note.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() || "Untitled" }),
          ...(content !== undefined && { content }),
          ...(archived !== undefined && { archived }),
          ...(category !== undefined && { category: category?.trim() || null }),
        },
      });
      if (tagNames !== undefined) {
        await tx.noteTag.deleteMany({ where: { noteId: id } });
        await syncTags(tx, userId, id, tagNames);
      }
      return (await tx.note.findUniqueOrThrow({
        where: { id },
        select: noteSelect(),
      })) as NotePayload;
    });

    return res.json({ note: serializeNote(note) });
  } catch (e) {
    next(e);
  }
}

export async function deleteNote(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const result = await prisma.note.deleteMany({ where: { id, userId } });
    if (result.count === 0) {
      throw new AppError(404, "Note not found");
    }
    return res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function generateSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) {
      throw new AppError(404, "Note not found");
    }
    const text = `${note.title}\n\n${note.content}`.trim();
    if (!text) {
      throw new AppError(400, "Note is empty");
    }

    const ai = await runCombinedAi(text);
    await prisma.aIUsage.create({
      data: {
        userId,
        type: AIUsageType.COMBINED,
        model: ai.model,
      },
    });

    return res.json(ai);
  } catch (e) {
    next(e);
  }
}

export async function enableShare(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) {
      throw new AppError(404, "Note not found");
    }
    const existing = await prisma.sharedNote.findUnique({ where: { noteId: id } });
    if (existing) {
      return res.json({
        shareId: existing.shareId,
        publicUrl: `/shared/${existing.shareId}`,
      });
    }
    const shareId = nanoid(12);
    const shared = await prisma.sharedNote.create({
      data: { noteId: id, shareId },
    });
    return res.json({
      shareId: shared.shareId,
      publicUrl: `/shared/${shared.shareId}`,
    });
  } catch (e) {
    next(e);
  }
}

/** Removes public access for a note (revokes the share link). */
export async function revokeShare(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const note = await prisma.note.findFirst({ where: { id, userId } });
    if (!note) {
      throw new AppError(404, "Note not found");
    }
    await prisma.sharedNote.deleteMany({ where: { noteId: id } });
    return res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function getShared(req: Request, res: Response, next: NextFunction) {
  try {
    const { shareId } = req.params;
    const row = await prisma.sharedNote.findUnique({
      where: { shareId },
      include: {
        note: {
          select: {
            title: true,
            content: true,
            updatedAt: true,
            category: true,
            noteTags: { select: { tag: { select: { name: true } } } },
          },
        },
      },
    });
    if (!row) {
      throw new AppError(404, "Shared note not found");
    }
    return res.json({
      note: {
        title: row.note.title,
        content: row.note.content,
        updatedAt: row.note.updatedAt,
        category: row.note.category,
        tags: row.note.noteTags.map((nt) => nt.tag.name),
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function insights(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const [totalNotes, archivedCount, recent, tagCounts, aiByType, weekly] = await Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.note.count({ where: { userId, archived: true } }),
      prisma.note.findMany({
        where: { userId, archived: false },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.noteTag.groupBy({
        by: ["tagId"],
        where: { note: { userId } },
        _count: { _all: true },
      }),
      prisma.aIUsage.groupBy({
        by: ["type"],
        where: { userId },
        _count: { _all: true },
      }),
      weeklyActivity(userId),
    ]);

    const tagsWithNames = await prisma.tag.findMany({
      where: { id: { in: tagCounts.map((t) => t.tagId) } },
      select: { id: true, name: true },
    });
    const tagIdToName = Object.fromEntries(tagsWithNames.map((t) => [t.id, t.name]));
    const mostUsedTags = tagCounts
      .map((t) => ({ name: tagIdToName[t.tagId] ?? t.tagId, count: t._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return res.json({
      totalNotes,
      archivedCount,
      activeNotes: totalNotes - archivedCount,
      recentlyEdited: recent,
      mostUsedTags,
      aiUsage: aiByType.map((a) => ({ type: a.type, count: a._count._all })),
      weeklyActivity: weekly,
    });
  } catch (e) {
    next(e);
  }
}

async function weeklyActivity(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);
  const notes = await prisma.note.findMany({
    where: { userId, updatedAt: { gte: since } },
    select: { updatedAt: true },
  });
  const buckets: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  for (const n of notes) {
    const key = n.updatedAt.toISOString().slice(0, 10);
    if (buckets[key] !== undefined) buckets[key]++;
  }
  return Object.entries(buckets).map(([date, edits]) => ({ date, edits }));
}

async function syncTags(
  tx: Prisma.TransactionClient,
  userId: string,
  noteId: string,
  names: string[]
) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const tagIds: string[] = [];
  for (const name of unique) {
    const tag = await tx.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
    });
    tagIds.push(tag.id);
  }
  if (tagIds.length) {
    await tx.noteTag.createMany({
      data: tagIds.map((tagId) => ({ noteId, tagId })),
      skipDuplicates: true,
    });
  }
}

function serializeNote(note: NotePayload) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    archived: note.archived,
    category: note.category,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.noteTags.map((nt) => nt.tag),
    shareId: note.shared?.shareId ?? null,
  };
}
