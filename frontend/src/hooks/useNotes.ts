'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import { Note } from '@/types';

export function useNotes(categoryId: string | null = null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError(null);
    setPage(1);
    api
      .getNotes({ categoryId: categoryId ?? undefined })
      .then((data) => {
        if (!ignore) {
          setNotes(data.results);
          setHasMore(data.next !== null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch notes', err);
        if (!ignore) {
          setError('Failed to load notes. Please try again.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [categoryId, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function loadMore() {
    if (!hasMore) return;
    const nextPage = page + 1;
    try {
      const data = await api.getNotes({
        categoryId: categoryId ?? undefined,
        page: nextPage,
      });
      setNotes((prev) => [...prev, ...data.results]);
      setHasMore(data.next !== null);
      setPage(nextPage);
    } catch (err) {
      console.error('Failed to load more notes', err);
    }
  }

  async function createNote(): Promise<Note> {
    const note = await api.createNote({ title: 'New Note' });
    setNotes((prev) => [note, ...prev]);
    return note;
  }

  async function deleteNote(id: string) {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return {
    notes,
    setNotes,
    isLoading,
    error,
    hasMore,
    createNote,
    deleteNote,
    refresh,
    loadMore,
  };
}
