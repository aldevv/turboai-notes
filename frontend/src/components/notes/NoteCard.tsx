'use client';

import { Note } from '@/types';
import { formatNoteDate } from '@/lib/formatDate';

interface Props {
  note: Note;
  onSelect: (note: Note) => void;
}

export function NoteCard({ note, onSelect }: Props) {
  const bgColor = note.category?.color ?? '#EDE8E0';

  return (
    <button
      onClick={() => onSelect(note)}
      className="w-full text-left rounded-2xl p-5 transition-transform hover:scale-[1.01] active:scale-[0.99] flex flex-col"
      style={{
        backgroundColor: bgColor,
        border: '1.5px solid rgba(0,0,0,0.15)',
        minHeight: '300px',
      }}
    >
      <div className="mb-3">
        <span className="text-xs font-bold" style={{ color: '#5C3D2A' }}>
          {formatNoteDate(note.last_edited_at)}
        </span>
        {note.category && (
          <span className="text-xs ml-2" style={{ color: '#5C3D2A' }}>
            {note.category.name}
          </span>
        )}
      </div>

      <h3
        className="font-bold leading-tight mb-2"
        style={{
          fontFamily: 'Georgia, serif',
          color: '#3B2314',
          fontSize: '1.75rem',
        }}
      >
        {note.title || 'Untitled'}
      </h3>

      {note.content && (
        <p
          className="text-sm leading-relaxed"
          style={{
            color: '#3B2314',
            display: '-webkit-box',
            WebkitLineClamp: 6,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {note.content}
        </p>
      )}
    </button>
  );
}
