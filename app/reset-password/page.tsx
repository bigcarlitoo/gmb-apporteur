
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialiser le mode sombre
    if (typeof window !== 'undefined' && !isInitialized) {
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(savedDarkMode);
      
      if (savedDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    // Vérifier si nous avons les paramètres nécessaires pour la réinitialisation
    const code = searchParams.get('code');
    if (!code) {
      setError('Lien de réinitialisation invalide');
    }
  }, [searchParams]);

  // Gestionnaire du mode sombre
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (typeof window !== 'undefined') {
      if (newDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/connexion');
      }, 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        {/* Header similaire à la page de connexion */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
          <div className="px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center">
                  <i className="ri-handshake-line text-[#335FAD] dark:text-[#335FAD]/80 text-lg sm:text-xl"></i>
                </div>
                <div>
                  <h1 className="font-['Pacifico'] text-lg sm:text-xl text-gray-900 dark:text-white">GMB Courtage</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">Espace Apporteur</p>
                </div>
              </div>

              <button 
                onClick={handleDarkModeToggle}
                className="w-10 h-10 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className={`${darkMode ? 'ri-sun-line' : 'ri-moon-line'} text-gray-600 dark:text-gray-300 text-sm`}></i>
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="bg-white dark:bg-gray-800">
          <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4">
                <span className="font-medium text-green-600 dark:text-green-400">Mot de passe</span> modifié
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Votre mot de passe a été mis à jour avec succès
              </p>
            </div>
          </div>
        </div>

        {/* Success Content */}
        <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-check-line text-3xl text-green-600 dark:text-green-400"></i>
              </div>
              
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
                Mot de passe modifié avec succès
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Votre mot de passe a été mis à jour. Vous allez être redirigé vers la page de connexion dans quelques secondes.
              </p>
              
              <div className="flex items-center justify-center space-x-2 mb-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Redirection en cours...</span>
              </div>

              <button
                onClick={() => router.push('/connexion')}
                className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap shadow-sm hover:shadow-md flex items-center justify-center space-x-2 mx-auto"
              >
                <i className="ri-login-box-line"></i>
                <span>Aller à la connexion</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header similaire à ApporteurHeader */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center">
                <i className="ri-handshake-line text-[#335FAD] dark:text-[#335FAD]/80 text-lg sm:text-xl"></i>
              </div>
              <div>
                <h1 className="font-['Pacifico'] text-lg sm:text-xl text-gray-900 dark:text-white">GMB Courtage</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">Espace Apporteur</p>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={handleDarkModeToggle}
              className="w-10 h-10 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className={`${darkMode ? 'ri-sun-line' : 'ri-moon-line'} text-gray-600 dark:text-gray-300 text-sm`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section similaire à la page principale */}
      <div className="bg-white dark:bg-gray-800">
        <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4">
              <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">Nouveau</span> mot de passe
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Définissez votre nouveau mot de passe sécurisé
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/connexion')}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Retour à la connexion
            </button>
          </div>

          {/* Icon & Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-key-line text-[#335FAD] dark:text-[#335FAD]/80 text-2xl"></i>
            </div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Réinitialiser le mot de passe</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Saisissez votre nouveau mot de passe sécurisé
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
              <div className="flex items-center">
                <i className="ri-error-warning-line text-red-600 dark:text-red-400 mr-3"></i>
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-lock-line text-gray-400 dark:text-gray-500 text-sm"></i>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                  placeholder="Minimum 6 caractères"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le nouveau mot de passe *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <i className="ri-lock-line text-gray-400 dark:text-gray-500 text-sm"></i>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                  placeholder="Confirmez votre mot de passe"
                />
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/10 rounded-xl p-4 border border-[#335FAD]/20 dark:border-[#335FAD]/30">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ri-shield-check-line text-[#335FAD] dark:text-[#335FAD]/80 text-sm"></i>
                </div>
                <div>
                  <p className="text-sm text-[#335FAD] dark:text-[#335FAD]/80 font-medium mb-1">
                    Sécurité du mot de passe
                  </p>
                  <p className="text-xs text-[#335FAD] dark:text-[#335FAD]/80">
                    Utilisez au moins 6 caractères avec une combinaison de lettres, chiffres et symboles
                  </p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Mise à jour...</span>
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    <span>Mettre à jour le mot de passe</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
