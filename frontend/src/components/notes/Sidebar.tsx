'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Category } from '@/types';
import { SidebarCategoryItem } from './SidebarCategoryItem';

interface Props {
  categories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export function Sidebar({ categories, activeCategoryId, onSelectCategory }: Props) {
  const { logout } = useAuth();

  return (
    <aside
      className="w-64 h-screen flex flex-col pt-8 px-5"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {/* All Categories row */}
        <button
          onClick={() => onSelectCategory(null)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors"
          style={{ color: activeCategoryId === null ? '#000000' : 'rgba(0,0,0,0.5)' }}
        >
          <span className="text-sm font-semibold">All Categories</span>
        </button>

        <div className="mt-1 space-y-0.5">
          {categories.map((cat) => (
            <SidebarCategoryItem
              key={cat.id}
              category={cat}
              isActive={activeCategoryId === cat.id}
              onClick={() => onSelectCategory(cat.id)}
            />
          ))}
        </div>
      </nav>

      <div className="pb-16">
        <button
          onClick={logout}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: '#B8997A' }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
