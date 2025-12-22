"use client";

import { useContext } from 'react';
import { BrokerContext } from '@/components/features/broker/BrokerContextProvider';

// Default values for SSR/prerendering when context is not available
const defaultContextValue = {
    brokers: [],
    currentBroker: null,
    currentBrokerId: null,
    selectBroker: () => {},
    isLoading: true,
};

export const useBrokerContext = () => {
    const context = useContext(BrokerContext);
    // During SSR/prerendering, context may be undefined - return defaults
    if (!context) {
        return defaultContextValue;
    }
    return context;
};
