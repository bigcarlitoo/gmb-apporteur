'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import { DevisService } from '@/lib/services/devis';
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

interface DevisData {
  id: string;
  compagnie: string;
  produit?: string;
  id_tarif: string;
  cout_total: number; // Coût total actuel (avec commission par défaut)
  cout_mensuel: number;
  frais_courtier?: number; // en centimes
  frais_adhesion?: number;
  commission_exade_code?: string;
}

interface SmartCommissionOptimizerProps {
  devisList: DevisData[];
  coutAssuranceBanque?: number; // Coût TOTAL de l'assurance banque en euros
  dureeMois?: number;
  brokerId?: string; // Requis pour le recalcul via API Exade
  onApplyOptimization?: (devisId: string, commissionCode: string, fraisCourtier: number, newCoutTotal?: number, newCoutMensuel?: number) => void;
  onRecalculComplete?: () => void; // Callback pour rafraîchir les données après recalcul
}

// Paliers de commission par tarif avec les taux réels
// Format: { code, label, taux1ere, tauxSuivantes } (en %)
const COMMISSION_TIERS: Record<string, Array<{
  code: string;
  label: string;
  taux1ere: number; // % première année
  tauxSuivant: number; // % années suivantes (ou linéaire)
  isLinear: boolean;
}>> = {
  // MAIF VIE (id_tarif 10 ou 17)
  '10': [
    { code: '10T1', label: 'Palier 1 (0%)', taux1ere: 0, tauxSuivant: 0, isLinear: true },
    { code: '10T2', label: 'Palier 2 (5%)', taux1ere: 5, tauxSuivant: 5, isLinear: true },
    { code: '10T3', label: 'Palier 3 (10%)', taux1ere: 10, tauxSuivant: 10, isLinear: true },
    { code: '10T4', label: 'Palier 4 (30%/10%)', taux1ere: 30, tauxSuivant: 10, isLinear: false },
    { code: '10T5', label: 'Palier 5 (15%)', taux1ere: 15, tauxSuivant: 15, isLinear: true },
    { code: '10T6', label: 'Palier 6 (20%)', taux1ere: 20, tauxSuivant: 20, isLinear: true },
    { code: '10T7', label: 'Palier 7 (25%)', taux1ere: 25, tauxSuivant: 25, isLinear: true },
    { code: '10T8', label: 'Palier 8 (30%)', taux1ere: 30, tauxSuivant: 30, isLinear: true },
    { code: '10T9', label: 'Palier 9 (35%)', taux1ere: 35, tauxSuivant: 35, isLinear: true },
    { code: '10T10', label: 'Palier 10 (40%)', taux1ere: 40, tauxSuivant: 40, isLinear: true },
  ],
  '17': [
    { code: '10T1', label: 'Palier 1 (0%)', taux1ere: 0, tauxSuivant: 0, isLinear: true },
    { code: '10T2', label: 'Palier 2 (5%)', taux1ere: 5, tauxSuivant: 5, isLinear: true },
    { code: '10T3', label: 'Palier 3 (10%)', taux1ere: 10, tauxSuivant: 10, isLinear: true },
    { code: '10T4', label: 'Palier 4 (30%/10%)', taux1ere: 30, tauxSuivant: 10, isLinear: false },
    { code: '10T5', label: 'Palier 5 (15%)', taux1ere: 15, tauxSuivant: 15, isLinear: true },
    { code: '10T6', label: 'Palier 6 (20%)', taux1ere: 20, tauxSuivant: 20, isLinear: true },
    { code: '10T7', label: 'Palier 7 (25%)', taux1ere: 25, tauxSuivant: 25, isLinear: true },
    { code: '10T8', label: 'Palier 8 (30%)', taux1ere: 30, tauxSuivant: 30, isLinear: true },
    { code: '10T9', label: 'Palier 9 (35%)', taux1ere: 35, tauxSuivant: 35, isLinear: true },
    { code: '10T10', label: 'Palier 10 (40%)', taux1ere: 40, tauxSuivant: 40, isLinear: true },
  ],
  // SURAVENIR (id_tarif 18)
  '18': [
    { code: '18T1', label: 'Palier 1 (0%)', taux1ere: 0, tauxSuivant: 0, isLinear: true },
    { code: '18T2', label: 'Palier 2 (5%)', taux1ere: 5, tauxSuivant: 5, isLinear: true },
    { code: '18T3', label: 'Palier 3 (10%)', taux1ere: 10, tauxSuivant: 10, isLinear: true },
    { code: '18T4', label: 'Palier 4 (30%/10%)', taux1ere: 30, tauxSuivant: 10, isLinear: false },
    { code: '18T5', label: 'Palier 5 (15%)', taux1ere: 15, tauxSuivant: 15, isLinear: true },
    { code: '18T6', label: 'Palier 6 (20%)', taux1ere: 20, tauxSuivant: 20, isLinear: true },
    { code: '18T7', label: 'Palier 7 (25%)', taux1ere: 25, tauxSuivant: 25, isLinear: true },
    { code: '18T8', label: 'Palier 8 (30%)', taux1ere: 30, tauxSuivant: 30, isLinear: true },
  ],
  // AXA (id_tarif 6)
  '6': [
    { code: '6T1', label: 'Palier 1 (0%)', taux1ere: 0, tauxSuivant: 0, isLinear: true },
    { code: '6T2', label: 'Palier 2 (5%)', taux1ere: 5, tauxSuivant: 5, isLinear: true },
    { code: '6T3', label: 'Palier 3 (10%)', taux1ere: 10, tauxSuivant: 10, isLinear: true },
    { code: '6T4', label: 'Palier 4 (40%/10%)', taux1ere: 40, tauxSuivant: 10, isLinear: false },
    { code: '6T5', label: 'Palier 5 (15%)', taux1ere: 15, tauxSuivant: 15, isLinear: true },
    { code: '6T6', label: 'Palier 6 (20%)', taux1ere: 20, tauxSuivant: 20, isLinear: true },
    { code: '6T7', label: 'Palier 7 (25%)', taux1ere: 25, tauxSuivant: 25, isLinear: true },
    { code: '6T8', label: 'Palier 8 (30%)', taux1ere: 30, tauxSuivant: 30, isLinear: true },
    { code: '6T9', label: 'Palier 9 (35%)', taux1ere: 35, tauxSuivant: 35, isLinear: true },
    { code: '6T10', label: 'Palier 10 (40%)', taux1ere: 40, tauxSuivant: 40, isLinear: true },
  ],
  // MALAKOFF HUMANIS (id_tarif 11)
  '11': [
    { code: '11T1', label: 'Palier 1 (0%)', taux1ere: 0, tauxSuivant: 0, isLinear: true },
    { code: '11T2', label: 'Palier 2 (5%)', taux1ere: 5, tauxSuivant: 5, isLinear: true },
    { code: '11T3', label: 'Palier 3 (10%)', taux1ere: 10, tauxSuivant: 10, isLinear: true },
    { code: '11T4', label: 'Palier 4 (40%/10%)', taux1ere: 40, tauxSuivant: 10, isLinear: false },
    { code: '11T5', label: 'Palier 5 (15%)', taux1ere: 15, tauxSuivant: 15, isLinear: true },
    { code: '11T6', label: 'Palier 6 (20%)', taux1ere: 20, tauxSuivant: 20, isLinear: true },
    { code: '11T7', label: 'Palier 7 (25%)', taux1ere: 25, tauxSuivant: 25, isLinear: true },
    { code: '11T8', label: 'Palier 8 (30%)', taux1ere: 30, tauxSuivant: 30, isLinear: true },
    { code: '11T9', label: 'Palier 9 (35%)', taux1ere: 35, tauxSuivant: 35, isLinear: true },
    { code: '11T10', label: 'Palier 10 (40%)', taux1ere: 40, tauxSuivant: 40, isLinear: true },
  ],
};

