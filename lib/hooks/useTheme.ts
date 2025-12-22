/**
 * 🎨 HOOK CUSTOM POUR LA GESTION DU DARK MODE
 * 
 * Ce hook centralise toute la logique de gestion du mode sombre (dark mode).
 * Il gère la persistance via localStorage et la synchronisation avec la classe CSS.
 * 
 * @module lib/hooks/useTheme
 */

'use client';

import { useState, useEffect } from 'react';

interface UseThemeReturn {
  darkMode: boolean;
  isInitialized: boolean;
  toggleDarkMode: (newMode: boolean) => void;
}

/**
 * Hook pour gérer le dark mode de façon centralisée
 * 
 * @returns {UseThemeReturn} État et fonctions du dark mode
 * 
 * @example
 * const { darkMode, isInitialized, toggleDarkMode } = useTheme();
 * 
 * // Pour activer le dark mode
 * toggleDarkMode(true);
 * 
 * // Pour désactiver le dark mode
 * toggleDarkMode(false);
 */
export function useTheme(): UseThemeReturn {
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation : lecture du localStorage et application du mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(savedDarkMode);
      
      // Applique la classe 'dark' au document
      document.documentElement.classList.toggle('dark', savedDarkMode);
      
      setIsInitialized(true);
    }
  }, []);

  /**
   * Toggle le dark mode
   * Synchronise l'état, le localStorage et la classe CSS
   */
  const toggleDarkMode = (newMode: boolean) => {
    setDarkMode(newMode);
    
    if (typeof window !== 'undefined') {
      // Met à jour la classe CSS
      document.documentElement.classList.toggle('dark', newMode);
      
      // Persiste dans localStorage
      localStorage.setItem('darkMode', String(newMode));
    }
  };

  return { darkMode, isInitialized, toggleDarkMode };
}


