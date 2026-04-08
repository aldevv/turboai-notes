/**
 * Tests for src/components/notes/NoteEditor.tsx
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteEditor } from '@/components/notes/NoteEditor';
import * as api from '@/lib/api';
import { Category, Note } from '@/types';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

jest.mock('@/lib/api', () => ({
  updateNote: jest.fn(),
}));

// useAutoSave uses updateNote internally — we need to control timers
jest.useFakeTimers();

const mockedUpdateNote = api.updateNote as jest.MockedFunction<typeof api.updateNote>;

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Work', color: '#E8B4A8' },
  { id: 'cat-2', name: 'Personal', color: '#F5E6C8' },
];

function makeNote(partial: Partial<Note> = {}): Note {
  return {
    id: 'note-abc',
    title: 'My Note Title',
    content: 'My note content',
    category: null,
    last_edited_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    ...partial,
  };
}

const defaultProps = {
  note: makeNote(),
  categories: mockCategories,
  onClose: jest.fn(),
  onNoteUpdated: jest.fn(),
};

function renderEditor(props: Partial<typeof defaultProps> = {}) {
  return render(<NoteEditor {...defaultProps} {...props} />);
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterEach(() => {
  act(() => {
    jest.runAllTimers();
  });
});

describe('NoteEditor', () => {
  // ----------------------------------------------------------------
  // Rendering
  // ----------------------------------------------------------------

  describe('rendering', () => {
    it('displays the note title in the title textarea', () => {
      renderEditor();
      const titleArea = screen.getByDisplayValue('My Note Title');
      expect(titleArea).toBeInTheDocument();
    });

    it('displays the note content in the content textarea', () => {
      renderEditor();
      expect(screen.getByDisplayValue('My note content')).toBeInTheDocument();
    });

    it('renders a category select with all categories', () => {
      renderEditor();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Personal' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'No category' })).toBeInTheDocument();
    });

    it('selects the current category in the dropdown', () => {
      const note = makeNote({
        category: { id: 'cat-1', name: 'Work', color: '#E8B4A8' },
      });
      renderEditor({ note });
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('cat-1');
    });

    it('shows "No category" selected when note has no category', () => {
      renderEditor();
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('');
    });

    it('renders the close button', () => {
      renderEditor();
      expect(screen.getByRole('button', { name: /close note/i })).toBeInTheDocument();
    });

    it('shows the last edited date', () => {
      renderEditor();
      expect(screen.getByText(/last edited/i)).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------
  // Editing — title
  // ----------------------------------------------------------------

  describe('title editing', () => {
    it('updates the title textarea as the user types', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor();
      const titleArea = screen.getByDisplayValue('My Note Title');

      await user.clear(titleArea);
      await user.type(titleArea, 'New Title');

      expect(screen.getByDisplayValue('New Title')).toBeInTheDocument();
    });

    it('triggers auto-save after the debounce delay', async () => {
      const savedNote = makeNote({ title: 'Updated Title' });
      mockedUpdateNote.mockResolvedValue(savedNote);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor();
      const titleArea = screen.getByDisplayValue('My Note Title');

      await user.clear(titleArea);
      await user.type(titleArea, 'Updated Title');

      // Advance past the 500ms debounce
      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => expect(mockedUpdateNote).toHaveBeenCalledTimes(1));
      expect(mockedUpdateNote).toHaveBeenCalledWith(
        'note-abc',
        expect.objectContaining({ title: 'Updated Title' }),
      );
    });

    it('calls onNoteUpdated after a successful auto-save', async () => {
      const savedNote = makeNote({ title: 'Updated Title' });
      mockedUpdateNote.mockResolvedValue(savedNote);

      const onNoteUpdated = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({ onNoteUpdated });
      const titleArea = screen.getByDisplayValue('My Note Title');

      await user.clear(titleArea);
      await user.type(titleArea, 'Updated Title');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => expect(onNoteUpdated).toHaveBeenCalledWith(savedNote));
    });
  });

  // ----------------------------------------------------------------
  // Editing — content
  // ----------------------------------------------------------------

  describe('content editing', () => {
    it('updates the content textarea as the user types', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor();
      const contentArea = screen.getByDisplayValue('My note content');

      await user.clear(contentArea);
      await user.type(contentArea, 'Brand new content');

      expect(screen.getByDisplayValue('Brand new content')).toBeInTheDocument();
    });

    it('triggers auto-save for content changes', async () => {
      const savedNote = makeNote({ content: 'Brand new content' });
      mockedUpdateNote.mockResolvedValue(savedNote);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor();
      const contentArea = screen.getByDisplayValue('My note content');

      await user.clear(contentArea);
      await user.type(contentArea, 'Brand new content');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => expect(mockedUpdateNote).toHaveBeenCalledTimes(1));
      expect(mockedUpdateNote).toHaveBeenCalledWith(
        'note-abc',
        expect.objectContaining({ content: 'Brand new content' }),
      );
    });
  });

  // ----------------------------------------------------------------
  // Category change
  // ----------------------------------------------------------------

  describe('category change', () => {
    it('calls updateNote with the selected category id', async () => {
      const updatedNote = makeNote({
        category: { id: 'cat-2', name: 'Personal', color: '#F5E6C8' },
      });
      mockedUpdateNote.mockResolvedValue(updatedNote);

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor();
      const select = screen.getByRole('combobox');

      await user.selectOptions(select, 'cat-2');

      await waitFor(() =>
        expect(mockedUpdateNote).toHaveBeenCalledWith('note-abc', {
          category: 'cat-2',
        }),
      );
    });

    it('sends category: null when "No category" is selected', async () => {
      const noteWithCat = makeNote({
        category: { id: 'cat-1', name: 'Work', color: '#E8B4A8' },
      });
      mockedUpdateNote.mockResolvedValue(makeNote());

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({ note: noteWithCat });
      const select = screen.getByRole('combobox');

      await user.selectOptions(select, '');

      await waitFor(() =>
        expect(mockedUpdateNote).toHaveBeenCalledWith('note-abc', {
          category: null,
        }),
      );
    });

    it('calls onNoteUpdated after category update', async () => {
      const updatedNote = makeNote({
        category: { id: 'cat-1', name: 'Work', color: '#E8B4A8' },
      });
      mockedUpdateNote.mockResolvedValue(updatedNote);

      const onNoteUpdated = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({ onNoteUpdated });
      const select = screen.getByRole('combobox');

      await user.selectOptions(select, 'cat-1');

      await waitFor(() => expect(onNoteUpdated).toHaveBeenCalledWith(updatedNote));
    });

    it('shows save error when category update fails', async () => {
      mockedUpdateNote.mockRejectedValue(new Error('fail'));

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor();
      const select = screen.getByRole('combobox');

      await user.selectOptions(select, 'cat-1');

      await waitFor(() =>
        expect(screen.getByText('Failed to update category.')).toBeInTheDocument(),
      );
    });
  });

  // ----------------------------------------------------------------
  // Close behavior
  // ----------------------------------------------------------------

  describe('close behavior', () => {
    it('calls onClose immediately when there are no pending changes', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({ onClose });

      await user.click(screen.getByRole('button', { name: /close note/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('flushes pending changes before closing when user has typed unsaved content', async () => {
      const savedNote = makeNote({ title: 'Unsaved Title' });
      mockedUpdateNote.mockResolvedValue(savedNote);

      const onClose = jest.fn();
      const onNoteUpdated = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({ onClose, onNoteUpdated });
      const titleArea = screen.getByDisplayValue('My Note Title');

      // Type something but don't wait for the debounce
      await user.clear(titleArea);
      await user.type(titleArea, 'Unsaved Title');

      // Click close while auto-save timer is still pending
      await user.click(screen.getByRole('button', { name: /close note/i }));

      await waitFor(() => expect(onNoteUpdated).toHaveBeenCalledWith(savedNote));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('shows save error and Retry/Discard buttons when close-flush fails', async () => {
      mockedUpdateNote.mockRejectedValue(new Error('fail'));

      const onClose = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({ onClose });
      const titleArea = screen.getByDisplayValue('My Note Title');

      await user.clear(titleArea);
      await user.type(titleArea, 'Unsaved Title');

      await user.click(screen.getByRole('button', { name: /close note/i }));

      await waitFor(() => expect(screen.getByText('Retry')).toBeInTheDocument());
      expect(screen.getByText('Discard and close')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('"Discard and close" clears the error and closes the editor', async () => {
      mockedUpdateNote.mockRejectedValue(new Error('fail'));

      const onClose = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor({ onClose });
      const titleArea = screen.getByDisplayValue('My Note Title');

      await user.clear(titleArea);
      await user.type(titleArea, 'Unsaved Title');
      await user.click(screen.getByRole('button', { name: /close note/i }));

      await waitFor(() => expect(screen.getByText('Discard and close')).toBeInTheDocument());

      await user.click(screen.getByText('Discard and close'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  // Save error display
  // ----------------------------------------------------------------

  describe('save error from auto-save', () => {
    it('shows error message when auto-save fails', async () => {
      mockedUpdateNote.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderEditor();
      const contentArea = screen.getByDisplayValue('My note content');

      await user.clear(contentArea);
      await user.type(contentArea, 'New content');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() =>
        expect(
          screen.getByText('Failed to save. Changes may not be persisted.'),
        ).toBeInTheDocument(),
      );
    });
  });
});
