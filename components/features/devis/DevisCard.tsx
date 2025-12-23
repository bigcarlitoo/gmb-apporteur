'use client';

import { useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
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
  compagnie: string;
  produit: string;
  cout_mensuel: number;
  cout_total: number;
  economie_estimee?: number;
  formalites_medicales: string[];
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
  compatible_lemoine?: boolean;
  type_tarif?: string;
  erreurs?: string[];
}

interface DevisCardProps {
  devis: DevisData;
  coutAssuranceBanque?: number;
  onClick: () => void;
  // Props pour le téléchargement PDF
  brokerId?: string;
  clientInfo?: any;
  pretData?: any;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function DevisCard({ devis, coutAssuranceBanque, onClick, brokerId, clientInfo, pretData }: DevisCardProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Télécharger le PDF du devis
  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!brokerId || !clientInfo || !pretData) {
      alert('Informations manquantes pour générer le PDF');
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const response = await fetch('/api/exade/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: brokerId,
          clientInfo,
          pretData,
          idTarif: devis.id_tarif
        })
      });

      if (!response.ok) throw new Error('Erreur lors du chargement');

      const data = await response.json();
      const devisDoc = data.documents?.find((d: any) => d.libelle?.toLowerCase().includes('devis'));

      if (devisDoc?.data) {
        const byteCharacters = atob(devisDoc.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = devisDoc.nom || `Devis_${devis.compagnie}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert('Le PDF n\'est pas disponible pour ce tarif');
      }
    } catch (err) {
      console.error('Erreur PDF:', err);
      alert('Erreur lors du téléchargement');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Calculer l'économie
  const economie = useMemo(() => {
    if (!coutAssuranceBanque) return null;
    const eco = coutAssuranceBanque - devis.cout_total;
    const pourcentage = coutAssuranceBanque > 0 ? (eco / coutAssuranceBanque) * 100 : 0;
    return { economie: eco, pourcentage };
  }, [coutAssuranceBanque, devis.cout_total]);

  // Obtenir les infos du code commission
  const commissionInfo = useMemo(() => {
    if (!devis.commission_exade_code) return null;
    return EXADE_COMMISSION_CODES[devis.commission_exade_code as ExadeCommissionCode];
  }, [devis.commission_exade_code]);

  // Déterminer la couleur de la compagnie
  const getCompagnieGradient = (compagnie: string): string => {
    const gradients: Record<string, string> = {
      'GENERALI': 'from-red-500 to-red-600',
      'SWISSLIFE': 'from-blue-600 to-blue-700',
      'MNCAP': 'from-green-600 to-green-700',
      'CNP': 'from-purple-600 to-purple-700',
      'MAIF': 'from-emerald-600 to-emerald-700',
      'MALAKOFF': 'from-orange-500 to-orange-600',
      'HUMANIS': 'from-orange-500 to-orange-600',
      'DIGITAL': 'from-cyan-600 to-cyan-700',
      'ASSUREA': 'from-indigo-600 to-indigo-700',
    };
    const key = Object.keys(gradients).find(k => compagnie.toUpperCase().includes(k));
    return key ? gradients[key] : 'from-[#335FAD] to-[#2a4d8f]';
  };

  // Déterminer le badge de statut
  const renderStatusBadge = () => {
    if (devis.statut === 'accepte') {
      return (
        <span className="absolute top-3 right-3 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <i className="ri-check-double-line"></i>
          Accepté
        </span>
      );
    }
    if (devis.statut === 'envoye') {
      return (
        <span className="absolute top-3 right-3 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <i className="ri-send-plane-line"></i>
          Envoyé
        </span>
      );
    }
    if (devis.selected && !devis.refused) {
      return (
        <span className="absolute top-3 right-3 px-2 py-1 bg-[#335FAD] text-white text-xs font-medium rounded-full flex items-center gap-1">
          <i className="ri-check-line"></i>
          Sélectionné
        </span>
      );
    }
    if (devis.refused) {
      return (
        <span className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <i className="ri-close-line"></i>
          Refusé
        </span>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        devis.selected
          ? 'border-[#335FAD] ring-2 ring-[#335FAD]/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-[#335FAD]/50'
      }`}
    >
      {/* Badge statut */}
      {renderStatusBadge()}

      {/* Header avec gradient compagnie */}
      <div className={`bg-gradient-to-r ${getCompagnieGradient(devis.compagnie)} p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <i className="ri-shield-check-fill text-white text-lg"></i>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-white font-semibold truncate">
              {devis.compagnie}
            </h4>
            <p className="text-white/70 text-xs truncate">
              {devis.produit}
            </p>
          </div>
        </div>

        {/* Badges (Lemoine, type tarif) */}
        <div className="flex items-center gap-2 mt-3">
          {devis.compatible_lemoine && (
            <span className="px-2 py-0.5 bg-green-500/80 text-white text-xs font-medium rounded">
              Lemoine
            </span>
          )}
          <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded">
            {devis.type_tarif || 'NON RÉVISABLE'}
          </span>
        </div>
      </div>

      {/* Corps de la card */}
      <div className="p-4">
        {/* Prix principaux */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Mensualité</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(devis.cout_mensuel)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total</p>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {formatCurrency(devis.cout_total)}
            </p>
          </div>
        </div>

        {/* Économie */}
        {economie && (
          <div className={`p-3 rounded-lg mb-3 ${
            economie.economie > 0
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${
                economie.economie > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              }`}>
                <i className={`mr-1 ${economie.economie > 0 ? 'ri-arrow-down-line' : 'ri-arrow-up-line'}`}></i>
                Économie
              </span>
              <span className={`text-lg font-bold ${
                economie.economie > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {economie.economie > 0 ? '-' : '+'}{formatCurrency(Math.abs(economie.economie))}
              </span>
            </div>
            <p className={`text-xs mt-1 ${
              economie.economie > 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
            }`}>
              {Math.abs(economie.pourcentage).toFixed(1)}% {economie.economie > 0 ? 'd\'économie' : 'de surcoût'}
            </p>
          </div>
        )}

        {/* Commission */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">Commission</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono rounded">
              {devis.commission_exade_code || 'Défaut'}
            </span>
            {commissionInfo && (
              <span className="text-xs text-gray-500 dark:text-gray-400" title={commissionInfo.taux}>
                ({commissionInfo.taux.split(' ')[0]})
              </span>
            )}
          </div>
        </div>

        {/* Frais courtier */}
        {(devis.frais_courtier || devis.frais_adhesion_apporteur) && (
          <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">Frais courtier</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatCurrency(devis.frais_courtier ? devis.frais_courtier / 100 : devis.frais_adhesion_apporteur || 0)}
            </span>
          </div>
        )}

        {/* Erreurs */}
        {devis.erreurs && devis.erreurs.length > 0 && (
          <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <i className="ri-error-warning-line"></i>
              {devis.erreurs.length} alerte{devis.erreurs.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Footer avec actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
        <div className="flex gap-2">
          <button className="flex-1 py-2 text-sm font-medium text-[#335FAD] hover:text-[#2a4d8f] dark:text-[#335FAD]/80 dark:hover:text-[#335FAD] transition-colors flex items-center justify-center gap-2 group-hover:underline">
            <i className="ri-eye-line"></i>
            Détails
          </button>
          {brokerId && clientInfo && pretData && (
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Télécharger le devis PDF"
            >
              {isDownloadingPdf ? (
                <i className="ri-loader-4-line animate-spin"></i>
              ) : (
                <i className="ri-file-pdf-line"></i>
              )}
              PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DevisCard;





