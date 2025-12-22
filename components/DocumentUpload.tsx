
'use client';

import { useState, useRef } from 'react';

type DossierType = 'seul' | 'couple';

interface DocumentsInfo {
  offrePret: File | null;
  tableauAmortissement: File | null;
  carteIdentite: File | null;
  carteIdentiteConjoint?: File | null;
}

interface DocumentUploadProps {
  dossierType: DossierType;
  documents: DocumentsInfo;
  onDocumentsUpdate: (documents: DocumentsInfo) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  commentaire?: string;
  onCommentaireChange?: (commentaire: string) => void;
  submitButtonText?: string;
}

export default function DocumentUpload({ 
  dossierType, 
  documents, 
  onDocumentsUpdate, 
  onBack, 
  onSubmit, 
  isSubmitting,
  commentaire = '',
  onCommentaireChange,
  submitButtonText = "Soumettre le dossier"
}: DocumentUploadProps) {
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  
  const fileInputRefs = {
    offrePret: useRef<HTMLInputElement>(null),
    tableauAmortissement: useRef<HTMLInputElement>(null),
    carteIdentite: useRef<HTMLInputElement>(null),
    carteIdentiteConjoint: useRef<HTMLInputElement>(null)
  };

  // Documents obligatoires selon le type
  const requiredDocuments = [
    {
      key: 'offrePret',
      title: 'Offre de Prêt',
      description: 'Document officiel de la banque avec les conditions du prêt',
      icon: 'ri-file-text-line',
      accept: '.pdf,.jpg,.jpeg,.png',
      required: true
    },
    {
      key: 'tableauAmortissement',
      title: "Tableau d'Amortissement",
      description: 'Détail des échéances et du capital restant dû',
      icon: 'ri-table-line',
      accept: '.pdf,.jpg,.jpeg,.png,.xlsx,.xls',
      required: true
    },
    {
      key: 'carteIdentite',
      title: "Carte d'Identité (Emprunteur)",
      description: 'Pièce d\'identité valide recto-verso',
      icon: 'ri-id-card-line',
      accept: '.pdf,.jpg,.jpeg,.png',
      required: true
    },
    ...(dossierType === 'couple' ? [{
      key: 'carteIdentiteConjoint',
      title: "Carte d'Identité (Conjoint)",
      description: 'Pièce d\'identité du co-emprunteur recto-verso',
      icon: 'ri-id-card-line',
      accept: '.pdf,.jpg,.jpeg,.png',
      required: true
    }] : [])
  ];

  // Validation des fichiers
  const validateFile = (file: File, documentKey: string): string | null => {
    // Taille maximum : 50MB (configurable via env)
    const maxSize = process.env.NEXT_PUBLIC_MAX_FILE_SIZE ? 
      parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE) : 
      50 * 1024 * 1024; // 50MB par défaut
    
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `Le fichier ne peut pas dépasser ${maxSizeMB}MB`;
    }

    // Types de fichiers acceptés
    const acceptedTypes = requiredDocuments.find(doc => doc.key === documentKey)?.accept || '';
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!acceptedTypes.includes(fileExtension)) {
      return 'Type de fichier non supporté';
    }

    return null;
  };

  // Gestion des fichiers
  const handleFileSelect = (documentKey: string, file: File) => {
    const error = validateFile(file, documentKey);
    
    if (error) {
      setUploadErrors(prev => ({
        ...prev,
        [documentKey]: error
      }));
      return;
    }

    // Supprimer l'erreur s'il y en avait une
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentKey];
      return newErrors;
    });

    // Mettre à jour les documents
    const updatedDocuments = {
      ...documents,
      [documentKey]: file
    };
    
    onDocumentsUpdate(updatedDocuments);
  };

  // Gestion du drag & drop
  const handleDragOver = (e: React.DragEvent, documentKey: string) => {
    e.preventDefault();
    setDraggedOver(documentKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(null);
  };

  const handleDrop = (e: React.DragEvent, documentKey: string) => {
    e.preventDefault();
    setDraggedOver(null);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(documentKey, files[0]);
    }
  };

  // Supprimer un document
  const removeDocument = (documentKey: string) => {
    const updatedDocuments = {
      ...documents,
      [documentKey]: null
    };
    onDocumentsUpdate(updatedDocuments);

    // Supprimer l'erreur s'il y en avait une
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentKey];
      return newErrors;
    });
  };

  // Consulter un document
  const viewDocument = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    
    // Nettoyer l'URL après un délai pour libérer la mémoire
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // Formatage de la taille de fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Tronquer le nom de fichier s'il est trop long
  const truncateFileName = (fileName: string, maxLength: number = 25): string => {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - (extension?.length || 0) - 4) + '...';
    
    return `${truncatedName}.${extension}`;
  };

  // Composant de zone d'upload
  const UploadZone = ({ document }: { document: any }) => {
    const file = documents[document.key as keyof DocumentsInfo];
    const isDragged = draggedOver === document.key;
    const hasError = uploadErrors[document.key];

    return (
      <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 ${
        hasError 
          ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
          : isDragged 
          ? 'border-[#335FAD]/40 dark:border-[#335FAD]/50 bg-[#335FAD]/5 dark:bg-[#335FAD]/20'
          : file 
          ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-[#335FAD]/30 dark:hover:border-[#335FAD]/60 hover:bg-[#335FAD]/5 dark:hover:bg-[#335FAD]/10'
      }`}
      onDragOver={(e) => handleDragOver(e, document.key)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, document.key)}
      >
        {file ? (
          // Fichier uploadé
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-file-check-line text-green-600 dark:text-green-400 text-xl"></i>
            </div>
            
            {/* Nom du fichier avec gestion du débordement */}
            <div className="mb-1">
              <p className="font-medium text-gray-900 dark:text-white text-sm break-words" title={file.name}>
                {truncateFileName(file.name)}
              </p>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{formatFileSize(file.size)}</p>
            
            {/* Actions en ligne avec espacement optimisé */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => viewDocument(file)}
                className="bg-[#335FAD]/10 dark:bg-[#335FAD]/30 hover:bg-[#335FAD]/20 dark:hover:bg-[#335FAD]/50 text-[#335FAD] dark:text-[#335FAD] px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1 whitespace-nowrap"
              >
                <i className="ri-eye-line text-xs"></i>
                <span>Consulter</span>
              </button>
              
              <button
                type="button"
                onClick={() => fileInputRefs[document.key as keyof typeof fileInputRefs].current?.click()}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1 whitespace-nowrap"
              >
                <i className="ri-refresh-line text-xs"></i>
                <span>Remplacer</span>
              </button>
              
              <button
                type="button"
                onClick={() => removeDocument(document.key)}
                className="bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center space-x-1 whitespace-nowrap"
              >
                <i className="ri-delete-bin-line text-xs"></i>
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        ) : (
          // Zone d'upload vide
          <div className="text-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
              hasError 
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <i className={`${document.icon} text-xl ${
                hasError 
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}></i>
            </div>
            
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              {document.title}
              {document.required && <span className="text-red-500 ml-1">*</span>}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{document.description}</p>
            
            <button
              type="button"
              onClick={() => fileInputRefs[document.key as keyof typeof fileInputRefs].current?.click()}
              className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Choisir un fichier
            </button>
            
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
              Ou glissez-déposez votre fichier ici
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Formats acceptés : {document.accept} • Max 10MB
            </p>
          </div>
        )}

        {hasError && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm flex items-center">
              <i className="ri-error-warning-line mr-2"></i>
              {hasError}
            </p>
          </div>
        )}

        {/* Input fichier caché */}
        <input
          ref={fileInputRefs[document.key as keyof typeof fileInputRefs]}
          type="file"
          accept={document.accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileSelect(document.key, file);
            }
          }}
          className="hidden"
        />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white mb-4">
          Documents obligatoires
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Téléchargez les pièces justificatives nécessaires au traitement de votre dossier
        </p>
      </div>

      {/* Zones d'upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {requiredDocuments.map((document) => (
          <UploadZone key={document.key} document={document} />
        ))}
      </div>

      {/* Champ commentaire pour l'apporteur */}
      {onCommentaireChange && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Commentaire pour l'admin (optionnel)
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => onCommentaireChange(e.target.value)}
            placeholder="Ajoutez un commentaire pour l'admin concernant ce dossier..."
            rows={3}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-[#335FAD] focus:border-transparent resize-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center"
        >
          <i className="ri-arrow-left-line mr-2"></i>
          <span>Retour</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line mr-2 animate-spin"></i>
              <span>Traitement...</span>
            </>
          ) : (
            <>
              <i className="ri-send-plane-line mr-2"></i>
              <span>{submitButtonText}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
