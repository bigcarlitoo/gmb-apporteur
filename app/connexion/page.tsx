
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

type UserType = 'courtier' | 'apporteur' | null;

// Wrapper component to handle useSearchParams with Suspense
function ConnexionContent() {
  // Mode selection
  const [userType, setUserType] = useState<UserType>(null);
  const [isLogin, setIsLogin] = useState(true);
  
  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  
  // Courtier-specific fields
  const [nomCabinet, setNomCabinet] = useState('');
  const [numeroOrias, setNumeroOrias] = useState('');
  const [numeroSiret, setNumeroSiret] = useState('');
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check for invite token in URL
  const inviteToken = searchParams.get('invite');
  const redirectPath = searchParams.get('redirect');

  // Auto-select apporteur mode if coming from invite link
  useEffect(() => {
    if (inviteToken || redirectPath?.includes('/invite/')) {
      setUserType('apporteur');
    }
  }, [inviteToken, redirectPath]);

  useEffect(() => {
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

      // If there's a redirect path (e.g., from invite), go there first
      if (redirectPath) {
        router.push(redirectPath);
        return;
      }

      // Check if user is a broker_user
      const { data: brokerUser } = await supabase
        .from('broker_users')
        .select('id')
        .eq('user_id', data.user.id)
        .single();

      if (brokerUser) {
        // User is a courtier, redirect to admin
        router.push('/admin');
        return;
      }

      // Check if user is an apporteur
      const { data: profile } = await supabase
        .from('apporteur_profiles')
        .select('cgu_accepted_at')
        .eq('user_id', data.user.id)
        .single();

      if (profile && !profile.cgu_accepted_at) {
        router.push('/onboarding');
      } else if (profile?.cgu_accepted_at) {
        router.push('/');
      } else {
        // User exists but has no profile - edge case
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

  const handleSignupCourtier = async (e: React.FormEvent) => {
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

    if (!nomCabinet.trim()) {
      setError('Le nom du cabinet est obligatoire');
      setLoading(false);
      return;
    }

    if (!numeroOrias.trim()) {
      setError('Le numéro ORIAS est obligatoire');
      setLoading(false);
      return;
    }

    try {
      // 1. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            prenom,
            telephone,
            user_type: 'courtier',
            numero_orias: numeroOrias,
            numero_siret: numeroSiret,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 2. Create broker via RPC (this also creates broker_users link and wallet)
      const { data: brokerResult, error: brokerError } = await supabase.rpc('create_broker_for_current_user', {
        p_broker_name: nomCabinet,
        p_orias_number: numeroOrias,
        p_siret_number: numeroSiret || null
      });

      if (brokerError) {
        console.error('Error creating broker:', brokerError);
        // Even if broker creation fails, user is created - they can retry later
        throw new Error('Compte créé mais erreur lors de la création du cabinet. Contactez le support.');
      }

      // 3. Redirect to admin onboarding
      router.push('/admin/onboarding');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupApporteur = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Apporteur MUST have an invite token
    const tokenToUse = inviteToken || (redirectPath?.includes('/invite/') ? redirectPath.split('/invite/')[1] : null);
    
    if (!tokenToUse) {
      setError('Vous devez avoir reçu un lien d\'invitation de votre courtier pour créer un compte apporteur.');
      setLoading(false);
      return;
    }

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
      // 1. Validate invite first
      const validation = await api.validateBrokerInvite(tokenToUse);
      if (!validation.is_valid) {
        throw new Error(validation.reason || 'Lien d\'invitation invalide ou expiré');
      }

      // 2. Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            prenom,
            telephone,
            user_type: 'apporteur'
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 3. Create apporteur profile
      const { error: profileError } = await supabase
        .from('apporteur_profiles')
        .insert({
          user_id: authData.user.id,
          nom,
          prenom,
          email,
          telephone,
          statut: 'actif'
        });

      if (profileError) throw profileError;

      // 4. Consume the invite to link apporteur to broker
      const consumeResult = await api.consumeBrokerInvite(tokenToUse);
      if (!consumeResult.success) {
        console.error('Failed to consume invite:', consumeResult.error);
        // Profile created but not linked - they'll need to use invite link again
      }

      // 5. Redirect to onboarding (CGU)
      router.push('/onboarding');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // User type selection screen
  if (!userType && !isLogin) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <Header darkMode={darkMode} onToggleDarkMode={handleDarkModeToggle} />
        
        <div className="bg-white dark:bg-gray-800">
          <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4">
                <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">Créer</span> votre compte
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Choisissez votre type de compte
              </p>
            </div>
          </div>
        </div>

        <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Courtier Card */}
            <button
              onClick={() => setUserType('courtier')}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-gray-200 dark:border-gray-700 p-8 text-left hover:border-[#335FAD] dark:hover:border-[#335FAD] transition-all group"
            >
              <div className="w-16 h-16 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#335FAD]/20 transition-colors">
                <i className="ri-building-2-line text-[#335FAD] text-3xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Je suis Courtier
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Créez votre cabinet de courtage et gérez vos apporteurs d'affaires.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center">
                  <i className="ri-check-line text-green-500 mr-2"></i>
                  Gestion des dossiers clients
                </li>
                <li className="flex items-center">
                  <i className="ri-check-line text-green-500 mr-2"></i>
                  Intégration API Exade
                </li>
                <li className="flex items-center">
                  <i className="ri-check-line text-green-500 mr-2"></i>
                  Inviter des apporteurs
                </li>
              </ul>
              <div className="mt-6 flex items-center text-[#335FAD] font-medium">
                <span>Créer mon cabinet</span>
                <i className="ri-arrow-right-line ml-2"></i>
              </div>
            </button>

            {/* Apporteur Card */}
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 p-8 text-left transition-all ${
                inviteToken || redirectPath?.includes('/invite/')
                  ? 'border-[#335FAD] dark:border-[#335FAD]'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-6">
                <i className="ri-user-star-line text-emerald-600 dark:text-emerald-400 text-3xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Je suis Apporteur
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Envoyez des dossiers à votre courtier et suivez vos commissions.
              </p>
              
              {inviteToken || redirectPath?.includes('/invite/') ? (
                <>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 mb-4">
                    <div className="flex items-center text-green-700 dark:text-green-400 text-sm">
                      <i className="ri-checkbox-circle-line mr-2"></i>
                      <span>Invitation détectée</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setUserType('apporteur')}
                    className="w-full mt-2 flex items-center justify-center text-[#335FAD] font-medium bg-[#335FAD]/10 hover:bg-[#335FAD]/20 py-3 rounded-xl transition-colors"
                  >
                    <span>Créer mon compte apporteur</span>
                    <i className="ri-arrow-right-line ml-2"></i>
                  </button>
                </>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                  <div className="flex items-start">
                    <i className="ri-information-line text-amber-600 dark:text-amber-400 mr-3 mt-0.5"></i>
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <p className="font-medium mb-1">Invitation requise</p>
                      <p>Pour créer un compte apporteur, vous devez avoir reçu un lien d'invitation de votre courtier.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back to login */}
          <div className="text-center mt-8">
            <button
              onClick={() => setIsLogin(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Déjà un compte ? Se connecter
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <Header darkMode={darkMode} onToggleDarkMode={handleDarkModeToggle} />

      <div className="bg-white dark:bg-gray-800">
        <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4">
              <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">
                {isLogin ? 'Accédez' : userType === 'courtier' ? 'Créez votre cabinet' : 'Rejoignez'}
              </span> {isLogin ? 'à votre espace' : userType === 'courtier' ? 'de courtage' : 'votre courtier'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {isLogin 
                ? 'Connectez-vous à votre compte' 
                : userType === 'courtier' 
                  ? 'Renseignez les informations de votre cabinet'
                  : 'Créez votre compte apporteur'
              }
            </p>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          
          {!showResetForm ? (
            <>
              {/* Tab Switcher - Only show for login mode or when userType is selected */}
              {(isLogin || userType) && (
                <div className="flex justify-center mb-8">
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); setUserType(null); }}
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
              )}

              {/* User type indicator for signup */}
              {!isLogin && userType && (
                <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 ${
                      userType === 'courtier' 
                        ? 'bg-[#335FAD]/10 dark:bg-[#335FAD]/20' 
                        : 'bg-emerald-100 dark:bg-emerald-900/20'
                    }`}>
                      <i className={`text-xl ${
                        userType === 'courtier' 
                          ? 'ri-building-2-line text-[#335FAD]' 
                          : 'ri-user-star-line text-emerald-600 dark:text-emerald-400'
                      }`}></i>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {userType === 'courtier' ? 'Compte Courtier' : 'Compte Apporteur'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {userType === 'courtier' ? 'Créez votre cabinet' : 'Rejoignez un cabinet'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Changer
                  </button>
                </div>
              )}

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
              <form 
                onSubmit={isLogin ? handleLogin : userType === 'courtier' ? handleSignupCourtier : handleSignupApporteur} 
                className="space-y-6"
              >
                {/* Signup fields */}
                {!isLogin && (
                  <>
                    {/* Courtier-specific: Cabinet info */}
                    {userType === 'courtier' && (
                      <div className="space-y-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          <i className="ri-building-2-line mr-2 text-[#335FAD]"></i>
                          Informations du cabinet
                        </h3>
                        
                        <div>
                          <label htmlFor="nomCabinet" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nom du cabinet *
                          </label>
                          <input
                            id="nomCabinet"
                            type="text"
                            required
                            value={nomCabinet}
                            onChange={(e) => setNomCabinet(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                            placeholder="Ex: Cabinet Dupont Courtage"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="numeroOrias" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Numéro ORIAS *
                            </label>
                            <input
                              id="numeroOrias"
                              type="text"
                              required
                              value={numeroOrias}
                              onChange={(e) => setNumeroOrias(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                              placeholder="Ex: 12345678"
                            />
                          </div>
                          <div>
                            <label htmlFor="numeroSiret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Numéro SIRET
                            </label>
                            <input
                              id="numeroSiret"
                              type="text"
                              value={numeroSiret}
                              onChange={(e) => setNumeroSiret(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                              placeholder="Ex: 12345678901234"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Personal info */}
                    <div className="space-y-4">
                      {userType === 'courtier' && (
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                          <i className="ri-user-line mr-2 text-[#335FAD]"></i>
                          Vos informations
                        </h3>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="nom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nom *
                          </label>
                          <input
                            id="nom"
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
                            type="tel"
                            required
                            value={telephone}
                            onChange={(e) => setTelephone(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] dark:focus:ring-[#335FAD]/80 focus:border-transparent text-sm transition-colors"
                            placeholder="06 12 34 56 78"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Email */}
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

                {/* Password */}
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

                {/* Confirm password for signup */}
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

                {/* Forgot password link */}
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

                {/* Info boxes */}
                {!isLogin && userType === 'courtier' && (
                  <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/10 rounded-xl p-4 border border-[#335FAD]/20 dark:border-[#335FAD]/30">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-shield-check-line text-[#335FAD] dark:text-[#335FAD]/80 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-sm text-[#335FAD] dark:text-[#335FAD]/80 font-medium mb-1">
                          Création de cabinet sécurisée
                        </p>
                        <p className="text-xs text-[#335FAD] dark:text-[#335FAD]/80">
                          Votre numéro ORIAS sera vérifié. Après inscription, vous pourrez configurer votre intégration Exade.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isLogin && userType === 'apporteur' && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-user-star-line text-emerald-600 dark:text-emerald-400 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-1">
                          Compte apporteur
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Vous serez automatiquement rattaché au cabinet qui vous a invité. Après inscription, vous devrez accepter les CGU.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
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
                        <i className={`${isLogin ? 'ri-login-box-line' : userType === 'courtier' ? 'ri-building-2-line' : 'ri-user-add-line'}`}></i>
                        <span>
                          {isLogin 
                            ? 'Se connecter' 
                            : userType === 'courtier' 
                              ? 'Créer mon cabinet' 
                              : 'Créer mon compte'
                          }
                        </span>
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

// Header component extracted for reuse
function Header({ darkMode, onToggleDarkMode }: { darkMode: boolean; onToggleDarkMode: () => void }) {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
      <div className="px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center">
              <i className="ri-handshake-line text-[#335FAD] dark:text-[#335FAD]/80 text-lg sm:text-xl"></i>
            </div>
            <div>
              <h1 className="font-['Pacifico'] text-lg sm:text-xl text-gray-900 dark:text-white">GMB Courtage</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-normal">Plateforme Courtiers & Apporteurs</p>
            </div>
          </div>

          <button 
            onClick={onToggleDarkMode}
            className="w-10 h-10 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className={`${darkMode ? 'ri-sun-line' : 'ri-moon-line'} text-gray-600 dark:text-gray-300 text-sm`}></i>
          </button>
        </div>
      </div>
    </header>
  );
}

// Main page component with Suspense boundary
export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD]"></div>
      </div>
    }>
      <ConnexionContent />
    </Suspense>
  );
}
