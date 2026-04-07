'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import { Note } from '@/types';

export function useNotes(categoryId?: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setError(null);
    api.getNotes(categoryId)
      .then((data) => {
        if (!ignore) {
          setNotes(data);
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
  }, [categoryId]);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getNotes(categoryId);
      setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes', err);
      setError('Failed to load notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function createNote(): Promise<Note> {
    const note = await api.createNote();
    setNotes((prev) => [note, ...prev]);
    return note;
  }

  async function deleteNote(id: string) {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return { notes, setNotes, isLoading, error, createNote, deleteNote, refresh };
}
