'use client';

import { Note } from '@/types';
import { NoteCard } from './NoteCard';
import { EmptyState } from './EmptyState';

interface Props {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectNote: (note: Note) => void;
}

export function NoteGrid({ notes, isLoading, error, onRetry, onSelectNote }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#5C4033', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <p className="text-sm" style={{ color: '#8B6B5A' }}>
          {error}
        </p>
        <button onClick={onRetry} className="text-sm underline" style={{ color: '#5C4033' }}>
          Try again
        </button>
      </div>
    );
  }

  if (notes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-y-auto flex-1 p-6">
      <div className="grid gap-[13px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 content-start max-w-[950px]">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} onSelect={onSelectNote} />
        ))}
      </div>
    </div>
  );
}
