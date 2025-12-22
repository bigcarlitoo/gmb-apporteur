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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";

interface CommissionSettings {
  id: string;
  broker_id: string;
  default_apporteur_share_pct: number | null;
  default_apporteur_fixed_amount: number | null; // en centimes - nouveau champ pour montant fixe
  default_apporteur_exade_share_pct: number; // % des commissions Exade reversé aux apporteurs
  default_frais_courtier: number; // en centimes
  default_commission_exade_code: string | null;
  subscription_plan: 'free' | 'unlimited';
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
}

type CommissionType = 'percentage' | 'fixed';

interface BrokerCommissionSettingsProps {
  brokerId: string;
}

// Nouvelle tarification simplifiée : 6% sur tout
const PLATFORM_FEE_PCT = 6; // 6% sur frais courtier + commissions Exade 1ère année

export function BrokerCommissionSettings({ brokerId }: BrokerCommissionSettingsProps) {
  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Champs éditables
  const [commissionType, setCommissionType] = useState<CommissionType>('percentage');
  const [defaultApporteurPct, setDefaultApporteurPct] = useState(80);
  const [defaultApporteurFixed, setDefaultApporteurFixed] = useState(100); // en euros
  const [defaultApporteurExadePct, setDefaultApporteurExadePct] = useState(0); // % des commissions Exade pour apporteurs
  const [defaultFraisEuros, setDefaultFraisEuros] = useState(150);
  const [defaultCommissionCode, setDefaultCommissionCode] = useState('');
  
  // Sélection compagnie/code en deux étapes
  const [selectedCompagnie, setSelectedCompagnie] = useState<string>('');

  // Charger les paramètres
  useEffect(() => {
    const fetchSettings = async () => {
      if (!brokerId) return;
      
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('broker_commission_settings')
          .select('*')
          .eq('broker_id', brokerId)
          .single();

        if (fetchError) {
          // Si pas de record, on en crée un
          if (fetchError.code === 'PGRST116') {
            const { data: newData, error: insertError } = await supabase
              .from('broker_commission_settings')
              .insert({ broker_id: brokerId })
              .select()
              .single();

            if (insertError) throw insertError;
            setSettings(newData);
            setDefaultApporteurPct(newData.default_apporteur_share_pct);
            setDefaultFraisEuros(newData.default_frais_courtier / 100);
            setDefaultCommissionCode(newData.default_commission_exade_code || '');
          } else {
            throw fetchError;
          }
        } else {
          setSettings(data);
          // Déterminer le type de commission
          if (data.default_apporteur_fixed_amount !== null) {
            setCommissionType('fixed');
            setDefaultApporteurFixed(data.default_apporteur_fixed_amount / 100);
            setDefaultApporteurPct(data.default_apporteur_share_pct || 80);
          } else {
            setCommissionType('percentage');
            setDefaultApporteurPct(data.default_apporteur_share_pct || 80);
          }
          setDefaultApporteurExadePct(data.default_apporteur_exade_share_pct || 0);
          setDefaultFraisEuros(data.default_frais_courtier / 100);
          setDefaultCommissionCode(data.default_commission_exade_code || '');
          // Initialiser la compagnie à partir du code existant
          if (data.default_commission_exade_code) {
            const compagnieId = getCompagnieFromCode(data.default_commission_exade_code);
            setSelectedCompagnie(compagnieId || '');
          }
        }
      } catch (err: any) {
        console.error('Erreur chargement settings:', err);
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [brokerId]);

  // Sauvegarder les modifications
  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData = {
        default_apporteur_share_pct: commissionType === 'percentage' ? defaultApporteurPct : null,
        default_apporteur_fixed_amount: commissionType === 'fixed' ? Math.round(defaultApporteurFixed * 100) : null,
        default_apporteur_exade_share_pct: defaultApporteurExadePct, // % des commissions Exade pour apporteurs
        default_frais_courtier: Math.round(defaultFraisEuros * 100), // Conversion euros → centimes
        default_commission_exade_code: defaultCommissionCode || null,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('broker_commission_settings')
        .update(updateData)
        .eq('id', settings.id);

      if (updateError) throw updateError;

      // Mettre à jour le state local
      setSettings({
        ...settings,
        default_apporteur_share_pct: commissionType === 'percentage' ? defaultApporteurPct : null,
        default_apporteur_fixed_amount: commissionType === 'fixed' ? Math.round(defaultApporteurFixed * 100) : null,
        default_apporteur_exade_share_pct: defaultApporteurExadePct,
        default_frais_courtier: Math.round(defaultFraisEuros * 100),
        default_commission_exade_code: defaultCommissionCode || null
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Calcul exemple - Nouvelle tarification 5% sur tout
  const exampleFrais = defaultFraisEuros;
  const exampleExadeMensuel = 30; // 30€/mois de commission Exade (exemple)
  const exampleExadeAnnuel = exampleExadeMensuel * 12; // 360€ sur 1 an
  
  // Part apporteur sur les frais courtier
  const exampleApporteurFrais = commissionType === 'percentage' 
    ? (exampleFrais * defaultApporteurPct) / 100 
    : defaultApporteurFixed;
  
  // Part apporteur sur les commissions Exade (si activé)
  const exampleApporteurExade = (exampleExadeAnnuel * defaultApporteurExadePct) / 100;
  const exampleApporteurTotal = exampleApporteurFrais + exampleApporteurExade;
  
  // Commission plateforme 5% sur tout (frais + commissions Exade)
  const examplePlatformFrais = (exampleFrais * PLATFORM_FEE_PCT) / 100;
  const examplePlatformExade = (exampleExadeAnnuel * PLATFORM_FEE_PCT) / 100;
  const examplePlatformTotal = examplePlatformFrais + examplePlatformExade;
  
  // Net courtier
  const exampleCourtierNet = (exampleFrais - exampleApporteurFrais - examplePlatformFrais) + 
                             (exampleExadeAnnuel - exampleApporteurExade - examplePlatformExade);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Commissions Apporteurs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-xl flex items-center justify-center">
            <i className="ri-percent-line text-[#335FAD] text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Commissions Apporteurs
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Définissez le pourcentage de commission reversé aux apporteurs
            </p>
          </div>
        </div>

        {/* Type de commission */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Type de commission apporteur
          </label>
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setCommissionType('percentage')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                commissionType === 'percentage'
                  ? 'border-[#335FAD] bg-[#335FAD]/5 dark:bg-[#335FAD]/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <i className={`ri-percent-line text-lg ${commissionType === 'percentage' ? 'text-[#335FAD]' : 'text-gray-400'}`}></i>
                <span className={`font-medium ${commissionType === 'percentage' ? 'text-[#335FAD]' : 'text-gray-600 dark:text-gray-400'}`}>
                  Pourcentage
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                % des frais de courtage
              </p>
            </button>
            
            <button
              type="button"
              onClick={() => setCommissionType('fixed')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                commissionType === 'fixed'
                  ? 'border-[#335FAD] bg-[#335FAD]/5 dark:bg-[#335FAD]/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <i className={`ri-money-euro-circle-line text-lg ${commissionType === 'fixed' ? 'text-[#335FAD]' : 'text-gray-400'}`}></i>
                <span className={`font-medium ${commissionType === 'fixed' ? 'text-[#335FAD]' : 'text-gray-600 dark:text-gray-400'}`}>
                  Montant fixe
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Montant en euros
              </p>
            </button>
          </div>
        </div>

        {/* Commission par défaut - Pourcentage */}
        {commissionType === 'percentage' && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pourcentage apporteur par défaut
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={defaultApporteurPct}
                    onChange={(e) => setDefaultApporteurPct(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#335FAD]"
                  />
                </div>
              </div>
              <div className="w-24">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={defaultApporteurPct}
                    onChange={(e) => setDefaultApporteurPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <i className="ri-information-line mr-1"></i>
              Ce pourcentage s'applique sur les frais de courtage que vous facturez.
            </p>
          </div>
        )}

        {/* Commission par défaut - Montant fixe */}
        {commissionType === 'fixed' && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Montant fixe par dossier
            </label>
            <div className="relative w-48">
              <input
                type="number"
                min="0"
                step="5"
                value={defaultApporteurFixed}
                onChange={(e) => setDefaultApporteurFixed(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">€</span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <i className="ri-information-line mr-1"></i>
              Chaque apporteur touchera ce montant fixe par dossier finalisé, indépendamment des frais.
            </p>
          </div>
        )}

        <p className="mb-6 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
          <i className="ri-lightbulb-line mr-1 text-blue-500"></i>
          <strong>Astuce :</strong> Vous pouvez définir une commission personnalisée (% ou fixe) pour chaque apporteur directement sur sa fiche.
        </p>

        {/* Commission Exade pour apporteurs (NOUVELLE FONCTIONNALITÉ) */}
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ri-gift-line text-purple-600 dark:text-purple-400"></i>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Part apporteur sur vos commissions Exade (optionnel)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Reversez un % de vos commissions Exade 1ère année à vos apporteurs pour les fidéliser.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-3">
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="50"
                value={defaultApporteurExadePct}
                onChange={(e) => setDefaultApporteurExadePct(Number(e.target.value))}
                className="w-full h-2 bg-purple-200 dark:bg-purple-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0% (rien)</span>
                <span>50% (max)</span>
              </div>
            </div>
            <div className="w-20">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={defaultApporteurExadePct}
                  onChange={(e) => setDefaultApporteurExadePct(Math.min(50, Math.max(0, Number(e.target.value))))}
                  className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>
          </div>
          
          {defaultApporteurExadePct > 0 && (
            <div className="mt-3 text-xs text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-800/30 rounded-lg p-2">
              <i className="ri-information-line mr-1"></i>
              Exemple : Pour 360€ de commissions Exade sur 1 an, votre apporteur touchera <strong>{(360 * defaultApporteurExadePct / 100).toFixed(0)}€</strong> en plus de sa part sur les frais.
            </div>
          )}
        </div>

        {/* Frais de courtage par défaut */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Frais de courtage par défaut
          </label>
          <div className="relative w-48">
            <input
              type="number"
              min="0"
              step="10"
              value={defaultFraisEuros}
              onChange={(e) => setDefaultFraisEuros(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">€</span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Montant pré-rempli lors de la création d'un devis. Modifiable par dossier.
          </p>
        </div>

        {/* Code commission Exade - Sélection en deux étapes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Code commission Exade par défaut (optionnel)
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
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
                    setDefaultCommissionCode(defaultCode?.value || codes[0]?.value || '');
                  } else {
                    setDefaultCommissionCode('');
                  }
                }}
              >
                <SelectTrigger className="w-full">
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
                value={defaultCommissionCode || "__default__"}
                onValueChange={(v) => setDefaultCommissionCode(v === "__default__" ? "" : v)}
                disabled={!selectedCompagnie}
              >
                <SelectTrigger className="w-full" disabled={!selectedCompagnie}>
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
          </div>

          {/* Affichage du code sélectionné */}
          {defaultCommissionCode && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                <i className="ri-information-line mr-1"></i>
                Code sélectionné : <strong>{defaultCommissionCode}</strong>
                {EXADE_COMMISSION_CODES[defaultCommissionCode as ExadeCommissionCode] && (
                  <span className="ml-2">
                    ({EXADE_COMMISSION_CODES[defaultCommissionCode as ExadeCommissionCode].taux})
                  </span>
                )}
              </p>
            </div>
          )}
          
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Détermine le taux de commission que vous recevez d'Exade sur chaque contrat.
          </p>
        </div>

        {/* Aperçu du calcul - Nouvelle tarification 5% */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            <i className="ri-calculator-line mr-2"></i>
            Exemple de calcul complet
          </h4>
          
          {/* Tableau récapitulatif */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-normal">Source</th>
                  <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-normal">Montant</th>
                  <th className="text-right py-2 text-green-600 dark:text-green-400 font-normal">Apporteur</th>
                  <th className="text-right py-2 text-orange-600 dark:text-orange-400 font-normal">Plateforme (6%)</th>
                  <th className="text-right py-2 text-[#335FAD] font-normal">Vous (net)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-2">Frais courtier</td>
                  <td className="text-right font-medium">{exampleFrais}€</td>
                  <td className="text-right text-green-600 dark:text-green-400">{exampleApporteurFrais.toFixed(0)}€</td>
                  <td className="text-right text-orange-600 dark:text-orange-400">{examplePlatformFrais.toFixed(0)}€</td>
                  <td className="text-right text-[#335FAD]">{(exampleFrais - exampleApporteurFrais - examplePlatformFrais).toFixed(0)}€</td>
                </tr>
                <tr>
                  <td className="py-2">Commission Exade 1ère année</td>
                  <td className="text-right font-medium">{exampleExadeAnnuel}€</td>
                  <td className="text-right text-green-600 dark:text-green-400">{exampleApporteurExade.toFixed(0)}€</td>
                  <td className="text-right text-orange-600 dark:text-orange-400">{examplePlatformExade.toFixed(0)}€</td>
                  <td className="text-right text-[#335FAD]">{(exampleExadeAnnuel - exampleApporteurExade - examplePlatformExade).toFixed(0)}€</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                  <td className="py-2">TOTAL / dossier</td>
                  <td className="text-right">{exampleFrais + exampleExadeAnnuel}€</td>
                  <td className="text-right text-green-600 dark:text-green-400">{exampleApporteurTotal.toFixed(0)}€</td>
                  <td className="text-right text-orange-600 dark:text-orange-400">{examplePlatformTotal.toFixed(0)}€</td>
                  <td className="text-right text-[#335FAD]">{exampleCourtierNet.toFixed(0)}€</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <i className="ri-information-line mr-1"></i>
            Basé sur {exampleFrais}€ de frais et {exampleExadeMensuel}€/mois de commission Exade. La commission plateforme est prélevée mensuellement au fur et à mesure de vos encaissements.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              <i className="ri-error-warning-line mr-2"></i>
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">
              <i className="ri-check-line mr-2"></i>
              Paramètres enregistrés avec succès
            </p>
          </div>
        )}

        {/* Bouton sauvegarder */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#335FAD] hover:bg-[#2a4d8f] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        </div>
      </div>

      {/* Section Commission Plateforme */}
      <div className="bg-gradient-to-br from-[#335FAD]/5 to-purple-50 dark:from-[#335FAD]/10 dark:to-purple-900/20 rounded-2xl border-2 border-[#335FAD]/20 dark:border-[#335FAD]/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-xl flex items-center justify-center">
            <i className="ri-price-tag-3-line text-[#335FAD] text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Commission plateforme
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tarification simple et transparente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl font-bold text-[#335FAD]">
            {PLATFORM_FEE_PCT}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            sur vos revenus<br/>
            <span className="text-xs">(frais courtier + commissions Exade 1ère année)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <i className="ri-check-circle-line text-green-500"></i>
            <span>Pas d'abonnement</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <i className="ri-check-circle-line text-green-500"></i>
            <span>Vous payez quand vous gagnez</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <i className="ri-check-circle-line text-green-500"></i>
            <span>Prélèvement mensuel lissé</span>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-900/30 rounded-lg p-3">
          <i className="ri-information-line mr-1"></i>
          La commission est prélevée au fur et à mesure de vos encaissements : immédiatement pour les frais courtier, mensuellement pour les commissions Exade.
        </p>
      </div>
    </div>
  );
}

export default BrokerCommissionSettings;


