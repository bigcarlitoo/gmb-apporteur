"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    inviteType?: 'apporteur' | 'broker_user';
}

export const InviteModal = ({ isOpen, onClose, inviteType = 'apporteur' }: InviteModalProps) => {
    const { currentBrokerId } = useBrokerContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [config, setConfig] = useState({
        expiresInHours: 168, // 7 days
        maxUses: 1
    });
    const [copied, setCopied] = useState(false);

    // Fonction pour copier le lien avec feedback visuel
    const handleCopyLink = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setGeneratedLink(null);
            setError(null);
            setLoading(false);
            setCopied(false);
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!currentBrokerId) return;

        setLoading(true);
        setError(null);
        setGeneratedLink(null);

        try {
            const invite = await api.createBrokerInvite({
                brokerId: currentBrokerId,
                type: inviteType,
                expiresInHours: config.expiresInHours,
                maxUses: config.maxUses
            });
            setGeneratedLink(invite.link_url || '');
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de la génération du lien.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Inviter un {inviteType === 'apporteur' ? 'Apporteur' : 'Collaborateur'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <i className="ri-close-line text-2xl" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Config Inputs */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Expiration
                        </label>
                        <Select
                            value={String(config.expiresInHours)}
                            onValueChange={(v) => setConfig({ ...config, expiresInHours: Number(v) })}
                            disabled={!!generatedLink}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sélectionnez une durée" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="24">24 heures</SelectItem>
                                <SelectItem value="168">7 jours (Défaut)</SelectItem>
                                <SelectItem value="720">30 jours</SelectItem>
                            </SelectContent>
                        </Select>

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nombre d'utilisations max
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-2 px-3 text-sm focus:border-[#335FAD] focus:ring-[#335FAD]"
                            value={config.maxUses}
                            onChange={e => setConfig({ ...config, maxUses: Number(e.target.value) })}
                            disabled={!!generatedLink}
                        />
                    </div>

                    {/* Feedback Area */}
                    {error && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex gap-3 text-amber-800 dark:text-amber-200 text-sm">
                            <i className="ri-error-warning-line mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {generatedLink && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <p className="text-xs text-green-800 dark:text-green-300 mb-1 font-medium">Lien généré !</p>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={generatedLink}
                                    className="flex-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 text-gray-600"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className={`px-3 py-1 rounded text-xs transition-all duration-200 flex items-center gap-1 ${
                                        copied 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {copied ? (
                                        <>
                                            <i className="ri-check-line" />
                                            Copié !
                                        </>
                                    ) : (
                                        'Copier'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 text-sm">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !!generatedLink}
                        className="flex items-center gap-2 px-4 py-2 bg-[#335FAD] text-white rounded-lg hover:bg-[#2a4e8f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading && <i className="ri-loader-4-line animate-spin" />}
                        {generatedLink ? 'Généré' : 'Générer le lien'}
                    </button>
                </div>
            </div>
        </div>
    );
};
