export type Tag = { id: string; name: string };

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
};

export type AiResult = {
  summary: string;
  action_items: string[];
  suggested_title: string;
  model?: string;
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
