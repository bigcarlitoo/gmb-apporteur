'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAuth } from '@/components/AuthProvider';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { EmptyState } from '@/components/ui/empty-state';

// Interface pour les données admin
interface AdminData {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  role: string;
}

// Interface pour une commission en attente de validation
interface PendingCommission {
  id: string;
  dossier_id: string;
  numero_dossier: string;
  client_nom: string;
  client_prenom: string;
  apporteur_id: string;
  apporteur_nom: string;
  apporteur_prenom: string;
  apporteur_amount: number; // en centimes
  broker_amount: number; // en centimes
  platform_fee: number; // en centimes
  frais_courtage: number; // en centimes
  commission_status: 'pending' | 'validated' | 'paid';
  date_finalisation: string;
  date_validation?: string;
}

// Interface pour le résumé financier
interface FinancialSummary {
  total_pending: number;
  total_validated: number;
  total_paid: number;
  count_pending: number;
  count_validated: number;
  count_paid: number;
}

type FilterStatus = 'all' | 'pending' | 'validated' | 'paid';

export default function AdminBillingPage() {
  const { darkMode, isInitialized, toggleDarkMode } = useTheme();
  const { user } = useAuth();
  const { currentBrokerId } = useBrokerContext();

  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<PendingCommission[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données admin depuis l'utilisateur connecté
  const adminData = useMemo<AdminData>(() => {
    const firstName = user?.user_metadata?.prenom || 'Admin';
    const lastName = user?.user_metadata?.nom || '';
    return {
      id: user?.id || '',
      firstName,
      lastName,
      initials: `${firstName.charAt(0)}${lastName.charAt(0) || ''}`.toUpperCase(),
      role: 'Administrateur'
    };
  }, [user]);

  // Charger les commissions
  useEffect(() => {
    const fetchCommissions = async () => {
      if (!currentBrokerId) return;
      
      setLoading(true);
      setError(null);

      try {
        // Récupérer les dossiers finalisés avec leurs montants
        const { data, error: fetchError } = await supabase
          .from('dossiers')
          .select(`
            id,
            numero_dossier,
            apporteur_id,
            apporteur_amount,
            broker_amount,
            platform_fee,
            frais_courtage,
            commission_status,
            date_finalisation,
            date_validation,
            client_infos (client_nom, client_prenom),
            apporteur_profiles!dossiers_apporteur_id_fkey (nom, prenom)
          `)
          .eq('broker_id', currentBrokerId)
          .not('date_finalisation', 'is', null)
          .order('date_finalisation', { ascending: false });

        if (fetchError) throw fetchError;

        const mapped: PendingCommission[] = (data || []).map((d: any) => ({
          id: d.id,
          dossier_id: d.id,
          numero_dossier: d.numero_dossier,
          client_nom: d.client_infos?.[0]?.client_nom || 'N/A',
          client_prenom: d.client_infos?.[0]?.client_prenom || '',
          apporteur_id: d.apporteur_id,
          apporteur_nom: d.apporteur_profiles?.nom || 'N/A',
          apporteur_prenom: d.apporteur_profiles?.prenom || '',
          apporteur_amount: d.apporteur_amount || 0,
          broker_amount: d.broker_amount || 0,
          platform_fee: d.platform_fee || 0,
          frais_courtage: d.frais_courtage || 0,
          commission_status: d.commission_status || 'pending',
          date_finalisation: d.date_finalisation,
          date_validation: d.date_validation
        }));

        setCommissions(mapped);

        // Calculer le résumé
        const summaryData: FinancialSummary = {
          total_pending: mapped.filter(c => c.commission_status === 'pending').reduce((sum, c) => sum + c.apporteur_amount, 0),
          total_validated: mapped.filter(c => c.commission_status === 'validated').reduce((sum, c) => sum + c.apporteur_amount, 0),
          total_paid: mapped.filter(c => c.commission_status === 'paid').reduce((sum, c) => sum + c.apporteur_amount, 0),
          count_pending: mapped.filter(c => c.commission_status === 'pending').length,
          count_validated: mapped.filter(c => c.commission_status === 'validated').length,
          count_paid: mapped.filter(c => c.commission_status === 'paid').length
        };
        setSummary(summaryData);

      } catch (err: any) {
        console.error('Erreur chargement commissions:', err);
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchCommissions();
  }, [currentBrokerId]);

  // Filtrer les commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      // Filtre par statut
      if (filterStatus !== 'all' && c.commission_status !== filterStatus) return false;
      
      // Filtre par recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchClient = `${c.client_prenom} ${c.client_nom}`.toLowerCase().includes(query);
        const matchApporteur = `${c.apporteur_prenom} ${c.apporteur_nom}`.toLowerCase().includes(query);
        const matchDossier = c.numero_dossier.toLowerCase().includes(query);
        if (!matchClient && !matchApporteur && !matchDossier) return false;
      }
      
      return true;
    });
  }, [commissions, filterStatus, searchQuery]);

  // Valider les commissions sélectionnées
  const handleValidateSelected = async () => {
    if (selectedIds.length === 0) return;
    
    setIsValidating(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('dossiers')
        .update({
          commission_status: 'validated',
          date_validation: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (updateError) throw updateError;

      // Mettre à jour localement
      setCommissions(prev => prev.map(c => 
        selectedIds.includes(c.id) 
          ? { ...c, commission_status: 'validated' as const, date_validation: new Date().toISOString() }
          : c
      ));
      setSelectedIds([]);

      // Recalculer le résumé
      setSummary(prev => {
        if (!prev) return prev;
        const validatedAmount = selectedIds.reduce((sum, id) => {
          const commission = commissions.find(c => c.id === id);
          return sum + (commission?.apporteur_amount || 0);
        }, 0);
        return {
          ...prev,
          total_pending: prev.total_pending - validatedAmount,
          total_validated: prev.total_validated + validatedAmount,
          count_pending: prev.count_pending - selectedIds.length,
          count_validated: prev.count_validated + selectedIds.length
        };
      });

    } catch (err: any) {
      console.error('Erreur validation:', err);
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  // Toggle sélection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Sélectionner tout (pending seulement)
  const toggleSelectAll = () => {
    const pendingIds = filteredCommissions
      .filter(c => c.commission_status === 'pending')
      .map(c => c.id);
    
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <i className="ri-time-line mr-1"></i>
            En attente
          </span>
        );
      case 'validated':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <i className="ri-check-line mr-1"></i>
            Validé
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <i className="ri-check-double-line mr-1"></i>
            Payé
          </span>
        );
      default:
        return null;
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-pulse p-8">Chargement...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 transition-colors duration-300 ${darkMode ? 'dark bg-gradient-to-br dark:from-gray-900 dark:to-gray-800' : ''}`}>
      <AdminHeader
        darkMode={darkMode}
        setDarkMode={toggleDarkMode}
        adminData={adminData}
      />

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white">
                Gestion des paiements
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Validez les commissions des apporteurs
              </p>
            </div>
            
            {/* Actions rapides */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleValidateSelected}
                disabled={isValidating}
                className="px-6 py-3 bg-[#335FAD] hover:bg-[#2a4d8f] text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isValidating ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Validation...
                  </>
                ) : (
                  <>
                    <i className="ri-check-double-line"></i>
                    Valider {selectedIds.length} commission{selectedIds.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* En attente */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <i className="ri-time-line text-amber-600 dark:text-amber-400 text-xl"></i>
              </div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                {summary?.count_pending || 0} dossier{(summary?.count_pending || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">En attente de validation</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {formatCurrency((summary?.total_pending || 0) / 100)}
            </p>
          </div>

          {/* Validé */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <i className="ri-check-line text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                {summary?.count_validated || 0} dossier{(summary?.count_validated || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">Validé (à payer)</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {formatCurrency((summary?.total_validated || 0) / 100)}
            </p>
          </div>

          {/* Payé */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <i className="ri-check-double-line text-green-600 dark:text-green-400 text-xl"></i>
              </div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                {summary?.count_paid || 0} dossier{(summary?.count_paid || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">Déjà versé</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {formatCurrency((summary?.total_paid || 0) / 100)}
            </p>
          </div>
        </div>

        {/* Info Stripe */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <i className="ri-information-line text-blue-600 dark:text-blue-400 text-xl mt-0.5"></i>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Intégration Stripe bientôt disponible
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Une fois connecté, les paiements seront automatisés. Pour l'instant, validez manuellement les commissions.
              </p>
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filtres par statut */}
            <div className="flex gap-2">
              {(['all', 'pending', 'validated', 'paid'] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-[#335FAD] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status === 'all' && 'Tous'}
                  {status === 'pending' && 'En attente'}
                  {status === 'validated' && 'Validés'}
                  {status === 'paid' && 'Payés'}
                </button>
              ))}
            </div>

            {/* Recherche */}
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-8">
            <p className="text-sm text-red-700 dark:text-red-400">
              <i className="ri-error-warning-line mr-2"></i>
              {error}
            </p>
          </div>
        )}

        {/* Liste des commissions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
            </div>
          ) : filteredCommissions.length === 0 ? (
            <EmptyState
              icon="ri-wallet-line"
              title="Aucune commission"
              description={
                filterStatus === 'pending'
                  ? "Aucune commission en attente de validation"
                  : filterStatus === 'validated'
                  ? "Aucune commission validée en attente de paiement"
                  : filterStatus === 'paid'
                  ? "Aucune commission déjà versée"
                  : "Aucune commission trouvée"
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      {filterStatus === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredCommissions.filter(c => c.commission_status === 'pending').length && selectedIds.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-[#335FAD] focus:ring-[#335FAD]"
                        />
                      )}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Dossier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Apporteur
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        {commission.commission_status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(commission.id)}
                            onChange={() => toggleSelection(commission.id)}
                            className="rounded border-gray-300 text-[#335FAD] focus:ring-[#335FAD]"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/dossiers/${commission.dossier_id}`}
                          className="text-sm font-medium text-[#335FAD] hover:underline"
                        >
                          {commission.numero_dossier}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/apporteurs/${commission.apporteur_id}`}
                          className="text-sm text-gray-900 dark:text-white hover:text-[#335FAD]"
                        >
                          {commission.apporteur_prenom} {commission.apporteur_nom}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {commission.client_prenom} {commission.client_nom}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(commission.apporteur_amount / 100)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(commission.commission_status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(commission.date_validation || commission.date_finalisation)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


