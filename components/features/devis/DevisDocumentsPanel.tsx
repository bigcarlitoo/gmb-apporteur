'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';

interface Document {
  libelle: string;
  nom: string;
  type: string;
  taille: string;
  data?: string;
  encodage?: string;
}

interface DevisDocumentsPanelProps {
  devisId: string;
  idTarif: string;
  compagnie: string;
  brokerId: string;
  clientInfo: any;
  pretData: any;
  onClose?: () => void;
}

// Types de documents disponibles avec patterns de matching
const DOCUMENT_TYPES = [
  { id: 'devis', label: 'Devis', icon: 'ri-file-text-line', description: 'Document de synthèse du devis', patterns: ['devis'] },
  { id: 'fiche_standardisee', label: 'Fiche standardisée', icon: 'ri-file-list-3-line', description: 'Informations réglementaires', patterns: ['fiche standardis', 'fiche_standardis'] },
  { id: 'conditions_generales', label: 'Conditions Générales', icon: 'ri-book-2-line', description: 'CGV du contrat', patterns: ['conditions g', 'notice'] },
  { id: 'demande_adhesion', label: 'Demande d\'adhésion', icon: 'ri-edit-line', description: 'Formulaire à remplir', patterns: ['demande d\'adh', 'demande adh', 'adhesion'] },
  { id: 'questionnaire_sante', label: 'Questionnaire de santé', icon: 'ri-heart-pulse-line', description: 'Questionnaire médical simplifié', patterns: ['questionnaire', 'santé', 'sante'] },
  { id: 'aeras', label: 'Documentation AERAS', icon: 'ri-information-line', description: 'Convention AERAS', patterns: ['aeras', 'aéras'] },
];

export function DevisDocumentsPanel({
  devisId,
  idTarif,
  compagnie,
  brokerId,
  clientInfo,
  pretData,
  onClose
}: DevisDocumentsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set(['devis'])); // Devis sélectionné par défaut
  const [loadedDocs, setLoadedDocs] = useState(false);

  // Charger les documents depuis l'API
  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/exade/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: brokerId,
          clientInfo,
          pretData,
          idTarif
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setLoadedDocs(true);

    } catch (err) {
      console.error('Erreur chargement documents:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Télécharger un document
  const downloadDocument = (doc: Document) => {
    if (!doc.data) {
      alert('Ce document n\'est pas disponible');
      return;
    }

    // Décoder le base64 et créer un blob
    const byteCharacters = atob(doc.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    // Créer un lien de téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.nom || `${doc.libelle}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Matcher un document avec les sélections
  const matchDocumentToSelection = (doc: Document): string | null => {
    const docLabel = doc.libelle?.toLowerCase() || '';
    
    for (const docType of DOCUMENT_TYPES) {
      if (selectedDocs.has(docType.id)) {
        // Vérifier si le libellé du document match un des patterns
        const matches = docType.patterns.some(pattern => docLabel.includes(pattern.toLowerCase()));
        if (matches) {
          return docType.id;
        }
      }
    }
    return null;
  };

  // Télécharger tous les documents sélectionnés
  const downloadSelected = async () => {
    if (!loadedDocs) {
      await loadDocuments();
      // Attendre que les documents soient chargés
      return;
    }

    // Filtrer les documents qui matchent les sélections
    const selectedDocuments = documents.filter(doc => matchDocumentToSelection(doc) !== null);

    console.log('[DevisDocuments] Documents sélectionnés:', selectedDocs);
    console.log('[DevisDocuments] Documents disponibles:', documents.map(d => d.libelle));
    console.log('[DevisDocuments] Documents à télécharger:', selectedDocuments.map(d => d.libelle));

    if (selectedDocuments.length === 0) {
      alert('Aucun document correspondant à votre sélection n\'est disponible pour ce tarif.');
      return;
    }

    // Télécharger chaque document sélectionné
    for (const doc of selectedDocuments) {
      downloadDocument(doc);
      // Petit délai entre chaque téléchargement pour éviter les problèmes
      await new Promise(r => setTimeout(r, 600));
    }
  };

  // Toggle sélection d'un document
  const toggleDocSelection = (docId: string) => {
    const newSelection = new Set(selectedDocs);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    setSelectedDocs(newSelection);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* En-tête */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="ri-file-download-line text-blue-600 dark:text-blue-400"></i>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Documents du devis
            </h4>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {compagnie}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            <i className="ri-error-warning-line mr-2"></i>
            {error}
          </div>
        )}

        {/* Sélection des documents */}
        <div className="space-y-2 mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Sélectionnez les documents à télécharger :
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DOCUMENT_TYPES.map(docType => (
              <label
                key={docType.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedDocs.has(docType.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDocs.has(docType.id)}
                  onChange={() => toggleDocSelection(docType.id)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <i className={`${docType.icon} text-gray-500 dark:text-gray-400`}></i>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {docType.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {docType.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Documents chargés */}
        {loadedDocs && documents.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <i className="ri-check-line"></i>
              <span>{documents.length} document(s) disponible(s)</span>
            </div>
            <div className="mt-2 space-y-1">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{doc.libelle}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{Math.round(parseInt(doc.taille || '0') / 1024)} Ko</span>
                    <button
                      onClick={() => downloadDocument(doc)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <i className="ri-download-line"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2">
          {!loadedDocs ? (
            <button
              onClick={loadDocuments}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Chargement...
                </>
              ) : (
                <>
                  <i className="ri-refresh-line"></i>
                  Charger les documents
                </>
              )}
            </button>
          ) : (
            <button
              onClick={downloadSelected}
              disabled={isLoading || selectedDocs.size === 0}
              className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <i className="ri-download-line"></i>
              Télécharger ({selectedDocs.size})
            </button>
          )}
        </div>

        {/* Note */}
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          <i className="ri-information-line mr-1"></i>
          Les documents sont générés par l'assureur. Disponibilité variable selon le tarif.
        </p>
      </div>
    </div>
  );
}

// Composant bouton simplifié pour les cards
export function DevisDocumentsButton({
  idTarif,
  compagnie,
  brokerId,
  clientInfo,
  pretData,
  size = 'sm'
}: {
  idTarif: string;
  compagnie: string;
  brokerId: string;
  clientInfo: any;
  pretData: any;
  size?: 'sm' | 'md';
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadDevis = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/exade/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_id: brokerId,
          clientInfo,
          pretData,
          idTarif
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data = await response.json();
      const documents = data.documents || [];

      // Trouver le document "Devis"
      const devisDoc = documents.find((d: Document) => 
        d.libelle?.toLowerCase().includes('devis')
      );

      if (devisDoc && devisDoc.data) {
        // Télécharger le PDF
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
        link.download = devisDoc.nom || `Devis_${compagnie}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert('Le devis PDF n\'est pas disponible pour ce tarif');
      }

    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors du téléchargement');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-sm';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDownloadDevis();
      }}
      disabled={isLoading}
      className={`${sizeClasses} bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50`}
      title="Télécharger le devis PDF"
    >
      {isLoading ? (
        <i className="ri-loader-4-line animate-spin"></i>
      ) : (
        <i className="ri-file-pdf-line"></i>
      )}
      <span>PDF</span>
    </button>
  );
}

