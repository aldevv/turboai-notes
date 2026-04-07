export interface Category {
  id: string;
  name: string;
  color: string;
  note_count?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: Category | null;
  last_edited_at: string;
  created_at: string;
}

export interface NoteUpdatePayload {
  title?: string;
  content?: string;
  category?: string | null;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: { id: number; email: string };
}
