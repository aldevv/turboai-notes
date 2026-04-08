export interface AuthUser {
  id: number;
  email: string;
}

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
  user: AuthUser;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
