'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentUrl?: string | null;
    documentId?: string | null; // Added ID for fetching URL via service
    documentTitle?: string;
    documentType?: string; // e.g., 'application/pdf', 'image/jpeg' or extension
}

export const DocumentViewerModal = ({
    isOpen,
    onClose,
    documentUrl,
    documentId,
    documentTitle = 'Document',
    documentType
}: DocumentViewerModalProps) => {
    const [loading, setLoading] = useState(true);
    const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setFetchedUrl(null);

            const loadDoc = async () => {
                if (documentId) {
                    try {
                        const url = await api.getDocumentViewUrl(documentId);
                        setFetchedUrl(url);
                    } catch (err) {
                        console.error("Failed to fetch document URL", err);
                    } finally {
                        setLoading(false);
                    }
                } else if (documentUrl) {
                    setFetchedUrl(documentUrl);
                    // Simulate generic loading for UX consistency if just URL
                    setTimeout(() => setLoading(false), 500);
                } else {
                    setLoading(false);
                }
            };
            loadDoc();
        }
    }, [isOpen, documentUrl, documentId]);

    const activeUrl = fetchedUrl || documentUrl;

    // Determine if we can preview
    const isPdf = documentType?.includes('pdf') || activeUrl?.endsWith('.pdf');
    const isImage = documentType?.includes('image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(activeUrl || '');

    // Stub behavior
    const isMock = !activeUrl || activeUrl.includes('mock');

    // Ne pas afficher si la modale n'est pas ouverte
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <i className="ri-file-text-line text-gray-600 dark:text-gray-300"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                                {documentTitle}
                            </h2>
                            {documentUrl && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono truncate max-w-[300px]">
                                    {activeUrl?.split('/').pop()}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeUrl && (
                            <a
                                href={activeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-gray-500 hover:text-[#335FAD] dark:text-gray-400 dark:hover:text-[#335FAD] transition-colors"
                                title="Ouvrir dans un nouvel onglet"
                            >
                                <i className="ri-external-link-line text-xl"></i>
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <i className="ri-close-line text-2xl" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900 relative overflow-hidden flex items-center justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#335FAD]"></div>
                            <p className="text-sm text-gray-500">Chargement du document...</p>
                        </div>
                    ) : !activeUrl ? (
                        <div className="text-center p-8 max-w-md">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="ri-file-search-line text-3xl text-gray-400"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Document introuvable</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                L'URL du document n'est pas disponible ou le fichier a été supprimé.
                            </p>
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                                Fermer
                            </button>
                        </div>
                    ) : isImage ? (
                        <img
                            src={activeUrl}
                            alt={documentTitle}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : isPdf ? (
                        <iframe
                            src={`${activeUrl}#toolbar=0`}
                            className="w-full h-full"
                            title={documentTitle}
                        />
                    ) : (
                        <div className="text-center p-8">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="ri-file-download-line text-3xl text-[#335FAD]"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aperçu non disponible</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Ce type de fichier ne peut pas être prévisualisé directement ({documentType || 'Type inconnu'}).
                            </p>
                            <a
                                href={activeUrl}
                                download
                                className="px-6 py-2.5 bg-[#335FAD] text-white rounded-lg hover:bg-[#335FAD]/90 transition-colors inline-flex items-center gap-2"
                            >
                                <i className="ri-download-line"></i>
                                Télécharger le fichier
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
