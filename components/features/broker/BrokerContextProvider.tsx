"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Broker } from '@/types/model';
import { api } from '@/services/api';

interface BrokerContextProps {
    brokers: Broker[];
    currentBroker: Broker | null;
    currentBrokerId: string | null;
    selectBroker: (brokerId: string) => void;
    isLoading: boolean;
}

export const BrokerContext = createContext<BrokerContextProps | undefined>(undefined);

const BROKER_STORAGE_KEY = 'currentBrokerId';

export const BrokerContextProvider = ({ children }: { children: ReactNode }) => {
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [currentBrokerId, setCurrentBrokerId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch brokers on mount
    useEffect(() => {
        const fetchBrokers = async () => {
            try {
                const data = await api.getMyBrokers();
                setBrokers(data);
            } catch (err) {
                console.error("Failed to fetch brokers", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBrokers();
    }, []);

    // Handle selection logic / persistence
    useEffect(() => {
        if (isLoading) return;

        const storedId = localStorage.getItem(BROKER_STORAGE_KEY);

        // 1. Auto-select if only one broker
        if (brokers.length === 1) {
            const singleBroker = brokers[0];
            if (currentBrokerId !== singleBroker.id) {
                selectBroker(singleBroker.id);
            }
        }
        // 2. Load from storage if matches an available broker
        else if (storedId && brokers.find(b => b.id === storedId)) {
            if (currentBrokerId !== storedId) {
                setCurrentBrokerId(storedId);
            }
        }
        // 3. Fallback: If current Id is invalid or null but we have brokers, select first? 
        // (User req: "Si 1 broker -> auto-select". "Si plusieurs -> afficher une sélection". 
        // So if multiple and no valid storage, maybe leave null to force selection or defaulting to first is fine for now but safer to valid storage)

    }, [brokers, isLoading, currentBrokerId]);

    const selectBroker = (brokerId: string) => {
        const broker = brokers.find(b => b.id === brokerId);
        if (broker) {
            setCurrentBrokerId(brokerId);
            localStorage.setItem(BROKER_STORAGE_KEY, brokerId);
        }
    };

    const currentBroker = brokers.find(b => b.id === currentBrokerId) || null;

    return (
        <BrokerContext.Provider value={{ brokers, currentBroker, currentBrokerId, selectBroker, isLoading }}>
            {children}
        </BrokerContext.Provider>
    );
};
