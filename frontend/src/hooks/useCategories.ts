'use client';

import { useEffect, useState } from 'react';
import { getCategories } from '@/lib/api';
import { Category } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getCategories()
      .then((cats) => {
        if (!ignore) {
          setCategories(cats);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch categories', err);
        if (!ignore) {
          setError('Failed to load categories.');
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
  }, []);

  return { categories, isLoading, error };
}
