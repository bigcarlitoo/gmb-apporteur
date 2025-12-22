'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

interface WalletData {
  pending_amount: number; // centimes
  available_amount: number; // centimes
}

interface Transaction {
  id: string;
  dossier_id: string;
  dossier_numero: string;
  client_nom: string;
  client_prenom: string;
  amount: number; // centimes
  status: 'pending' | 'available' | 'paid' | 'cancelled';
  created_at: string;
  validated_at: string | null;
  paid_at: string | null;
}

interface WalletSectionProps {
  apporteurId: string;
}

export default function WalletSection({ apporteurId }: WalletSectionProps) {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'available' | 'paid'>('all');

  // Charger les données du wallet
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!apporteurId) return;

      setLoading(true);
      setError(null);

      try {
        // 1. Récupérer le solde du wallet via la vue
        const { data: walletData, error: walletError } = await supabase
          .from('apporteur_wallet_summary')
          .select('*')
          .eq('apporteur_id', apporteurId)
          .single();

        if (walletError && walletError.code !== 'PGRST116') {
          throw walletError;
        }

        if (walletData) {
          setWallet({
            pending_amount: walletData.pending_amount || 0,
            available_amount: walletData.available_amount || 0
          });
        } else {
          setWallet({ pending_amount: 0, available_amount: 0 });
        }

        // 2. Récupérer les transactions récentes
        const { data: transData, error: transError } = await supabase
          .from('dossiers')
          .select(`
            id,
            numero_dossier,
            client_infos (client_nom, client_prenom),
            apporteur_amount,
            commission_status,
            created_at,
            date_validation,
            date_paiement_apporteur
          `)
          .eq('apporteur_id', apporteurId)
          .not('apporteur_amount', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        if (transError) {
          console.error('Erreur transactions:', transError);
        } else if (transData) {
          const mappedTransactions: Transaction[] = transData.map((d: any) => ({
            id: d.id,
            dossier_id: d.id,
            dossier_numero: d.numero_dossier || 'N/A',
            client_nom: d.client_infos?.[0]?.client_nom || 'N/A',
            client_prenom: d.client_infos?.[0]?.client_prenom || 'N/A',
            amount: d.apporteur_amount || 0,
            status: d.commission_status || 'pending',
            created_at: d.created_at,
            validated_at: d.date_validation,
            paid_at: d.date_paiement_apporteur
          }));
          setTransactions(mappedTransactions);
        }
      } catch (err: any) {
        console.error('Erreur chargement wallet:', err);
        setError(err.message || 'Erreur lors du chargement du wallet');
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [apporteurId]);

  // Filtrer les transactions
  const filteredTransactions = transactions.filter(t => {
    if (activeFilter === 'all') return true;
    return t.status === activeFilter;
  });

  // Stats rapides
  const totalPending = wallet?.pending_amount || 0;
  const totalAvailable = wallet?.available_amount || 0;
  const totalPaid = transactions
    .filter(t => t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <i className="ri-time-line mr-1"></i>
            En attente
          </span>
        );
      case 'available':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <i className="ri-check-line mr-1"></i>
            Disponible
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <i className="ri-bank-line mr-1"></i>
            Versé
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <i className="ri-close-line mr-1"></i>
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Mon Wallet
        </h2>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        Mon Wallet
      </h2>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-400">
            <i className="ri-error-warning-line mr-2"></i>
            {error}
          </p>
        </div>
      )}

      {/* Cartes de solde */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Solde disponible */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100 text-sm font-medium">Disponible</span>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <i className="ri-wallet-3-line text-xl"></i>
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalAvailable / 100)}</p>
          <p className="text-green-100 text-xs mt-2">
            <i className="ri-information-line mr-1"></i>
            Peut être retiré
          </p>
        </div>

        {/* Solde en attente */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-100 text-sm font-medium">En attente</span>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <i className="ri-time-line text-xl"></i>
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalPending / 100)}</p>
          <p className="text-orange-100 text-xs mt-2">
            <i className="ri-information-line mr-1"></i>
            En attente de validation
          </p>
        </div>

        {/* Total versé */}
        <div className="bg-gradient-to-br from-[#335FAD] to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-medium">Total versé</span>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <i className="ri-bank-line text-xl"></i>
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalPaid / 100)}</p>
          <p className="text-blue-100 text-xs mt-2">
            <i className="ri-information-line mr-1"></i>
            Depuis le début
          </p>
        </div>
      </div>

      {/* Bouton retrait (désactivé pour l'instant) */}
      {totalAvailable > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Vous avez {formatCurrency(totalAvailable / 100)} disponible
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Les demandes de retrait seront bientôt disponibles
              </p>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
            >
              <i className="ri-bank-card-line mr-2"></i>
              Demander un retrait
            </button>
          </div>
        </div>
      )}

      {/* Historique des transactions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Historique des commissions
          </h3>
          
          {/* Filtres */}
          <div className="flex gap-2">
            {(['all', 'pending', 'available', 'paid'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeFilter === filter
                    ? 'bg-[#335FAD] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {filter === 'all' ? 'Tout' : 
                 filter === 'pending' ? 'En attente' : 
                 filter === 'available' ? 'Disponible' : 'Versé'}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-wallet-line text-gray-400 dark:text-gray-500 text-2xl"></i>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {activeFilter === 'all' 
                ? 'Aucune commission pour le moment'
                : `Aucune commission ${activeFilter === 'pending' ? 'en attente' : activeFilter === 'available' ? 'disponible' : 'versée'}`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#335FAD] font-medium text-sm">
                      {transaction.client_prenom.charAt(0)}{transaction.client_nom.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {transaction.client_prenom} {transaction.client_nom}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Dossier {transaction.dossier_numero} • {formatDate(transaction.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(transaction.status)}
                  <span className={`font-semibold ${
                    transaction.status === 'cancelled' 
                      ? 'text-gray-400 line-through' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {formatCurrency(transaction.amount / 100)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <i className="ri-question-line text-blue-600 dark:text-blue-400 text-xl mt-0.5"></i>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              Comment fonctionne le wallet ?
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• <strong>En attente</strong> : Le dossier est finalisé mais pas encore validé par le courtier</li>
              <li>• <strong>Disponible</strong> : Le courtier a validé, vous pouvez demander un retrait</li>
              <li>• <strong>Versé</strong> : Le montant a été viré sur votre compte bancaire</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}








