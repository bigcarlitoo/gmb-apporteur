
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ConnexionPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [siret, setSiret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const router = useRouter();

  // Existing code from original
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Vérifier si l'utilisateur a accepté les CGU
      const { data: profile, error: profileError } = await supabase
        .from('apporteur_profiles')
        .select('cgu_accepted_at')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile?.cgu_accepted_at) {
        // Rediriger vers l'onboarding si CGU non acceptées
        router.push('/onboarding');
      } else {
        // Rediriger vers la page d'accueil
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message === 'Invalid login credentials' 
        ? 'Email ou mot de passe incorrect' 
        : error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetMessage('Un email de réinitialisation a été envoyé à votre adresse');
      setShowResetForm(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  // End of existing code

  const handleSignup = async (e: React.FormEvent) => {
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            prenom,
            telephone
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Créer le profil apporteur
        const { error: profileError } = await supabase
          .from('apporteur_profiles')
          .insert({
            user_id: data.user.id,
            nom,
            prenom,
            email,
            telephone,
            statut: 'actif'
          });

        if (profileError) throw profileError;

        // Rediriger vers l'onboarding pour accepter les CGU
        router.push('/onboarding');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
              <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">Accédez</span> à votre espace
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Connectez-vous ou créez votre compte apporteur
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          
          {!showResetForm ? (
            <>
              {/* Tab Switcher */}
              <div className="flex justify-center mb-8">
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
                      isLogin 
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow border border-gray-200 dark:border-gray-600' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <i className="ri-login-box-line mr-2"></i>
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className={`px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap ${
                      !isLogin 
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow border border-gray-200 dark:border-gray-600' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <i className="ri-user-add-line mr-2"></i>
                    Inscription
                  </button>
                </div>
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

              {resetMessage && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                  <div className="flex items-center">
                    <i className="ri-check-line text-green-600 dark:text-green-400 mr-3"></i>
                    <p className="text-green-700 dark:text-green-400 text-sm">{resetMessage}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-6">
                {!isLogin && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nom *
                        </label>
                        <input
                          id="nom"
                          name="nom"
                          type="text"
                          required
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                          placeholder="Votre nom"
                        />
                      </div>
                      <div>
                        <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Prénom *
                        </label>
                        <input
                          id="prenom"
                          name="prenom"
                          type="text"
                          required
                          value={prenom}
                          onChange={(e) => setPrenom(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                          placeholder="Votre prénom"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="telephone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Téléphone *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <i className="ri-phone-line text-gray-400 dark:text-gray-500 text-sm"></i>
                        </div>
                        <input
                          id="telephone"
                          name="telephone"
                          type="tel"
                          required
                          value={telephone}
                          onChange={(e) => setTelephone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                          placeholder="06 12 34 56 78"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="ri-mail-line text-gray-400 dark:text-gray-500 text-sm"></i>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="ri-lock-line text-gray-400 dark:text-gray-500 text-sm"></i>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                      placeholder={isLogin ? "Votre mot de passe" : "Minimum 6 caractères"}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirmer le mot de passe *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="ri-lock-line text-gray-400 dark:text-gray-500 text-sm"></i>
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                        placeholder="Confirmez votre mot de passe"
                      />
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-sm text-[#335FAD] dark:text-[#335FAD]/80 hover:text-[#335FAD]/70 dark:hover:text-[#335FAD]/90 transition-colors cursor-pointer"
                    >
                      <i className="ri-key-line mr-1"></i>
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                {/* Info pour inscription */}
                {!isLogin && (
                  <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/10 rounded-xl p-4 border border-[#335FAD]/20 dark:border-[#335FAD]/30">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-information-line text-[#335FAD] dark:text-[#335FAD]/80 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-sm text-[#335FAD] dark:text-[#335FAD]/80 font-medium mb-1">
                          Création de compte apporteur
                        </p>
                        <p className="text-xs text-[#335FAD] dark:text-[#335FAD]/80">
                          Après inscription, vous devrez accepter nos CGU pour accéder à votre espace
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Chargement...</span>
                      </>
                    ) : (
                      <>
                        <i className={`${isLogin ? 'ri-login-box-line' : 'ri-user-add-line'}`}></i>
                        <span>{isLogin ? 'Se connecter' : 'Créer mon compte'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Reset Password Form */}
              <div className="mb-6">
                <button
                  onClick={() => setShowResetForm(false)}
                  className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Retour à la connexion
                </button>
              </div>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="ri-key-line text-[#335FAD] dark:text-[#335FAD]/80 text-2xl"></i>
                </div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Réinitialiser le mot de passe</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Saisissez votre email pour recevoir un lien de réinitialisation
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                  <div className="flex items-center">
                    <i className="ri-error-warning-line text-red-600 dark:text-red-400 mr-3"></i>
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <i className="ri-mail-line text-gray-400 dark:text-gray-500 text-sm"></i>
                    </div>
                    <input
                      id="resetEmail"
                      name="resetEmail"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-mail-send-line"></i>
                      <span>Envoyer le lien de réinitialisation</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
