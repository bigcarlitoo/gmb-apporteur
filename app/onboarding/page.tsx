'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

// Vérifier si on est en dev
const isDev = process.env.NODE_ENV === 'development';

function OnboardingContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const forceShow = isDev && searchParams.get('force') === 'true';

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

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/connexion');
        return;
      }
      setUser(user);

      // Vérifier si les CGU ont déjà été acceptées
      const { data: profile } = await supabase
        .from('apporteur_profiles')
        .select('cgu_accepted_at')
        .eq('user_id', user.id)
        .single();

      // Rediriger si déjà accepté (sauf si force=true en dev)
      if (profile?.cgu_accepted_at && !forceShow) {
        router.push('/');
      }
    };

    getUser();
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

  const handleAcceptCGU = async () => {
    if (!cguAccepted) {
      setError('Vous devez accepter les Conditions Générales d\'Utilisation pour continuer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('apporteur_profiles')
        .update({
          cgu_accepted_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      router.push('/');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isInitialized) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-gray-900 dark:text-white mb-4">
              <span className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">Bienvenue</span> sur votre plateforme
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Finalisation de votre compte apporteur
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full flex items-center justify-center">
                  <i className="ri-check-line text-green-600 dark:text-green-400 text-sm"></i>
                </div>
                <span className="ml-3 text-sm font-medium text-green-600 dark:text-green-400">Compte créé</span>
              </div>
              
              <div className="w-16 h-px bg-gray-200 dark:bg-gray-600"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border-2 border-[#335FAD] dark:border-[#335FAD]/80 rounded-full flex items-center justify-center">
                  <span className="text-[#335FAD] dark:text-[#335FAD]/80 font-bold text-sm">2</span>
                </div>
                <span className="ml-3 text-sm font-medium text-[#335FAD] dark:text-[#335FAD]/80">CGU</span>
              </div>
              
              <div className="w-16 h-px bg-gray-200 dark:bg-gray-600"></div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500 font-bold text-sm">3</span>
                </div>
                <span className="ml-3 text-sm text-gray-400 dark:text-gray-500">Accès</span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-[#335FAD]/5 to-[#335FAD]/5 dark:from-[#335FAD]/20 dark:to-[#335FAD]/20 rounded-2xl p-6 border border-[#335FAD]/20 dark:border-[#335FAD]/30 mb-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="ri-shield-check-line text-[#335FAD] dark:text-[#335FAD]/80 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Acceptation des Conditions Générales
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Pour accéder à votre espace apporteur, vous devez accepter nos Conditions Générales d'Utilisation qui définissent le cadre de notre partenariat.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
              <div className="flex items-center">
                <i className="ri-error-warning-line text-red-600 dark:text-red-400 mr-3"></i>
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* CGU Content */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-6 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <i className="ri-file-text-line mr-3 text-[#335FAD] dark:text-[#335FAD]/80"></i>
              Conditions Générales d'Utilisation
            </h3>
            
            <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">1</span>
                  Objet et Définitions
                </h4>
                <p className="mb-3">
                  Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme 
                  de mise en relation développée par GMB Courtage pour l'assurance emprunteur.
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <p className="font-medium text-gray-900 dark:text-white mb-2">Définitions :</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong>Apporteur :</strong> Professionnel utilisateur de la plateforme</li>
                    <li><strong>Plateforme :</strong> Solution digitale de GMB Courtage</li>
                    <li><strong>Client :</strong> Personne pour laquelle un dossier est constitué</li>
                  </ul>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">2</span>
                  Rôle de la Plateforme
                </h4>
                <p>
                  La plateforme constitue un outil de transmission et de suivi des dossiers d'assurance emprunteur. 
                  GMB Courtage agit en qualité d'intermédiaire et n'est pas l'assureur final.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">3</span>
                  Gestion du Compte
                </h4>
                <p>
                  L'Apporteur est seul responsable de la sécurité de ses identifiants de connexion et de 
                  l'utilisation de son compte. Toute utilisation du compte engage sa responsabilité.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-red-600 dark:text-red-400 font-bold">!</span>
                  Responsabilités de l'Apporteur (Important)
                </h4>
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
                    <p className="font-medium text-red-800 dark:text-red-400 mb-2">4.1 Exactitude des données :</p>
                    <p>L'Apporteur garantit l'exactitude et la véracité de toutes les informations transmises via la plateforme.</p>
                  </div>
                  
                  <div className="bg-[#335FAD]/5 dark:bg-[#335FAD]/20 rounded-lg p-4 border border-[#335FAD]/20 dark:border-[#335FAD]/70">
                    <p className="font-medium text-[#335FAD] dark:text-[#335FAD] mb-2">4.2 Consentement du Client (RGPD) :</p>
                    <p>L'Apporteur certifie avoir obtenu l'accord explicite de son client pour le partage et le traitement de ses données personnelles.</p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <p className="font-medium text-green-800 dark:text-green-400 mb-2">4.3 Conformité Professionnelle :</p>
                    <p className="mb-2">L'Apporteur certifie être en règle avec l'ensemble de ses obligations légales et réglementaires :</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Immatriculation ORIAS en cours de validité</li>
                      <li>Assurance Responsabilité Civile Professionnelle</li>
                      <li>Formation réglementaire à jour</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">5</span>
                  Engagements de GMB Courtage
                </h4>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <p className="mb-2">GMB Courtage s'engage à :</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Assurer la disponibilité et la sécurité de la plateforme</li>
                    <li>Protéger les données conformément au RGPD</li>
                    <li>Traiter les dossiers avec diligence</li>
                    <li>Informer l'Apporteur du suivi de ses dossiers</li>
                  </ul>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">6</span>
                  Propriété Intellectuelle
                </h4>
                <p>
                  La plateforme et tous ses éléments demeurent la propriété exclusive de GMB Courtage. 
                  Les données clients transmises restent la propriété de l'Apporteur.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-yellow-600 dark:text-yellow-400 font-bold">7</span>
                  Limitation de Responsabilité
                </h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                  <p className="mb-2">GMB Courtage ne saurait être tenu responsable :</p>
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Des erreurs de saisie commises par l'Apporteur</li>
                    <li>Des décisions de refus ou d'acceptation des assureurs</li>
                    <li>De l'inexactitude des informations fournies par l'Apporteur</li>
                    <li>Du non-respect par l'Apporteur de ses obligations réglementaires</li>
                  </ul>
                </div>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">8</span>
                  Durée et Fin du Contrat
                </h4>
                <p>
                  Le présent contrat est conclu pour une durée indéterminée. Chaque partie peut y mettre fin 
                  à tout moment moyennant un préavis de 30 jours par lettre recommandée avec accusé de réception.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">9</span>
                  Loi Applicable et Juridictions
                </h4>
                <p>
                  Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux de 
                  Paris seront seuls compétents.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mr-3 text-xs text-[#335FAD] dark:text-[#335FAD]/80 font-bold">10</span>
                  Modifications
                </h4>
                <p className="text-gray-700 dark:text-gray-300">
                  GMB Courtage se réserve le droit de modifier les présentes CGU à tout moment. 
                  L'Apporteur sera informé par email de toute modification.
                </p>
              </section>
            </div>
          </div>

          {/* Checkbox Agreement */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-[#335FAD]/20 dark:border-[#335FAD]/30 mb-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                <input
                  id="cgu-acceptance"
                  type="checkbox"
                  checked={cguAccepted}
                  onChange={(e) => setCguAccepted(e.target.checked)}
                  className="w-5 h-5 text-[#335FAD] focus:ring-[#335FAD]

00 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="cgu-acceptance" className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed cursor-pointer">
                  <strong>Je déclare avoir lu et accepter les Conditions Générales d'Utilisation</strong> de GMB Courtage. 
                  Je certifie être en règle avec mes obligations professionnelles et avoir obtenu le 
                  consentement de mes clients pour le traitement de leurs données.
                </label>
                
                <div className="mt-3 flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <i className="ri-shield-check-line mr-2 text-green-500"></i>
                    <span>Conformité RGPD</span>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-award-line mr-2 text-[#335FAD]"></i>
                    <span>Certification ORIAS</span>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-secure-payment-line mr-2 text-purple-500"></i>
                    <span>RC Professionnelle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 border border-gray-200 dark:border-gray-600 whitespace-nowrap"
            >
              <i className="ri-logout-box-line"></i>
              <span>Annuler</span>
            </button>
            
            <button
              onClick={handleAcceptCGU}
              disabled={!cguAccepted || loading}
              className="w-full sm:w-auto bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-8 py-3 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Activation en cours...</span>
                </>
              ) : (
                <>
                  <span>Activer mon compte</span>
                <i className="ri-arrow-right-line"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  </div>
);
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
