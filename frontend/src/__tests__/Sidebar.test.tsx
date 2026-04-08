/**
 * Tests for src/components/notes/Sidebar.tsx
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '@/components/notes/Sidebar';
import { Category } from '@/types';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

// AuthContext — Sidebar calls useAuth() for the logout function
const mockLogout = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout, user: null, isLoading: false }),
}));

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Work', color: '#E8B4A8', note_count: 5 },
  { id: 'cat-2', name: 'Personal', color: '#F5E6C8', note_count: 2 },
  { id: 'cat-3', name: 'Ideas', color: '#B8D9D1' },
];

const defaultProps = {
  categories: mockCategories,
  activeCategoryId: null as string | null,
  onSelectCategory: jest.fn(),
};

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(<Sidebar {...defaultProps} {...props} />);
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Sidebar', () => {
  // ----------------------------------------------------------------
  // Category list rendering
  // ----------------------------------------------------------------

  describe('category list', () => {
    it('renders an "All Categories" button', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /all categories/i })).toBeInTheDocument();
    });

    it('renders a button for each category', () => {
      renderSidebar();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Ideas')).toBeInTheDocument();
    });

    it('displays note_count badge when defined', () => {
      renderSidebar();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not display a count badge when note_count is undefined', () => {
      renderSidebar();
      // "Ideas" has no note_count — its button should only contain the name
      const ideasButton = screen.getByText('Ideas').closest('button');
      expect(ideasButton).not.toHaveTextContent(/\d/);
    });

    it('renders an empty category list without errors', () => {
      renderSidebar({ categories: [] });
      expect(screen.getByRole('button', { name: /all categories/i })).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------
  // Category selection
  // ----------------------------------------------------------------

  describe('category selection', () => {
    it('calls onSelectCategory(null) when "All Categories" is clicked', async () => {
      const onSelectCategory = jest.fn();
      const user = userEvent.setup();
      renderSidebar({ onSelectCategory });

      await user.click(screen.getByRole('button', { name: /all categories/i }));

      expect(onSelectCategory).toHaveBeenCalledWith(null);
    });

    it('calls onSelectCategory with the category id when a category is clicked', async () => {
      const onSelectCategory = jest.fn();
      const user = userEvent.setup();
      renderSidebar({ onSelectCategory });

      await user.click(screen.getByText('Work'));

      expect(onSelectCategory).toHaveBeenCalledWith('cat-1');
    });

    it('calls onSelectCategory with the correct id for each category', async () => {
      const onSelectCategory = jest.fn();
      const user = userEvent.setup();
      renderSidebar({ onSelectCategory });

      await user.click(screen.getByText('Personal'));
      expect(onSelectCategory).toHaveBeenCalledWith('cat-2');

      await user.click(screen.getByText('Ideas'));
      expect(onSelectCategory).toHaveBeenCalledWith('cat-3');
    });
  });

  // ----------------------------------------------------------------
  // Active state
  // ----------------------------------------------------------------

  describe('active category styling', () => {
    it('applies active style to "All Categories" when activeCategoryId is null', () => {
      renderSidebar({ activeCategoryId: null });
      const allCatButton = screen.getByRole('button', {
        name: /all categories/i,
      });
      // Active color is #000000 (full opacity), inactive is rgba(0,0,0,0.5)
      expect(allCatButton).toHaveStyle({ color: 'rgb(0, 0, 0)' });
    });

    it('applies inactive style to "All Categories" when a category is selected', () => {
      renderSidebar({ activeCategoryId: 'cat-1' });
      const allCatButton = screen.getByRole('button', {
        name: /all categories/i,
      });
      expect(allCatButton).toHaveStyle({ color: 'rgba(0,0,0,0.5)' });
    });
  });

  // ----------------------------------------------------------------
  // Error state
  // ----------------------------------------------------------------

  describe('category error', () => {
    it('shows the error message when categoryError is provided', () => {
      renderSidebar({ categoryError: 'Failed to load categories.' });
      expect(screen.getByText('Failed to load categories.')).toBeInTheDocument();
    });

    it('does not show an error element when categoryError is null', () => {
      renderSidebar({ categoryError: null });
      expect(screen.queryByText('Failed to load categories.')).not.toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------------
  // Sign out
  // ----------------------------------------------------------------

  describe('sign out', () => {
    it('renders a "Sign out" button', () => {
      renderSidebar();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('calls logout when the Sign out button is clicked', async () => {
      const user = userEvent.setup();
      renderSidebar();

      await user.click(screen.getByRole('button', { name: /sign out/i }));

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
