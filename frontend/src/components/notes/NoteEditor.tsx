'use client';

import { useRef, useState } from 'react';
import { updateNote } from '@/lib/api';
import { useAutoSave } from '@/hooks/useAutoSave';
import { formatNoteDate } from '@/lib/formatDate';
import { Category, Note } from '@/types';

interface Props {
  note: Note;
  categories: Category[];
  onClose: () => void;
  onNoteUpdated: (note: Note) => void;
}

export function NoteEditor({ note, categories, onClose, onNoteUpdated }: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [currentNote, setCurrentNote] = useState(note);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [closeBlocked, setCloseBlocked] = useState(false);
  const [isCategoryUpdating, setIsCategoryUpdating] = useState(false);
  const pendingPayloadRef = useRef<{ title?: string; content?: string } | null>(null);
  const { save: autoSave, cancel: cancelAutoSave } = useAutoSave(
    note.id,
    (saved) => {
      pendingPayloadRef.current = null;
      setSaveError(null);
      setCurrentNote(saved);
      onNoteUpdated(saved);
    },
    () => {
      setSaveError('Failed to save. Changes may not be persisted.');
    },
  );

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setTitle(value);
    const merged = { ...pendingPayloadRef.current, title: value };
    pendingPayloadRef.current = merged;
    autoSave(merged);
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);
    const merged = { ...pendingPayloadRef.current, content: value };
    pendingPayloadRef.current = merged;
    autoSave(merged);
  }

  async function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (isCategoryUpdating) return;
    const categoryId = e.target.value || null;
    setIsCategoryUpdating(true);
    try {
      const updated = await updateNote(note.id, { category: categoryId });
      setCurrentNote(updated);
      setSaveError(null);
      onNoteUpdated(updated);
    } catch {
      setSaveError('Failed to update category.');
    } finally {
      setIsCategoryUpdating(false);
    }
  }

  async function handleClose() {
    cancelAutoSave();
    if (pendingPayloadRef.current) {
      setIsClosing(true);
      try {
        const updated = await updateNote(note.id, pendingPayloadRef.current);
        onNoteUpdated(updated);
        pendingPayloadRef.current = null;
        onClose();
      } catch {
        setSaveError('Failed to save. Retry or discard changes to close.');
        setCloseBlocked(true);
        setIsClosing(false);
      }
    } else {
      onClose();
    }
  }

  function handleDiscardAndClose() {
    pendingPayloadRef.current = null;
    setCloseBlocked(false);
    setSaveError(null);
    onClose();
  }

  const bgColor = currentNote.category?.color ?? '#F5F1ED';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{
          borderColor: bgColor === '#F5F1ED' ? '#DDD0C8' : `${bgColor}80`,
        }}
      >
        <div className="flex items-center gap-3">
          <select
            value={currentNote.category?.id ?? ''}
            onChange={handleCategoryChange}
            disabled={isCategoryUpdating}
            className="text-sm px-3 py-1.5 rounded-xl border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5C4033]/20 disabled:opacity-50 disabled:cursor-wait"
            style={{
              backgroundColor: 'rgba(255,255,255,0.5)',
              color: '#5C4033',
            }}
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {saveError && (
            <div
              className="flex items-center gap-2 text-xs px-2 py-1 rounded"
              style={{ color: '#9B1C1C', backgroundColor: '#FEF2F2' }}
            >
              <span>{saveError}</span>
              {closeBlocked && (
                <>
                  <button
                    onClick={handleClose}
                    disabled={isClosing}
                    className="underline font-medium disabled:opacity-50"
                  >
                    Retry
                  </button>
                  <button onClick={handleDiscardAndClose} className="underline font-medium">
                    Discard and close
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: '#8B6B5A' }}>
            Last edited: {formatNoteDate(currentNote.last_edited_at)}
          </span>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 disabled:opacity-50"
            style={{ color: '#5C4033' }}
            aria-label="Close note"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-auto px-8 py-6 max-w-3xl mx-auto w-full">
        <textarea
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          rows={2}
          maxLength={500}
          className="w-full resize-none bg-transparent border-0 outline-none text-3xl font-bold leading-snug placeholder-[#C4A99A] mb-4"
          style={{ fontFamily: 'Georgia, serif', color: '#5C4033' }}
        />
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          maxLength={50000}
          className="flex-1 w-full resize-none bg-transparent border-0 outline-none text-base leading-relaxed placeholder-[#C4A99A]"
          style={{ color: '#5C4033', minHeight: '60vh' }}
        />
      </div>
    </div>
  );
}
