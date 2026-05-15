import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(200_000).optional(),
  category: z.string().max(120).nullable().optional(),
  tagNames: z.array(z.string().max(64)).max(50).optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(200_000).optional(),
  archived: z.boolean().optional(),
  category: z.string().max(120).nullable().optional(),
  tagNames: z.array(z.string().max(64)).max(50).optional(),
});
