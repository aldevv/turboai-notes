'use client';

import { Category } from '@/types';

interface Props {
  category: Category;
  isActive: boolean;
  onClick: () => void;
}

export function SidebarCategoryItem({ category, isActive, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors"
      style={{ color: '#000000' }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color }}
      />
      <span className="flex-1 text-sm truncate">{category.name}</span>
      {category.note_count !== undefined && (
        <span className="text-xs">{category.note_count}</span>
      )}
    </button>
  );
}
