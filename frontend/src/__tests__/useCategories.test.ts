/**
 * Tests for src/hooks/useCategories.ts
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useCategories } from '@/hooks/useCategories';
import { getCategories } from '@/lib/api';
import { Category } from '@/types';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

jest.mock('@/lib/api', () => ({
  getCategories: jest.fn(),
}));

const mockedGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const mockCategories: Category[] = [
  { id: '1', name: 'Work', color: '#E8B4A8', note_count: 3 },
  { id: '2', name: 'Personal', color: '#F5E6C8', note_count: 1 },
];

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCategories', () => {
  it('starts in loading state with empty categories', () => {
    mockedGetCategories.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useCategories());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('populates categories and stops loading on success', async () => {
    mockedGetCategories.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBeNull();
  });

  it('sets error message and stops loading on failure', async () => {
    mockedGetCategories.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Failed to load categories.');
    expect(result.current.categories).toEqual([]);
  });

  it('handles an empty categories array', async () => {
    mockedGetCategories.mockResolvedValue([]);

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('calls getCategories exactly once on mount', async () => {
    mockedGetCategories.mockResolvedValue([]);

    renderHook(() => useCategories());

    await waitFor(() => expect(mockedGetCategories).toHaveBeenCalledTimes(1));
  });

  it('does not re-fetch when the component re-renders without prop changes', async () => {
    mockedGetCategories.mockResolvedValue(mockCategories);

    const { rerender, result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender();
    rerender();

    // Still only called once from the initial mount
    expect(mockedGetCategories).toHaveBeenCalledTimes(1);
  });
});
