'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import { DevisCard } from './DevisCard';
import { DevisFilters, type SortOption, type FilterState } from './DevisFilters';
import { EXADE_COMMISSION_CODES, ExadeCommissionCode } from '@/lib/constants/exade';

// ============================================================================
// TYPES
// ============================================================================

interface DevisData {
  id: string;
  numero_devis?: string;
  statut?: string | null;
  selected?: boolean;
  refused?: boolean;
  motif_refus?: string;
  commentaire_refus?: string;
  date_generation?: string | null;
  compagnie: string;
  produit: string;
  cout_mensuel: number;
  cout_total: number;
  economie_estimee?: number;
  formalites_medicales: string[];
  couverture: string[];
  exclusions: string[];
  avantages: string[];
  id_simulation: string;
  id_tarif: string;
  cout_total_tarif: number;
  frais_adhesion: number;
  frais_adhesion_apporteur?: number;
  frais_frac: number;
  frais_courtier?: number;
  commission_exade_code?: string;
  detail_pret: {
    capital: number;
    duree: number;
    taux_assurance: number;
  };
  formalites_detaillees: string[];
  erreurs: string[];
  compatible_lemoine?: boolean;
  type_tarif?: string;
  taux_capital_assure?: number;
}

interface DevisListViewProps {
  devis: DevisData[];
  coutAssuranceBanque?: number;
  onDevisClick: (devis: DevisData) => void;
  onRefreshDevis: () => void;
  isRefreshing?: boolean;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function DevisListView({
  devis,
  coutAssuranceBanque,
  onDevisClick,
  onRefreshDevis,
  isRefreshing = false
}: DevisListViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sort: 'prix_asc'
  });

  // Calculer l'économie pour un devis
  const calculateEconomie = (devisItem: DevisData) => {
    if (!coutAssuranceBanque) return null;
    const economie = coutAssuranceBanque - devisItem.cout_total;
    const pourcentage = coutAssuranceBanque > 0 ? (economie / coutAssuranceBanque) * 100 : 0;
    return { economie, pourcentage };
  };

  // Filtrer et trier les devis
  const filteredAndSortedDevis = useMemo(() => {
    let result = [...devis];

    // Filtrer par recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(d =>
        d.compagnie.toLowerCase().includes(searchLower) ||
        d.produit.toLowerCase().includes(searchLower) ||
        (d.commission_exade_code?.toLowerCase().includes(searchLower))
      );
    }

    // Trier
    switch (filters.sort) {
      case 'prix_asc':
        result.sort((a, b) => a.cout_total - b.cout_total);
        break;
      case 'prix_desc':
        result.sort((a, b) => b.cout_total - a.cout_total);
        break;
      case 'economie':
        result.sort((a, b) => {
          const ecoA = calculateEconomie(a)?.economie || 0;
          const ecoB = calculateEconomie(b)?.economie || 0;
          return ecoB - ecoA;
        });
        break;
      case 'compagnie':
        result.sort((a, b) => a.compagnie.localeCompare(b.compagnie));
        break;
      case 'mensuel':
        result.sort((a, b) => a.cout_mensuel - b.cout_mensuel);
        break;
    }

    return result;
  }, [devis, filters, coutAssuranceBanque]);

  // Obtenir le label du code commission
  const getCommissionLabel = (code: string | undefined) => {
    if (!code) return 'Défaut';
    const codeInfo = EXADE_COMMISSION_CODES[code as ExadeCommissionCode];
    return codeInfo ? code : code;
  };

  // Obtenir le taux du code commission
  const getCommissionTaux = (code: string | undefined) => {
    if (!code) return null;
    const codeInfo = EXADE_COMMISSION_CODES[code as ExadeCommissionCode];
    return codeInfo?.taux || null;
  };

  // Badge de statut
  const renderStatusBadge = (devisItem: DevisData) => {
    if (devisItem.statut === 'accepte') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <i className="ri-check-double-line mr-1"></i>
          Accepté
        </span>
      );
    }
    if (devisItem.statut === 'envoye') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
          <i className="ri-send-plane-line mr-1"></i>
          Envoyé
        </span>
      );
    }
    if (devisItem.selected && !devisItem.refused) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <i className="ri-check-line mr-1"></i>
          Sélectionné
        </span>
      );
    }
    if (devisItem.refused) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <i className="ri-close-line mr-1"></i>
          Refusé
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Devis comparatif
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {filteredAndSortedDevis.length} offre{filteredAndSortedDevis.length > 1 ? 's' : ''} d'assurance emprunteur
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Vue */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-600 text-[#335FAD] shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Vue tableau"
              >
                <i className="ri-table-line text-lg"></i>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 text-[#335FAD] shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Vue grille"
              >
                <i className="ri-layout-grid-line text-lg"></i>
              </button>
            </div>

            {/* Bouton actualiser */}
            <button
              onClick={onRefreshDevis}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#335FAD] hover:bg-[#2a4d8f] disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              <i className={`ri-refresh-line ${isRefreshing ? 'animate-spin' : ''}`}></i>
              <span className="hidden sm:inline">{isRefreshing ? 'Actualisation...' : 'Actualiser'}</span>
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="mt-4">
          <DevisFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 sm:p-6">
        {filteredAndSortedDevis.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <i className="ri-file-search-line text-gray-400 text-2xl"></i>
            </div>
            <h4 className="text-gray-900 dark:text-white font-medium mb-2">
              Aucun devis trouvé
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {filters.search 
                ? 'Aucun résultat ne correspond à votre recherche.'
                : 'Actualisez les devis pour obtenir les tarifs.'
              }
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Vue Tableau - Responsive */
          <div className="overflow-hidden">
            {/* Version desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Compagnie
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Mensuel
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Économie
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Commission
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedDevis.map((devisItem) => {
                    const economie = calculateEconomie(devisItem);
                    return (
                      <tr
                        key={devisItem.id}
                        onClick={() => onDevisClick(devisItem)}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                          devisItem.selected 
                            ? 'bg-[#335FAD]/5 dark:bg-[#335FAD]/10 ring-1 ring-inset ring-[#335FAD]/20' 
                            : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#335FAD] to-[#2a4d8f] rounded-lg flex items-center justify-center">
                              <i className="ri-shield-check-fill text-white"></i>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {devisItem.compagnie}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                                {devisItem.produit}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(devisItem.cout_mensuel)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">/mois</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(devisItem.cout_total)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {economie ? (
                            <div className={economie.economie > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                              <p className="text-sm font-semibold">
                                {economie.economie > 0 ? '-' : '+'}{formatCurrency(Math.abs(economie.economie))}
                              </p>
                              <p className="text-xs">
                                ({Math.abs(economie.pourcentage).toFixed(1)}%)
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono rounded">
                              {getCommissionLabel(devisItem.commission_exade_code)}
                            </span>
                            {getCommissionTaux(devisItem.commission_exade_code) && (
                              <span className="text-xs text-gray-500 dark:text-gray-400" title={getCommissionTaux(devisItem.commission_exade_code) || ''}>
                                <i className="ri-information-line"></i>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {renderStatusBadge(devisItem)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDevisClick(devisItem);
                            }}
                            className="p-2 text-gray-400 hover:text-[#335FAD] dark:hover:text-[#335FAD] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Voir les détails"
                          >
                            <i className="ri-eye-line text-lg"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Version mobile/tablette - Cards compactes */}
            <div className="lg:hidden space-y-3">
              {filteredAndSortedDevis.map((devisItem) => {
                const economie = calculateEconomie(devisItem);
                return (
                  <div
                    key={devisItem.id}
                    onClick={() => onDevisClick(devisItem)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      devisItem.selected
                        ? 'border-[#335FAD] bg-[#335FAD]/5 dark:bg-[#335FAD]/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#335FAD] to-[#2a4d8f] rounded-lg flex items-center justify-center">
                          <i className="ri-shield-check-fill text-white text-sm"></i>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {devisItem.compagnie}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {devisItem.produit}
                          </p>
                        </div>
                      </div>
                      {renderStatusBadge(devisItem)}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Mensuel</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(devisItem.cout_mensuel)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(devisItem.cout_total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Économie</p>
                        {economie ? (
                          <p className={`text-sm font-semibold ${economie.economie > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {economie.economie > 0 ? '-' : '+'}{formatCurrency(Math.abs(economie.economie))}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">—</p>
                        )}
                      </div>
                    </div>

                    {devisItem.commission_exade_code && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Commission: <span className="font-mono">{devisItem.commission_exade_code}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Vue Grille */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAndSortedDevis.map((devisItem) => (
              <DevisCard
                key={devisItem.id}
                devis={devisItem}
                coutAssuranceBanque={coutAssuranceBanque}
                onClick={() => onDevisClick(devisItem)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DevisListView;




