'use client';

import { useEffect, useState } from 'react';
import { getCategories } from '@/lib/api';
import { Category } from '@/types';

const CATEGORY_ORDER = ['Random Thoughts', 'School', 'Personal'];

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    getCategories()
      .then((cats) => {
        if (!ignore) {
          const sorted = [...cats].sort(
            (a, b) => CATEGORY_ORDER.indexOf(a.name) - CATEGORY_ORDER.indexOf(b.name)
          );
          setCategories(sorted);
        }
      })
      .catch((err) => console.error('Failed to fetch categories', err))
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  return { categories, isLoading };
}
