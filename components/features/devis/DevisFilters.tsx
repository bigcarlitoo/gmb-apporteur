'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// TYPES
// ============================================================================

export type SortOption = 'prix_asc' | 'prix_desc' | 'economie' | 'compagnie' | 'mensuel';

export interface FilterState {
  search: string;
  sort: SortOption;
}

interface DevisFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SORT_OPTIONS: Array<{ value: SortOption; label: string; icon: string }> = [
  { value: 'prix_asc', label: 'Prix croissant', icon: 'ri-sort-asc' },
  { value: 'prix_desc', label: 'Prix décroissant', icon: 'ri-sort-desc' },
  { value: 'economie', label: 'Meilleure économie', icon: 'ri-funds-line' },
  { value: 'mensuel', label: 'Mensualité la plus basse', icon: 'ri-calendar-line' },
  { value: 'compagnie', label: 'Compagnie (A-Z)', icon: 'ri-sort-alphabet-asc' },
];

// ============================================================================
// COMPOSANT
// ============================================================================

export function DevisFilters({ filters, onFiltersChange }: DevisFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleSortChange = (value: SortOption) => {
    onFiltersChange({ ...filters, sort: value });
  };

  const handleClearSearch = () => {
    onFiltersChange({ ...filters, search: '' });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Barre de recherche */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <i className="ri-search-line text-gray-400 dark:text-gray-500"></i>
        </div>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Rechercher par compagnie, produit, code commission..."
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-[#335FAD]/20 focus:border-[#335FAD] transition-colors"
        />
        {filters.search && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <i className="ri-close-circle-line"></i>
          </button>
        )}
      </div>

      {/* Sélecteur de tri */}
      <div className="w-full sm:w-56">
        <Select
          value={filters.sort}
          onValueChange={(value) => handleSortChange(value as SortOption)}
        >
          <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
            <div className="flex items-center gap-2">
              <i className="ri-arrow-up-down-line text-gray-400"></i>
              <SelectValue placeholder="Trier par..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <i className={`${option.icon} text-gray-500`}></i>
                  <span>{option.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default DevisFilters;





