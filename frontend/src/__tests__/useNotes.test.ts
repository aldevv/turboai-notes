/**
 * Tests for src/hooks/useNotes.ts
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotes } from '@/hooks/useNotes';
import * as api from '@/lib/api';
import { Note, PaginatedResponse } from '@/types';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

jest.mock('@/lib/api', () => ({
  getNotes: jest.fn(),
  createNote: jest.fn(),
  deleteNote: jest.fn(),
}));

const mockedGetNotes = api.getNotes as jest.MockedFunction<typeof api.getNotes>;
const mockedCreateNote = api.createNote as jest.MockedFunction<typeof api.createNote>;
const mockedDeleteNote = api.deleteNote as jest.MockedFunction<typeof api.deleteNote>;

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeNote(partial: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Test Note',
    content: 'Some content',
    category: null,
    last_edited_at: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    ...partial,
  };
}

function makePage(notes: Note[], next: string | null = null): PaginatedResponse<Note> {
  return { count: notes.length, next, previous: null, results: notes };
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useNotes', () => {
  // ----------------------------------------------------------------
  // Initial fetch
  // ----------------------------------------------------------------

  it('starts in loading state', () => {
    mockedGetNotes.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useNotes());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.notes).toEqual([]);
  });

  it('populates notes and sets isLoading=false on success', async () => {
    const notes = [makeNote({ id: 'n1' }), makeNote({ id: 'n2' })];
    mockedGetNotes.mockResolvedValue(makePage(notes));

    const { result } = renderHook(() => useNotes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notes).toEqual(notes);
    expect(result.current.error).toBeNull();
  });

  it('sets error message and stops loading when fetch fails', async () => {
    mockedGetNotes.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to load notes. Please try again.');
    expect(result.current.notes).toEqual([]);
  });

  it('sets hasMore=true when next page exists', async () => {
    mockedGetNotes.mockResolvedValue(makePage([makeNote()], 'http://api/notes/?page=2'));

    const { result } = renderHook(() => useNotes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);
  });

  it('sets hasMore=false when next is null', async () => {
    mockedGetNotes.mockResolvedValue(makePage([makeNote()]));

    const { result } = renderHook(() => useNotes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });

  it('passes categoryId to getNotes', async () => {
    mockedGetNotes.mockResolvedValue(makePage([]));

    renderHook(() => useNotes('cat-123'));

    await waitFor(() => expect(mockedGetNotes).toHaveBeenCalled());
    expect(mockedGetNotes).toHaveBeenCalledWith({ categoryId: 'cat-123' });
  });

  it('re-fetches when categoryId changes', async () => {
    mockedGetNotes.mockResolvedValue(makePage([]));

    const { rerender } = renderHook(({ catId }) => useNotes(catId), {
      initialProps: { catId: 'cat-1' },
    });

    await waitFor(() => expect(mockedGetNotes).toHaveBeenCalledTimes(1));

    rerender({ catId: 'cat-2' });

    await waitFor(() => expect(mockedGetNotes).toHaveBeenCalledTimes(2));
    expect(mockedGetNotes).toHaveBeenLastCalledWith({ categoryId: 'cat-2' });
  });

  // ----------------------------------------------------------------
  // refresh()
  // ----------------------------------------------------------------

  describe('refresh()', () => {
    it('re-fetches notes and replaces the current list', async () => {
      const initial = [makeNote({ id: 'n1' })];
      const refreshed = [makeNote({ id: 'n2' }), makeNote({ id: 'n3' })];

      mockedGetNotes
        .mockResolvedValueOnce(makePage(initial))
        .mockResolvedValueOnce(makePage(refreshed));

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.notes).toHaveLength(1));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.notes).toEqual(refreshed);
    });

    it('sets error when refresh fails', async () => {
      mockedGetNotes
        .mockResolvedValueOnce(makePage([makeNote()]))
        .mockRejectedValueOnce(new Error('oops'));

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Failed to load notes. Please try again.');
    });
  });

  // ----------------------------------------------------------------
  // loadMore()
  // ----------------------------------------------------------------

  describe('loadMore()', () => {
    it('appends notes from the next page', async () => {
      const page1 = [makeNote({ id: 'n1' })];
      const page2 = [makeNote({ id: 'n2' })];

      mockedGetNotes
        .mockResolvedValueOnce(makePage(page1, 'http://api/notes/?page=2'))
        .mockResolvedValueOnce(makePage(page2));

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.notes).toHaveLength(1));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.notes).toEqual([...page1, ...page2]);
    });

    it('is a no-op when hasMore is false', async () => {
      mockedGetNotes.mockResolvedValue(makePage([makeNote()])); // no next → hasMore=false

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.hasMore).toBe(false);

      await act(async () => {
        await result.current.loadMore();
      });

      // Only the initial fetch should have been called
      expect(mockedGetNotes).toHaveBeenCalledTimes(1);
    });

    it('fetches with page=2 on first loadMore call', async () => {
      mockedGetNotes
        .mockResolvedValueOnce(makePage([makeNote()], 'next'))
        .mockResolvedValueOnce(makePage([]));

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockedGetNotes).toHaveBeenLastCalledWith({
        categoryId: undefined,
        page: 2,
      });
    });
  });

  // ----------------------------------------------------------------
  // createNote()
  // ----------------------------------------------------------------

  describe('createNote()', () => {
    it('prepends the new note to the notes list', async () => {
      const existing = makeNote({ id: 'existing' });
      const created = makeNote({ id: 'created', title: 'New Note' });

      mockedGetNotes.mockResolvedValue(makePage([existing]));
      mockedCreateNote.mockResolvedValue(created);

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.notes).toHaveLength(1));

      let returned: Note | undefined;
      await act(async () => {
        returned = await result.current.createNote();
      });

      expect(result.current.notes[0]).toEqual(created);
      expect(returned).toEqual(created);
    });

    it('calls createNote API with title "New Note"', async () => {
      mockedGetNotes.mockResolvedValue(makePage([]));
      mockedCreateNote.mockResolvedValue(makeNote());

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.createNote();
      });

      expect(mockedCreateNote).toHaveBeenCalledWith({ title: 'New Note' });
    });
  });

  // ----------------------------------------------------------------
  // deleteNote()
  // ----------------------------------------------------------------

  describe('deleteNote()', () => {
    it('removes the deleted note from the list', async () => {
      const notes = [makeNote({ id: 'n1' }), makeNote({ id: 'n2' })];
      mockedGetNotes.mockResolvedValue(makePage(notes));
      mockedDeleteNote.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.notes).toHaveLength(2));

      await act(async () => {
        await result.current.deleteNote('n1');
      });

      expect(result.current.notes).toHaveLength(1);
      expect(result.current.notes[0].id).toBe('n2');
    });

    it('calls deleteNote API with the correct id', async () => {
      mockedGetNotes.mockResolvedValue(makePage([makeNote({ id: 'n1' })]));
      mockedDeleteNote.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotes());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteNote('n1');
      });

      expect(mockedDeleteNote).toHaveBeenCalledWith('n1');
    });
  });
});
