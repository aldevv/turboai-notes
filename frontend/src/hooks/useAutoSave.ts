'use client';

import { useCallback, useEffect, useRef } from 'react';
import { updateNote } from '@/lib/api';
import { Note, NoteUpdatePayload } from '@/types';

export function useAutoSave(
  noteId: string,
  onSaved?: (note: Note) => void,
  onError?: (err: unknown) => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavedRef = useRef(onSaved);
  // eslint-disable-next-line react-hooks/refs -- intentional event-handler ref pattern: ref is only read inside setTimeout, never during render
  onSavedRef.current = onSaved;
  const onErrorRef = useRef(onError);
  // eslint-disable-next-line react-hooks/refs -- intentional event-handler ref pattern: ref is only read inside setTimeout, never during render
  onErrorRef.current = onError;

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const save = useCallback(
    (payload: NoteUpdatePayload) => {
      cancel();
      timerRef.current = setTimeout(() => {
        updateNote(noteId, payload)
          .then((note) => onSavedRef.current?.(note))
          .catch((err) => {
            console.error(err);
            onErrorRef.current?.(err);
          });
      }, 500);
    },
    [noteId, cancel],
  );

  useEffect(
    () => () => {
      cancel();
    },
    [cancel],
  );

  return { save, cancel };
}
