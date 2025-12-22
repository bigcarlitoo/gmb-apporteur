'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXADE_COMPAGNIES,
  EXADE_COMMISSION_CODES,
  ExadeCommissionCode,
  getCommissionCodesForCompagnie,
} from '@/lib/constants/exade';

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
  // Données brutes Exade (dans donnees_devis)
  donnees_devis?: any;
  // Champs pour le workflow push Exade
  exade_simulation_id?: string | null;
  exade_pushed_at?: string | null;
  exade_locked?: boolean;
}

interface DevisDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  devis: DevisData | null;
  coutAssuranceBanque?: number;
  onRecalculateDevis: (devisId: string, idTarif: string, commissionCode: string, fraisCourtier: number) => Promise<void>;
  onSelectDevis: (devisId: string) => void;
  onRejectDevis?: (devisId: string) => void;
  onResendDevis?: (devisId: string) => void;
  onPushToExade?: (devisId: string) => Promise<void>;
  dossierStatut?: string; // statut_canon du dossier
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function DevisDetailModal({
  isOpen,
  onClose,
  devis,
  coutAssuranceBanque,
  onRecalculateDevis,
  onSelectDevis,
  onRejectDevis,
  onResendDevis,
  onPushToExade,
  dossierStatut
}: DevisDetailModalProps) {
  // États pour la configuration de commission
  const [selectedCompagnie, setSelectedCompagnie] = useState<string>('');
  const [selectedCommissionCode, setSelectedCommissionCode] = useState<string>('');
  const [fraisCourtier, setFraisCourtier] = useState<number>(150);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isPushingToExade, setIsPushingToExade] = useState(false);
  const [showPushConfirmModal, setShowPushConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'garanties' | 'formalites' | 'frais'>('details');

  // Vérifier si le devis peut être pushé vers Exade
  const canPushToExade = devis && 
    dossierStatut === 'devis_accepte' && 
    !devis.exade_locked && 
    onPushToExade;

  // Handler pour pusher vers Exade avec confirmation
  const handlePushToExade = async () => {
    if (!devis || !onPushToExade) return;
    
    setIsPushingToExade(true);
    try {
      await onPushToExade(devis.id);
      setShowPushConfirmModal(false);
    } catch (error) {
      console.error('Erreur push Exade:', error);
    } finally {
      setIsPushingToExade(false);
    }
  };

  // Initialiser les valeurs depuis le devis sélectionné
  useEffect(() => {
    if (devis) {
      // Extraire l'ID tarif pour initialiser la compagnie
      setSelectedCompagnie(devis.id_tarif || '');
      setSelectedCommissionCode(devis.commission_exade_code || '');
      setFraisCourtier(devis.frais_courtier ? devis.frais_courtier / 100 : devis.frais_adhesion_apporteur || 150);
    }
  }, [devis]);

  // Récupérer les codes de commission disponibles pour ce tarif
  const availableCommissionCodes = useMemo(() => {
    if (!selectedCompagnie) return [];
    return getCommissionCodesForCompagnie(selectedCompagnie, false);
  }, [selectedCompagnie]);

  // Calcul de l'économie
  const calculateEconomie = useMemo(() => {
    if (!devis || !coutAssuranceBanque) return null;
    const economie = coutAssuranceBanque - devis.cout_total;
    const pourcentage = coutAssuranceBanque > 0 ? (economie / coutAssuranceBanque) * 100 : 0;
    return { economie, pourcentage };
  }, [devis, coutAssuranceBanque]);

  // Estimation commission courtier (approximation basée sur le code)
  const estimatedCommission = useMemo(() => {
    if (!selectedCommissionCode || !devis) return null;
    const codeInfo = EXADE_COMMISSION_CODES[selectedCommissionCode as ExadeCommissionCode];
    if (!codeInfo) return null;

    // Approximation simple basée sur le taux affiché
    const tauxStr = codeInfo.taux;
    let estimatedPct = 10; // défaut

    if (tauxStr.includes('40%')) estimatedPct = 40;
    else if (tauxStr.includes('35%')) estimatedPct = 35;
    else if (tauxStr.includes('30%')) estimatedPct = 30;
    else if (tauxStr.includes('25%')) estimatedPct = 25;
    else if (tauxStr.includes('20%')) estimatedPct = 20;
    else if (tauxStr.includes('15%')) estimatedPct = 15;
    else if (tauxStr.includes('10%')) estimatedPct = 10;
    else if (tauxStr.includes('5%')) estimatedPct = 5;
    else if (tauxStr.includes('0%')) estimatedPct = 0;

    // Estimation basée sur la première année
    const coutAnnee1 = devis.cout_total / (devis.detail_pret?.duree || 240) * 12;
    return (coutAnnee1 * estimatedPct) / 100;
  }, [selectedCommissionCode, devis]);

  // Comparaison avant/après
  const comparison = useMemo(() => {
    if (!devis || !selectedCommissionCode) return null;

    const originalCode = devis.commission_exade_code;
    const originalFrais = devis.frais_courtier ? devis.frais_courtier / 100 : devis.frais_adhesion_apporteur || 0;

    const hasChanges = originalCode !== selectedCommissionCode || Math.abs(originalFrais - fraisCourtier) > 0.01;

    return {
      hasChanges,
      original: {
        code: originalCode || 'Défaut Exade',
        frais: originalFrais,
      },
      new: {
        code: selectedCommissionCode,
        frais: fraisCourtier,
      }
    };
  }, [devis, selectedCommissionCode, fraisCourtier]);

  // Handler pour recalculer ce devis
  const handleRecalculate = async () => {
    if (!devis || !selectedCompagnie) return;

    setIsRecalculating(true);
    try {
      await onRecalculateDevis(
        devis.id,
        selectedCompagnie,
        selectedCommissionCode,
        Math.round(fraisCourtier * 100) // En centimes
      );
    } catch (error) {
      console.error('Erreur lors du recalcul:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

  if (!isOpen || !devis) return null;

  // Déterminer le logo/couleur de la compagnie
  const getCompagnieColor = (compagnie: string): string => {
    const colors: Record<string, string> = {
      'GENERALI': 'from-red-500 to-red-600',
      'SWISSLIFE': 'from-blue-600 to-blue-700',
      'MNCAP': 'from-green-600 to-green-700',
      'CNP': 'from-purple-600 to-purple-700',
      'MAIF': 'from-emerald-600 to-emerald-700',
      'MALAKOFF': 'from-orange-500 to-orange-600',
      'HUMANIS': 'from-orange-500 to-orange-600',
    };
    const key = Object.keys(colors).find(k => compagnie.toUpperCase().includes(k));
    return key ? colors[key] : 'from-[#335FAD] to-[#2a4d8f]';
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header avec gradient compagnie */}
          <div className={`bg-gradient-to-r ${getCompagnieColor(devis.compagnie)} px-6 py-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <i className="ri-shield-check-fill text-white text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {devis.compagnie}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {devis.produit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Badge type tarif */}
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                  {devis.type_tarif || 'NON RÉVISABLE'}
                </span>
                {/* Badge Lemoine */}
                {devis.compatible_lemoine && (
                  <span className="px-3 py-1 bg-green-500/80 text-white text-xs font-medium rounded-full">
                    <i className="ri-check-line mr-1"></i>Lemoine
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <i className="ri-close-line text-white text-xl"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Corps de la modale avec scroll */}
          <div className="max-h-[calc(85vh-200px)] overflow-y-auto">
            {/* Section Tarification principale */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Coût mensuel */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    Coût mensuel
                  </span>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(devis.cout_mensuel)}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    /mois
                  </span>
                </div>

                {/* Coût total */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Coût total
                  </span>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(devis.cout_total)}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    sur {devis.detail_pret?.duree || 240} mois
                  </span>
                </div>

                {/* Économie */}
                <div className={`rounded-xl p-4 border ${
                  calculateEconomie && calculateEconomie.economie > 0
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <span className={`text-xs font-medium uppercase tracking-wide ${
                    calculateEconomie && calculateEconomie.economie > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    Économie estimée
                  </span>
                  <p className={`text-2xl font-bold mt-1 ${
                    calculateEconomie && calculateEconomie.economie > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {calculateEconomie 
                      ? `${calculateEconomie.economie > 0 ? '-' : '+'}${formatCurrency(Math.abs(calculateEconomie.economie))}`
                      : formatCurrency(devis.economie_estimee || 0)
                    }
                  </p>
                  {calculateEconomie && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({Math.abs(calculateEconomie.pourcentage).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section Configuration Commission */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <i className="ri-settings-4-line text-[#335FAD] text-lg"></i>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Configuration commission
                </h3>
                {/* Badge verrouillé */}
                {devis.exade_locked && (
                  <span className="ml-auto inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    <i className="ri-lock-line mr-1"></i>
                    Verrouillé
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne gauche: Sélecteurs */}
                <div className="space-y-4">
                  {/* Sélection du code commission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Palier de commission ({EXADE_COMPAGNIES[selectedCompagnie as keyof typeof EXADE_COMPAGNIES]?.name || devis.compagnie})
                    </label>
                    <Select
                      value={selectedCommissionCode || "__default__"}
                      onValueChange={(v) => setSelectedCommissionCode(v === "__default__" ? "" : v)}
                      disabled={devis.exade_locked}
                    >
                      <SelectTrigger className={`w-full bg-white dark:bg-gray-800 ${devis.exade_locked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <SelectValue placeholder="Par défaut Exade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Par défaut Exade</SelectItem>
                        {availableCommissionCodes.map((code) => (
                          <SelectItem key={code.value} value={code.value}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                {code.value}
                              </span>
                              {code.label}
                              {code.isDefault && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                  défaut
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Frais de courtage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Frais de courtage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={fraisCourtier}
                        onChange={(e) => setFraisCourtier(Number(e.target.value))}
                        disabled={devis.exade_locked}
                        className={`w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white pr-10 ${devis.exade_locked ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''}`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                        €
                      </span>
                    </div>
                  </div>

                  {/* Code commission actuel */}
                  {selectedCommissionCode && EXADE_COMMISSION_CODES[selectedCommissionCode as ExadeCommissionCode] && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        <i className="ri-information-line mr-1"></i>
                        <strong>Code sélectionné :</strong> {selectedCommissionCode}
                        <span className="ml-2">
                          — {EXADE_COMMISSION_CODES[selectedCommissionCode as ExadeCommissionCode].taux}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Colonne droite: Comparaison */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <i className="ri-scales-3-line"></i>
                    Comparaison avant/après
                  </h4>

                  {comparison?.hasChanges ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Avant</span>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {comparison.original.code}
                          </p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(comparison.original.frais)}
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
                          <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">Après</span>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {comparison.new.code || 'Défaut'}
                          </p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(comparison.new.frais)}
                          </p>
                        </div>
                      </div>

                      {estimatedCommission !== null && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-xs text-green-700 dark:text-green-400">
                            <i className="ri-money-euro-circle-line mr-1"></i>
                            Commission Exade estimée (1ère année): <strong>~{formatCurrency(estimatedCommission)}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="ri-checkbox-circle-line text-green-500 text-2xl"></i>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Aucune modification
                      </p>
                    </div>
                  )}

                  {/* Bouton recalculer - désactivé si verrouillé */}
                  <button
                    onClick={handleRecalculate}
                    disabled={isRecalculating || !comparison?.hasChanges || devis.exade_locked}
                    className="w-full mt-4 py-2.5 px-4 bg-[#335FAD] hover:bg-[#2a4d8f] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {devis.exade_locked ? (
                      <>
                        <i className="ri-lock-line"></i>
                        Devis verrouillé
                      </>
                    ) : isRecalculating ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        Recalcul en cours...
                      </>
                    ) : (
                      <>
                        <i className="ri-refresh-line"></i>
                        Recalculer ce devis
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs pour les détails */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex space-x-1 px-6 pt-4">
                {[
                  { id: 'details', label: 'Détails du prêt', icon: 'ri-file-text-line' },
                  { id: 'garanties', label: 'Garanties', icon: 'ri-shield-check-line' },
                  { id: 'formalites', label: 'Formalités', icon: 'ri-heart-pulse-line' },
                  { id: 'frais', label: 'Frais', icon: 'ri-money-euro-circle-line' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-800 text-[#335FAD] border-t border-l border-r border-gray-200 dark:border-gray-700 -mb-px'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <i className={tab.icon}></i>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contenu des tabs */}
            <div className="p-6">
              {/* Tab Détails du prêt */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Capital</span>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(devis.detail_pret?.capital || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Durée</span>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {devis.detail_pret?.duree || 0} mois
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Taux d'assurance</span>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {devis.detail_pret?.taux_assurance || devis.taux_capital_assure?.toFixed(4) || '—'}%
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">ID Simulation</span>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {devis.id_simulation || '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab Garanties */}
              {activeTab === 'garanties' && (
                <div className="space-y-4">
                  {/* Couvertures */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <i className="ri-check-double-line text-green-500"></i>
                      Garanties incluses
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(devis.couverture?.length > 0 ? devis.couverture : ['DC', 'PTIA', 'ITT', 'IPT']).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <i className="ri-check-line text-green-600 dark:text-green-400"></i>
                          <span className="text-sm text-green-800 dark:text-green-300">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exclusions */}
                  {devis.exclusions && devis.exclusions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <i className="ri-error-warning-line text-amber-500"></i>
                        Exclusions
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {devis.exclusions.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <i className="ri-close-line text-amber-600 dark:text-amber-400"></i>
                            <span className="text-sm text-amber-800 dark:text-amber-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Avantages */}
                  {devis.avantages && devis.avantages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <i className="ri-star-line text-[#335FAD]"></i>
                        Avantages spécifiques
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {devis.avantages.map((item, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <i className="ri-star-fill text-[#335FAD]"></i>
                            <span className="text-sm text-blue-800 dark:text-blue-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Formalités */}
              {activeTab === 'formalites' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Formalités médicales requises pour ce tarif :
                  </p>
                  {(devis.formalites_detaillees?.length > 0 ? devis.formalites_detaillees : devis.formalites_medicales || ['Questionnaire de santé simplifié']).map((formalite, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <i className="ri-checkbox-circle-line text-orange-600 dark:text-orange-400 mt-0.5"></i>
                      <span className="text-sm text-orange-800 dark:text-orange-300">{formalite}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab Frais */}
              {activeTab === 'frais' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Frais d'adhésion</span>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(devis.frais_adhesion || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Frais de fractionnement</span>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(devis.frais_frac || 0)}
                    </p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">Frais courtier actuels</span>
                    <p className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                      {formatCurrency(devis.frais_adhesion_apporteur || 0)}
                    </p>
                  </div>
                  <div className="bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-lg p-4 border border-[#335FAD]/30">
                    <span className="text-xs text-[#335FAD] block mb-1">Coût total tarif</span>
                    <p className="text-xl font-semibold text-[#335FAD]">
                      {formatCurrency(devis.cout_total_tarif || devis.cout_total || 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Erreurs éventuelles */}
              {devis.erreurs && devis.erreurs.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                    <i className="ri-error-warning-line"></i>
                    Erreurs de tarification
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                    {devis.erreurs.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Footer avec actions */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Statut actuel */}
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                {devis.statut === 'accepte' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <i className="ri-check-double-line mr-1.5"></i>
                    Devis accepté
                  </span>
                )}
                {devis.statut === 'envoye' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    <i className="ri-send-plane-line mr-1.5"></i>
                    Devis envoyé
                  </span>
                )}
                {devis.selected && !devis.refused && devis.statut !== 'envoye' && devis.statut !== 'accepte' && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <i className="ri-check-line mr-1.5"></i>
                    Sélectionné
                  </span>
                )}
                {devis.refused && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <i className="ri-close-line mr-1.5"></i>
                    Refusé {devis.motif_refus && `— ${devis.motif_refus}`}
                  </span>
                )}
                {/* Badge Exade verrouillé */}
                {devis.exade_locked && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                    <i className="ri-lock-line mr-1.5"></i>
                    Envoyé sur Exade
                    {devis.exade_simulation_id && (
                      <span className="ml-1 font-mono text-xs">(ID: {devis.exade_simulation_id})</span>
                    )}
                  </span>
                )}
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Fermer
                </button>

                {devis.refused && onResendDevis && (
                  <button
                    onClick={() => onResendDevis(devis.id)}
                    className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <i className="ri-send-plane-line"></i>
                    Renvoyer
                  </button>
                )}

                {/* Bouton Choisir ce devis - masqué si verrouillé ou déjà sélectionné/refusé */}
                {!devis.selected && !devis.refused && !devis.exade_locked && devis.statut !== 'envoye' && devis.statut !== 'accepte' && (
                  <button
                    onClick={() => onSelectDevis(devis.id)}
                    className="px-6 py-2.5 bg-[#335FAD] hover:bg-[#2a4d8f] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <i className="ri-check-line"></i>
                    Choisir ce devis
                  </button>
                )}

                {/* Bouton Confirmer la création sur Exade */}
                {canPushToExade && (
                  <button
                    onClick={() => setShowPushConfirmModal(true)}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <i className="ri-upload-cloud-line"></i>
                    Confirmer sur Exade
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation push Exade */}
      {showPushConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPushConfirmModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <i className="ri-alert-line text-amber-600 dark:text-amber-400 text-2xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirmer l'envoi vers Exade
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cette action est définitive
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Attention :</strong> Une fois envoyé sur Exade, ce devis sera verrouillé et ne pourra plus être modifié. La simulation sera créée sur votre compte Exade.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <i className="ri-information-line mr-1"></i>
                Après confirmation, rendez-vous sur <strong>www.exade.fr</strong> pour retrouver la simulation et finaliser le contrat avec le client.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPushConfirmModal(false)}
                disabled={isPushingToExade}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handlePushToExade}
                disabled={isPushingToExade}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPushingToExade ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DevisDetailModal;



