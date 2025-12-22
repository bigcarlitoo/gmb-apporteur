"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useBrokerContext } from '@/hooks/useBrokerContext';
import { WalletSummary } from '@/types/model';
import { formatCurrency } from '@/lib/utils/formatters';

export const WalletSummaryCard = () => {
    const { currentBrokerId } = useBrokerContext();
    const [wallet, setWallet] = useState<WalletSummary | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentBrokerId) {
            loadWallet();
        }
    }, [currentBrokerId]);

    const loadWallet = async () => {
        setLoading(true);
        try {
            const data = await api.getWalletSummary(currentBrokerId!);
            setWallet(data);
        } catch (err) {
            console.error("Failed to load wallet", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
            <div className="flex gap-4">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
        </div>
    );

    if (!currentBrokerId || !wallet) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="ri-wallet-3-line text-gray-400 dark:text-gray-500 text-xl" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {!currentBrokerId ? "Aucun courtier sélectionné" : "Portefeuille non disponible"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {!currentBrokerId ? "Veuillez sélectionner un cabinet." : "Les données financières n'ont pas pu être chargées."}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-[#335FAD] to-[#2a4e8f] rounded-xl text-white p-6 shadow-lg relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <i className="ri-wallet-3-line text-9xl" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-blue-100 font-medium text-sm uppercase tracking-wider mb-1">Solde Disponible</h3>
                    <p className="text-3xl font-bold">{formatCurrency(wallet.balance_available)}</p>

                    <div className="flex items-center gap-4 mt-4">
                        <div className="bg-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                            <span className="text-blue-100 text-xs block">En attente</span>
                            <span className="font-semibold">{formatCurrency(wallet.balance_pending)}</span>
                        </div>
                        <div className="bg-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                            <span className="text-blue-100 text-xs block">Total Généré</span>
                            <span className="font-semibold">{formatCurrency(wallet.total_earnings)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <button className="px-4 py-2 bg-white text-[#335FAD] rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                        <i className="ri-bank-card-line mr-2" />
                        Demander un virement
                    </button>
                    <button className="px-4 py-2 bg-[#335FAD]/50 text-white border border-white/20 rounded-lg font-medium text-sm hover:bg-[#335FAD]/70 transition-colors cursor-pointer whitespace-nowrap">
                        <i className="ri-history-line mr-2" />
                        Historique
                    </button>
                </div>
            </div>
        </div>
    );
};
