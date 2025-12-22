'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  COMPAGNIE_OPTIONS, 
  getCommissionCodesForCompagnie,
  getCompagnieFromCode,
  EXADE_COMMISSION_CODES,
  ExadeCommissionCode
} from '@/lib/constants/exade';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DevisCommissionPanelProps {
  dossierId: string;
  selectedDevisId: string | null;
  selectedDevisCoutTotal: number;
  apporteurId: string | null;
  brokerId: string;
  onSettingsChange?: (fraisCourtier: number, commissionCode: string) => void;
  onRefreshDevis?: () => void;
}

interface CommissionCalculation {
  frais_courtier: number; // en centimes
  commission_exade_code: string | null;
  apporteur_share_pct: number;
  platform_fee_pct: number;
  apporteur_amount: number; // en centimes
  platform_fee_amount: number; // en centimes
  broker_net_amount: number; // en centimes
}

export function DevisCommissionPanel({
  dossierId,
  selectedDevisId,
  selectedDevisCoutTotal,
  apporteurId,
  brokerId,
  onSettingsChange,
  onRefreshDevis
}: DevisCommissionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données du devis sélectionné
  const [fraisCourtierEuros, setFraisCourtierEuros] = useState(0);
  const [commissionCode, setCommissionCode] = useState('');
  const [selectedCompagnie, setSelectedCompagnie] = useState<string>('');
  
  // Paramètres par défaut du broker
  const [defaultFrais, setDefaultFrais] = useState(150);
  const [defaultCommissionCode, setDefaultCommissionCode] = useState('');
  const [defaultApporteurPct, setDefaultApporteurPct] = useState(80);
  const [platformFeePct, setPlatformFeePct] = useState(7.5);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free');
  
  // Commission personnalisée de l'apporteur
  const [customApporteurPct, setCustomApporteurPct] = useState<number | null>(null);

  // Calculs
  const [calculation, setCalculation] = useState<CommissionCalculation | null>(null);

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      if (!dossierId || !brokerId) return;
      
      setLoading(true);
      setError(null);

      try {
        // 1. Charger les paramètres du broker
        const { data: settings, error: settingsError } = await supabase
          .from('broker_commission_settings')
          .select('*')
          .eq('broker_id', brokerId)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Erreur settings:', settingsError);
        }

        if (settings) {
          setDefaultFrais(settings.default_frais_courtier / 100);
          setDefaultCommissionCode(settings.default_commission_exade_code || '');
          setDefaultApporteurPct(settings.default_apporteur_share_pct);
          setSubscriptionPlan(settings.subscription_plan);

          // Calculer le taux de plateforme selon le plan et la présence d'apporteur
          const platformFees = {
            free: apporteurId ? 7.5 : 4,
            pro: apporteurId ? 3 : 0,
            unlimited: 0
          };
          setPlatformFeePct(platformFees[settings.subscription_plan as keyof typeof platformFees] || 7.5);
        }

        // 2. Charger la commission personnalisée de l'apporteur si présent
        if (apporteurId) {
          const { data: baData, error: baError } = await supabase
            .from('broker_apporteurs')
            .select('custom_share_pct')
            .eq('apporteur_id', apporteurId)
            .eq('broker_id', brokerId)
            .single();

          if (!baError && baData) {
            setCustomApporteurPct(baData.custom_share_pct);
          }
        }

        // 3. Charger les données du devis sélectionné s'il existe
        if (selectedDevisId) {
          const { data: devisData, error: devisError } = await supabase
            .from('devis')
            .select('frais_courtier, commission_exade_code')
            .eq('id', selectedDevisId)
            .single();

          if (!devisError && devisData) {
            setFraisCourtierEuros(devisData.frais_courtier ? devisData.frais_courtier / 100 : settings?.default_frais_courtier ? settings.default_frais_courtier / 100 : 150);
            const code = devisData.commission_exade_code || settings?.default_commission_exade_code || '';
            setCommissionCode(code);
            // Initialiser la compagnie à partir du code
            if (code) {
              const compagnieId = getCompagnieFromCode(code);
              setSelectedCompagnie(compagnieId || '');
            }
          } else {
            // Utiliser les valeurs par défaut
            setFraisCourtierEuros(settings?.default_frais_courtier ? settings.default_frais_courtier / 100 : 150);
            const defaultCode = settings?.default_commission_exade_code || '';
            setCommissionCode(defaultCode);
            if (defaultCode) {
              const compagnieId = getCompagnieFromCode(defaultCode);
              setSelectedCompagnie(compagnieId || '');
            }
          }
        } else {
          // Pas de devis sélectionné, utiliser les valeurs par défaut
          setFraisCourtierEuros(settings?.default_frais_courtier ? settings.default_frais_courtier / 100 : 150);
          const defaultCode = settings?.default_commission_exade_code || '';
          setCommissionCode(defaultCode);
          if (defaultCode) {
            const compagnieId = getCompagnieFromCode(defaultCode);
            setSelectedCompagnie(compagnieId || '');
          }
        }
      } catch (err: any) {
        console.error('Erreur chargement données commission:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dossierId, brokerId, apporteurId, selectedDevisId]);

  // Calculer les montants à chaque changement
  useEffect(() => {
    const fraisCentimes = Math.round(fraisCourtierEuros * 100);
    const apporteurPct = customApporteurPct !== null ? customApporteurPct : defaultApporteurPct;
    
    // Si pas d'apporteur, pas de commission apporteur
    const effectiveApporteurPct = apporteurId ? apporteurPct : 0;
    
    const apporteurAmount = Math.round((fraisCentimes * effectiveApporteurPct) / 100);
    const platformFeeAmount = Math.round((fraisCentimes * platformFeePct) / 100);
    const brokerNetAmount = fraisCentimes - apporteurAmount - platformFeeAmount;

    setCalculation({
      frais_courtier: fraisCentimes,
      commission_exade_code: commissionCode || null,
      apporteur_share_pct: effectiveApporteurPct,
      platform_fee_pct: platformFeePct,
      apporteur_amount: apporteurAmount,
      platform_fee_amount: platformFeeAmount,
      broker_net_amount: brokerNetAmount
    });
  }, [fraisCourtierEuros, commissionCode, customApporteurPct, defaultApporteurPct, platformFeePct, apporteurId]);

  // Sauvegarder les modifications sur le devis
  const handleSave = async () => {
    if (!selectedDevisId) {
      setError('Aucun devis sélectionné');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('devis')
        .update({
          frais_courtier: Math.round(fraisCourtierEuros * 100),
          commission_exade_code: commissionCode || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDevisId);

      if (updateError) throw updateError;

      // Notifier le parent si callback fourni
      if (onSettingsChange) {
        onSettingsChange(Math.round(fraisCourtierEuros * 100), commissionCode);
      }

      // Afficher succès (temporairement via alert, idéalement un toast)
      alert('Paramètres enregistrés. Vous pouvez maintenant régénérer les devis pour appliquer les nouveaux taux.');
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <i className="ri-money-euro-circle-line text-[#335FAD] text-xl"></i>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Paramètres financiers du devis
          </h3>
        </div>
        {!selectedDevisId && (
          <span className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg">
            <i className="ri-information-line mr-1"></i>
            Sélectionnez un devis pour modifier les paramètres
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colonne gauche: Paramètres */}
        <div className="space-y-4">
          {/* Frais de courtage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frais de courtage facturés au client
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="10"
                value={fraisCourtierEuros}
                onChange={(e) => setFraisCourtierEuros(Number(e.target.value))}
                disabled={!selectedDevisId}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">€</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Par défaut: {defaultFrais}€
            </p>
          </div>

          {/* Code commission Exade - Sélection en deux étapes */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Code commission Exade
            </label>
            
            {/* Sélection de la compagnie */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Compagnie
              </label>
              <Select
                value={selectedCompagnie || "__none__"}
                onValueChange={(v) => {
                  const newCompagnie = v === "__none__" ? "" : v;
                  setSelectedCompagnie(newCompagnie);
                  // Réinitialiser le code si la compagnie change
                  if (newCompagnie) {
                    const codes = getCommissionCodesForCompagnie(newCompagnie);
                    const defaultCode = codes.find(c => c.isDefault);
                    setCommissionCode(defaultCode?.value || codes[0]?.value || '');
                  } else {
                    setCommissionCode('');
                  }
                }}
                disabled={!selectedDevisId}
              >
                <SelectTrigger className="w-full" disabled={!selectedDevisId}>
                  <SelectValue placeholder="Par défaut (Exade)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    Par défaut (Exade)
                  </SelectItem>
                  {COMPAGNIE_OPTIONS.map((compagnie) => (
                    <SelectItem key={compagnie.value} value={compagnie.value}>
                      {compagnie.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélection du palier/code */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Palier de commission
              </label>
              <Select
                value={commissionCode || "__default__"}
                onValueChange={(v) => setCommissionCode(v === "__default__" ? "" : v)}
                disabled={!selectedDevisId || !selectedCompagnie}
              >
                <SelectTrigger className="w-full" disabled={!selectedDevisId || !selectedCompagnie}>
                  <SelectValue placeholder={selectedCompagnie ? "Sélectionner..." : "Choisir compagnie d'abord"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedCompagnie && getCommissionCodesForCompagnie(selectedCompagnie).map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      <span className="flex items-center gap-2">
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

            {/* Affichage du code sélectionné */}
            {commissionCode && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <i className="ri-information-line mr-1"></i>
                  Code : <strong>{commissionCode}</strong>
                  {EXADE_COMMISSION_CODES[commissionCode as ExadeCommissionCode] && (
                    <span className="ml-1">
                      - {EXADE_COMMISSION_CODES[commissionCode as ExadeCommissionCode].taux}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !selectedDevisId}
              className="flex-1 py-2.5 px-4 bg-[#335FAD] hover:bg-[#2a4d8f] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Enregistrement...
                </>
              ) : (
                <>
                  <i className="ri-save-line"></i>
                  Enregistrer
                </>
              )}
            </button>
            
            {onRefreshDevis && (
              <button
                onClick={onRefreshDevis}
                disabled={!selectedDevisId}
                className="py-2.5 px-4 border border-[#335FAD] text-[#335FAD] hover:bg-[#335FAD] hover:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <i className="ri-refresh-line"></i>
                Régénérer
              </button>
            )}
          </div>
        </div>

        {/* Colonne droite: Aperçu des montants */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <i className="ri-calculator-line"></i>
            Répartition des montants
          </h4>

          {calculation && (
            <div className="space-y-3">
              {/* Frais de courtage total */}
              <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Frais de courtage</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(calculation.frais_courtier / 100)}
                </span>
              </div>

              {/* Commission apporteur */}
              {apporteurId && (
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Apporteur</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                      ({calculation.apporteur_share_pct}%)
                    </span>
                    {customApporteurPct !== null && (
                      <span className="text-xs text-[#335FAD] ml-1">(personnalisé)</span>
                    )}
                  </div>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(calculation.apporteur_amount / 100)}
                  </span>
                </div>
              )}

              {/* Frais plateforme */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Plateforme</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                    ({calculation.platform_fee_pct}%)
                  </span>
                  <span className="text-xs text-purple-600 dark:text-purple-400 ml-1">
                    ({subscriptionPlan})
                  </span>
                </div>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {formatCurrency(calculation.platform_fee_amount / 100)}
                </span>
              </div>

              {/* Montant net courtier */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Votre net</span>
                <span className="font-bold text-lg text-[#335FAD] dark:text-[#335FAD]/80">
                  {formatCurrency(calculation.broker_net_amount / 100)}
                </span>
              </div>

              {/* Note commission Exade */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <i className="ri-information-line mr-1"></i>
                  <strong>+ Commission Exade</strong> : Montant variable versé directement par Exade selon le contrat souscrit et le code commission sélectionné.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            <i className="ri-error-warning-line mr-2"></i>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}

export default DevisCommissionPanel;








