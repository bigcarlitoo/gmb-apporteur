'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
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

interface CommissionVariante {
  code: string;
  label: string;
  cout_client_total: number;
  economie_client: number;
  economie_client_pct: number;
  commission_courtier_estimee: number;
  recommendation: 'economique' | 'recommande' | 'premium';
}

interface TarifAnalysis {
  id_tarif: string;
  compagnie: string;
  nom: string;
  cout_default: number;
  variantes: CommissionVariante[];
  best_for_client: CommissionVariante | null;
  best_for_broker: CommissionVariante | null;
}

interface CommissionAnalysisResult {
  analyzed_at: string;
  assurance_actuelle_mensuelle: number;
  assurance_actuelle_total: number;
  duree_mois: number;
  top_tarifs: TarifAnalysis[];
  meilleure_economie_client: {
    tarif: string;
    compagnie: string;
    economie: number;
    code_commission: string;
  } | null;
  meilleur_compromis: {
    tarif: string;
    compagnie: string;
    economie_client: number;
    commission_courtier: number;
    code_commission: string;
  } | null;
}

interface CommissionRecommendationCardProps {
  dossierId: string;
  coutAssuranceBanque?: number;
  onSelectCommission?: (tarifId: string, code: string) => void;
  compact?: boolean; // Pour la vue d'ensemble
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CommissionRecommendationCard({
  dossierId,
  coutAssuranceBanque,
  onSelectCommission,
  compact = false
}: CommissionRecommendationCardProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CommissionAnalysisResult | null>(null);
  const [selectedTarif, setSelectedTarif] = useState<string>('');
  const [selectedCode, setSelectedCode] = useState<string>('');

  // Charger l'analyse existante au montage
  useEffect(() => {
    // On ne charge pas automatiquement pour éviter les appels inutiles
    // L'analyse est déclenchée manuellement
  }, [dossierId]);

  // Lancer une nouvelle analyse
  const handleAnalyze = async () => {
    if (!coutAssuranceBanque || coutAssuranceBanque <= 0) {
      setError('Le coût de l\'assurance banque doit être renseigné pour analyser les commissions.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/dossiers/${dossierId}/analyze-commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      setAnalysis(data.analysis);
      
      // Sélectionner automatiquement le meilleur compromis
      if (data.analysis.meilleur_compromis) {
        const bestTarif = data.analysis.top_tarifs.find(
          (t: TarifAnalysis) => t.compagnie === data.analysis.meilleur_compromis.compagnie
        );
        if (bestTarif) {
          setSelectedTarif(bestTarif.id_tarif);
          setSelectedCode(data.analysis.meilleur_compromis.code_commission);
        }
      }
    } catch (err: any) {
      console.error('Erreur analyse commissions:', err);
      setError(err.message || 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  // Sélection d'un tarif
  const handleTarifChange = (tarifId: string) => {
    setSelectedTarif(tarifId);
    const tarif = analysis?.top_tarifs.find(t => t.id_tarif === tarifId);
    if (tarif?.best_for_broker) {
      setSelectedCode(tarif.best_for_broker.code);
    } else if (tarif?.variantes.length) {
      setSelectedCode(tarif.variantes[0].code);
    }
  };

  // Sélection d'un code de commission
  const handleCodeChange = (code: string) => {
    setSelectedCode(code);
    if (onSelectCommission && selectedTarif) {
      onSelectCommission(selectedTarif, code);
    }
  };

  // Appliquer la sélection
  const handleApply = () => {
    if (onSelectCommission && selectedTarif && selectedCode) {
      onSelectCommission(selectedTarif, selectedCode);
    }
  };

  // Données de la variante sélectionnée
  const selectedTarifData = analysis?.top_tarifs.find(t => t.id_tarif === selectedTarif);
  const selectedVariante = selectedTarifData?.variantes.find(v => v.code === selectedCode);

  // ========================================================================
  // RENDER - Mode compact (vue d'ensemble)
  // ========================================================================
  if (compact) {
    if (!analysis) {
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <i className="ri-money-euro-circle-line text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Optimisation des commissions
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Analysez les options de commission pour maximiser vos gains
                </p>
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !coutAssuranceBanque}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Analyse...
                </>
              ) : (
                <>
                  <i className="ri-search-eye-line"></i>
                  Analyser
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      );
    }

    // Affichage compact avec résumé
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <i className="ri-checkbox-circle-line text-green-600 dark:text-green-400 text-xl"></i>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Recommandation commission
              </h4>
              {analysis.meilleur_compromis && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {analysis.meilleur_compromis.compagnie}
                    </span>
                    {' - '}
                    Économie client: <span className="font-semibold">{formatCurrency(analysis.meilleur_compromis.economie_client)}</span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Commission courtier estimée: <span className="font-semibold text-blue-600 dark:text-blue-400">
                      ~{formatCurrency(analysis.meilleur_compromis.commission_courtier)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(analysis.analyzed_at).toLocaleDateString('fr-FR')}
            </span>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Actualiser l'analyse"
            >
              <i className={`ri-refresh-line ${analyzing ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // RENDER - Mode complet (onglet Devis)
  // ========================================================================
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <i className="ri-sparkling-line text-white text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Optimisation intelligente des commissions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trouvez le meilleur équilibre entre économies client et revenus courtier
            </p>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={analyzing || !coutAssuranceBanque}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          {analyzing ? (
            <>
              <i className="ri-loader-4-line animate-spin"></i>
              Analyse en cours...
            </>
          ) : analysis ? (
            <>
              <i className="ri-refresh-line"></i>
              Actualiser
            </>
          ) : (
            <>
              <i className="ri-search-eye-line"></i>
              Lancer l'analyse
            </>
          )}
        </button>
      </div>

      {/* Message si pas de coût assurance */}
      {!coutAssuranceBanque && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg mb-4">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            <i className="ri-information-line mr-2"></i>
            Le coût de l'assurance banque doit être renseigné dans les données du prêt pour calculer les économies.
          </p>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg mb-4">
          <p className="text-sm text-red-700 dark:text-red-400">
            <i className="ri-error-warning-line mr-2"></i>
            {error}
          </p>
        </div>
      )}

      {/* Résultats de l'analyse */}
      {analysis && (
        <div className="space-y-6">
          {/* Infos générales */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Assurance actuelle</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(analysis.assurance_actuelle_mensuelle)}/mois
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Coût total sur {Math.round(analysis.duree_mois / 12)} ans</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(analysis.assurance_actuelle_total)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Analysé le</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(analysis.analyzed_at).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>

          {/* Cartes de recommandation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meilleure économie client */}
            {analysis.meilleure_economie_client && (
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <i className="ri-leaf-line text-green-600 dark:text-green-400 text-lg"></i>
                  <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Meilleure économie client
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {analysis.meilleure_economie_client.compagnie}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    -{formatCurrency(analysis.meilleure_economie_client.economie)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Code: {analysis.meilleure_economie_client.code_commission}
                  </p>
                </div>
              </div>
            )}

            {/* Meilleur compromis */}
            {analysis.meilleur_compromis && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <i className="ri-trophy-line text-blue-600 dark:text-blue-400 text-lg"></i>
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                    Meilleur compromis
                  </span>
                  <span className="ml-auto px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                    Recommandé
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {analysis.meilleur_compromis.compagnie}
                  </p>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Économie client</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        -{formatCurrency(analysis.meilleur_compromis.economie_client)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Votre commission</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ~{formatCurrency(analysis.meilleur_compromis.commission_courtier)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Code: {analysis.meilleur_compromis.code_commission}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sélecteur de tarif et variante */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Personnaliser la sélection
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sélection du tarif */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Compagnie / Tarif
                </label>
                <Select value={selectedTarif} onValueChange={handleTarifChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un tarif" />
                  </SelectTrigger>
                  <SelectContent>
                    {analysis.top_tarifs.map((tarif) => (
                      <SelectItem key={tarif.id_tarif} value={tarif.id_tarif}>
                        {tarif.compagnie} - {tarif.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sélection du code commission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code commission
                </label>
                <Select 
                  value={selectedCode} 
                  onValueChange={handleCodeChange}
                  disabled={!selectedTarif}
                >
                  <SelectTrigger className="w-full" disabled={!selectedTarif}>
                    <SelectValue placeholder="Sélectionner un code" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTarifData?.variantes.map((v) => (
                      <SelectItem key={v.code} value={v.code}>
                        <span className={`
                          ${v.recommendation === 'economique' ? 'text-green-600' : ''}
                          ${v.recommendation === 'recommande' ? 'text-blue-600' : ''}
                          ${v.recommendation === 'premium' ? 'text-purple-600' : ''}
                        `}>
                          {v.code} - {v.label.split(' - ').pop()}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Aperçu de la variante sélectionnée */}
            {selectedVariante && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Coût client</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(selectedVariante.cout_client_total)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Économie</span>
                    <span className={`text-lg font-semibold ${selectedVariante.economie_client > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {selectedVariante.economie_client > 0 ? '-' : '+'}{formatCurrency(Math.abs(selectedVariante.economie_client))}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Commission estimée</span>
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      ~{formatCurrency(selectedVariante.commission_courtier_estimee)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton appliquer */}
            {onSelectCommission && selectedTarif && selectedCode && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleApply}
                  className="px-6 py-2.5 bg-[#335FAD] hover:bg-[#2a4d8f] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <i className="ri-check-line"></i>
                  Appliquer cette configuration
                </button>
              </div>
            )}
          </div>

          {/* Note informative */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <i className="ri-information-line mr-1"></i>
              <strong>Note :</strong> Les commissions affichées sont des estimations basées sur les taux Exade. 
              Le montant exact sera confirmé par Exade lors de la souscription du contrat.
            </p>
          </div>
        </div>
      )}

      {/* État initial - pas d'analyse */}
      {!analysis && !error && !analyzing && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <i className="ri-line-chart-line text-gray-400 dark:text-gray-500 text-2xl"></i>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Aucune analyse effectuée
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Cliquez sur "Lancer l'analyse" pour obtenir des recommandations personnalisées
          </p>
        </div>
      )}
    </div>
  );
}

export default CommissionRecommendationCard;




