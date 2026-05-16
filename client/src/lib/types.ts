export type Tag = { id: string; name: string };

export type NoteAi = {
  summary: string;
  action_items: string[];
  suggested_title: string;
  generatedAt: string;
  model: string | null;
  /** True when note body changed since last AI run */
  stale: boolean;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  archived: boolean;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  shareId: string | null;
  ai: NoteAi | null;
};

export type AiResult = {
  summary: string;
  action_items: string[];
  suggested_title: string;
  model?: string;
  from_cache?: boolean;
  generated_at?: string | null;
};

export type Insights = {
  totalNotes: number;
  archivedCount: number;
  activeNotes: number;
  recentlyEdited: { id: string; title: string; updatedAt: string }[];
  mostUsedTags: { name: string; count: number }[];
  aiUsage: { type: string; count: number }[];
  weeklyActivity: { date: string; edits: number }[];
};
