'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { useCategories } from '@/hooks/useCategories';
import { Sidebar } from '@/components/notes/Sidebar';
import { NoteGrid } from '@/components/notes/NoteGrid';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { Note } from '@/types';

export default function NotesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const {
    notes,
    setNotes,
    isLoading: notesLoading,
    error: notesError,
    hasMore,
    createNote,
    refresh: refreshNotes,
    loadMore,
  } = useNotes(activeCategoryId);
  const { categories, error: categoryError } = useCategories();

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return null;
  }

  async function handleNewNote() {
    try {
      const note = await createNote();
      setSelectedNote(note);
    } catch (err) {
      console.error('Failed to create note', err);
    }
  }

  function handleNoteUpdated(updatedNote: Note) {
    setNotes((prev) =>
      prev
        .map((n) => (n.id === updatedNote.id ? updatedNote : n))
        .sort(
          (a, b) => new Date(b.last_edited_at).getTime() - new Date(a.last_edited_at).getTime(),
        ),
    );
    setSelectedNote(updatedNote);
  }

  function handleSelectCategory(id: string | null) {
    setActiveCategoryId(id);
    setSelectedNote(null);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F0E8' }}>
      <Sidebar
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={handleSelectCategory}
        categoryError={categoryError}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-end px-6 py-5 flex-shrink-0">
          <button
            onClick={handleNewNote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80 active:opacity-60"
            style={{
              border: '1.5px solid #A07850',
              backgroundColor: 'transparent',
              color: '#6B4E30',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Note
          </button>
        </header>

        <div className="flex-1 overflow-auto flex flex-col">
          <NoteGrid
            notes={notes}
            isLoading={notesLoading}
            error={notesError}
            onRetry={refreshNotes}
            onSelectNote={setSelectedNote}
          />
          {hasMore && (
            <div className="flex justify-center py-4 flex-shrink-0">
              <button
                onClick={loadMore}
                disabled={notesLoading}
                className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-80 active:opacity-60 disabled:opacity-40"
                style={{
                  border: '1.5px solid #A07850',
                  color: '#6B4E30',
                  backgroundColor: 'transparent',
                }}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </main>

      {selectedNote && (
        <NoteEditor
          key={selectedNote.id}
          note={selectedNote}
          categories={categories}
          onClose={() => setSelectedNote(null)}
          onNoteUpdated={handleNoteUpdated}
        />
      )}
    </div>
  );
}