// Fallback générique pour les tarifs non listés
const GENERIC_TIERS = [
  { code: 'T1', label: 'Palier 1 (0%)', taux1ere: 0, tauxSuivant: 0, isLinear: true },
  { code: 'T2', label: 'Palier 2 (5%)', taux1ere: 5, tauxSuivant: 5, isLinear: true },
  { code: 'T3', label: 'Palier 3 (10%)', taux1ere: 10, tauxSuivant: 10, isLinear: true },
  { code: 'T4', label: 'Palier 4 (30%/10%)', taux1ere: 30, tauxSuivant: 10, isLinear: false },
  { code: 'T5', label: 'Palier 5 (15%)', taux1ere: 15, tauxSuivant: 15, isLinear: true },
  { code: 'T6', label: 'Palier 6 (20%)', taux1ere: 20, tauxSuivant: 20, isLinear: true },
  { code: 'T7', label: 'Palier 7 (25%)', taux1ere: 25, tauxSuivant: 25, isLinear: true },
  { code: 'T8', label: 'Palier 8 (30%)', taux1ere: 30, tauxSuivant: 30, isLinear: true },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcule la commission courtier estimée basée sur le taux et le coût de l'assurance
 */
function calculateCommission(
  coutTotal: number,
  dureeMois: number,
  taux1ere: number,
  tauxSuivant: number,
  isLinear: boolean
): number {
  const coutAnnuel = (coutTotal / dureeMois) * 12;
  
  if (isLinear) {
    // Commission linéaire : même % sur toute la durée
    return coutTotal * (taux1ere / 100);
  } else {
    // Commission dégressive : X% 1ère année, Y% années suivantes
    const annees = Math.ceil(dureeMois / 12);
    const commission1ere = coutAnnuel * (taux1ere / 100);
    const commissionSuivantes = coutAnnuel * (annees - 1) * (tauxSuivant / 100);
    return commission1ere + commissionSuivantes;
  }
}

/**
 * Estime le coût du devis avec un palier de commission différent
 * Plus la commission est élevée, plus le tarif est cher (environ +10% du coût par +10% de commission)
 */
function estimateCostWithTier(
  coutBase: number,
  tauxBase: number, // Taux de commission par défaut (généralement 10-15%)
  nouveauTaux: number,
  isLinear: boolean
): number {
  // Estimation : chaque % de commission ajoute environ 0.5-1% au coût
  // C'est une approximation - le vrai coût nécessite un appel API
  const facteurImpact = 0.005; // 0.5% du coût par % de commission
  const deltaTaux = nouveauTaux - tauxBase;
  return coutBase * (1 + deltaTaux * facteurImpact);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SmartCommissionOptimizer({
  devisList,
  coutAssuranceBanque,
  dureeMois = 240,
  brokerId,
  onApplyOptimization,
  onRecalculComplete
}: SmartCommissionOptimizerProps) {
  const [selectedDevisId, setSelectedDevisId] = useState<string>('');
  const [fraisCourtierEuros, setFraisCourtierEuros] = useState(150); // Frais courtier suggérés
  const [expanded, setExpanded] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculError, setRecalculError] = useState<string | null>(null);

  // Sélectionner le premier devis par défaut
  useEffect(() => {
    if (devisList.length > 0 && !selectedDevisId) {
      setSelectedDevisId(devisList[0].id);
    }
  }, [devisList, selectedDevisId]);

  // Devis sélectionné
  const selectedDevis = useMemo(() => {
    return devisList.find(d => d.id === selectedDevisId);
  }, [devisList, selectedDevisId]);

  // Paliers disponibles pour le tarif sélectionné
  const availableTiers = useMemo(() => {
    if (!selectedDevis) return GENERIC_TIERS;
    const idTarif = selectedDevis.id_tarif;
    return COMMISSION_TIERS[idTarif] || GENERIC_TIERS.map(t => ({
      ...t,
      code: `${idTarif}${t.code}`
    }));
  }, [selectedDevis]);

  // Analyse de chaque palier
  const tierAnalysis = useMemo(() => {
    if (!selectedDevis || !coutAssuranceBanque) return [];

    const coutBase = selectedDevis.cout_total;
    const tauxBase = 10; // Commission par défaut estimée à 10%

    return availableTiers.map(tier => {
      // Estimer le coût avec ce palier
      const coutEstime = estimateCostWithTier(coutBase, tauxBase, tier.taux1ere, tier.isLinear);
      
      // Calculer la commission courtier
      const commissionExade = calculateCommission(
        coutEstime,
        dureeMois,
        tier.taux1ere,
        tier.tauxSuivant,
        tier.isLinear
      );
      
      // Coût total pour le client (devis + frais courtier)
      const coutClientTotal = coutEstime + fraisCourtierEuros;
      
      // Économie client vs assurance banque
      const economieClient = coutAssuranceBanque - coutClientTotal;
      const economiePct = (economieClient / coutAssuranceBanque) * 100;
      
      // Gains totaux courtier = frais courtier + commission Exade
      const gainsTotauxCourtier = fraisCourtierEuros + commissionExade;
      
      // Score d'attractivité (économie client + gains courtier pondérés)
      const score = economieClient > 0 
        ? (economiePct * 0.4) + (gainsTotauxCourtier / 100)
        : -1000;

      return {
        tier,
        coutDevisEstime: coutEstime,
        coutClientTotal,
        economieClient,
        economiePct,
        commissionExade,
        gainsTotauxCourtier,
        score,
        isViable: economieClient > 0
      };
    }).sort((a, b) => b.score - a.score);
  }, [selectedDevis, availableTiers, coutAssuranceBanque, dureeMois, fraisCourtierEuros]);

  // Meilleure recommandation
  const bestRecommendation = tierAnalysis.find(t => t.isViable && t.economiePct >= 10);

  // Fonction pour appliquer l'optimisation avec recalcul API
  const handleApplyOptimization = async (tierCode: string) => {
    if (!selectedDevis || !brokerId) {
      console.warn('[SmartCommissionOptimizer] Impossible de recalculer: devis ou brokerId manquant');
      if (onApplyOptimization) {
        onApplyOptimization(selectedDevis?.id || '', tierCode, fraisCourtierEuros * 100);
      }
      return;
    }

    setIsRecalculating(true);
    setRecalculError(null);

    try {
      console.log('[SmartCommissionOptimizer] Recalcul via API Exade:', {
        devisId: selectedDevis.id,
        commissionCode: tierCode,
        fraisCourtier: fraisCourtierEuros * 100
      });

      const result = await DevisService.recalculateTarifWithCommission(
        selectedDevis.id,
        tierCode,
        fraisCourtierEuros * 100,
        brokerId
      );

      if (result.success) {
        console.log('[SmartCommissionOptimizer] ✅ Recalcul réussi:', {
          newCoutTotal: result.newCoutTotal,
          newCoutMensuel: result.newCoutMensuel
        });

        // Appeler le callback avec les nouveaux tarifs
        if (onApplyOptimization) {
          onApplyOptimization(
            selectedDevis.id,
            tierCode,
            fraisCourtierEuros * 100,
            result.newCoutTotal,
            result.newCoutMensuel
          );
        }

        // Appeler le callback de refresh si fourni
        if (onRecalculComplete) {
          onRecalculComplete();
        }
      } else {
        console.error('[SmartCommissionOptimizer] ❌ Erreur recalcul:', result.error);
        setRecalculError(result.error || 'Erreur lors du recalcul');
        
        // Fallback: appliquer quand même sans le nouveau tarif
        if (onApplyOptimization) {
          onApplyOptimization(selectedDevis.id, tierCode, fraisCourtierEuros * 100);
        }
      }
    } catch (error) {
      console.error('[SmartCommissionOptimizer] Exception:', error);
      setRecalculError((error as Error).message);
      
      // Fallback
      if (onApplyOptimization) {
        onApplyOptimization(selectedDevis.id, tierCode, fraisCourtierEuros * 100);
      }
    } finally {
      setIsRecalculating(false);
    }
  };

  if (!coutAssuranceBanque || coutAssuranceBanque <= 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center gap-3">
          <i className="ri-information-line text-2xl text-amber-600 dark:text-amber-400"></i>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Coût assurance banque requis
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Renseignez le coût de l'assurance banque pour optimiser les commissions
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (devisList.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
      {/* En-tête */}
      <div className="p-4 border-b border-violet-200 dark:border-violet-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
              <i className="ri-magic-line text-violet-600 dark:text-violet-400 text-xl"></i>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                🎯 Optimiseur intelligent de commissions
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maximisez vos gains tout en offrant des économies au client
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            <i className={`ri-arrow-${expanded ? 'up' : 'down'}-s-line text-xl`}></i>
          </button>
        </div>

        {/* Recommandation principale */}
        {bestRecommendation && (
          <div className="mt-4 p-4 bg-white/70 dark:bg-gray-800/50 rounded-lg border border-violet-100 dark:border-violet-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                ✨ Recommandation optimale
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-gray-500">Palier commission</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {bestRecommendation.tier.label}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Économie client</span>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(bestRecommendation.economieClient)} ({bestRecommendation.economiePct.toFixed(0)}%)
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Commission Exade</span>
                <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                  ~{formatCurrency(bestRecommendation.commissionExade)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Gains totaux courtier</span>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(bestRecommendation.gainsTotauxCourtier)}
                </p>
                <span className="text-[10px] text-gray-400">(Frais {formatCurrency(fraisCourtierEuros)} + Commission)</span>
              </div>
            </div>

            {(onApplyOptimization || brokerId) && (
              <button
                onClick={() => handleApplyOptimization(bestRecommendation.tier.code)}
                disabled={isRecalculating}
                className="mt-4 w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isRecalculating ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Recalcul en cours...
                  </>
                ) : (
                  <>
                    <i className="ri-refresh-line"></i>
                    Appliquer et recalculer
                  </>
                )}
              </button>
            )}
            {recalculError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400 text-center">
                {recalculError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Contenu étendu */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Sélection du devis */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Devis :
            </label>
            <Select value={selectedDevisId} onValueChange={setSelectedDevisId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un devis" />
              </SelectTrigger>
              <SelectContent>
                {devisList.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.compagnie} - {formatCurrency(d.cout_total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frais courtier */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Frais courtier :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={fraisCourtierEuros}
                onChange={(e) => setFraisCourtierEuros(Number(e.target.value))}
                className="flex-1 accent-violet-600"
              />
              <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 w-20 text-right">
                {formatCurrency(fraisCourtierEuros)}
              </span>
            </div>
          </div>

          {/* Tableau comparatif des paliers */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-violet-200 dark:border-violet-800">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Palier</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Coût client</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Économie client</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Commission Exade</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Gains courtier</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-100 dark:divide-violet-900">
                {tierAnalysis.map((analysis, index) => (
                  <tr 
                    key={analysis.tier.code}
                    className={`${
                      !analysis.isViable 
                        ? 'opacity-40' 
                        : index === 0 
                          ? 'bg-violet-50 dark:bg-violet-900/20' 
                          : 'hover:bg-violet-50/50 dark:hover:bg-violet-900/10'
                    }`}
                  >
                    <td className="py-2 px-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {analysis.tier.label}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(analysis.coutClientTotal)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={`font-semibold ${
                        analysis.economieClient > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatCurrency(analysis.economieClient)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        ({analysis.economiePct.toFixed(0)}%)
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-violet-600 dark:text-violet-400">
                      ~{formatCurrency(analysis.commissionExade)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(analysis.gainsTotauxCourtier)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {!analysis.isViable ? (
                        <span className="text-xs text-red-500">Non viable</span>
                      ) : index === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                          ✨ Optimal
                        </span>
                      ) : analysis.economiePct >= 20 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">
                          ✓ Viable
                        </span>
                      ) : analysis.economiePct >= 10 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                          ⚠ Limite
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="pt-3 border-t border-violet-200 dark:border-violet-800 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <strong>💡 Commission Exade</strong> : payée par l'assureur au courtier, invisible pour le client
            </p>
            <p>
              <strong>📋 Frais courtier</strong> : visibles sur le document, restez raisonnable (150-300€)
            </p>
            <p>
              <strong>🎯 Stratégie</strong> : Choisissez un palier élevé (plus de commission) tout en gardant &gt;15% d'économie client
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

