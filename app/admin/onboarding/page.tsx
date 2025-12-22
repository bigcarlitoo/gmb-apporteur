'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';

// Vérifier si on est en dev
const isDev = process.env.NODE_ENV === 'development';

type OnboardingStep = 'welcome' | 'exade' | 'invite' | 'complete';

export default function AdminOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceShow = isDev && searchParams.get('force') === 'true';
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Broker info
  const [brokerInfo, setBrokerInfo] = useState<{
    id: string;
    name: string;
    onboarding_status: string;
  } | null>(null);

  // Exade config state - TOUS les champs nécessaires
  const [exadeConfig, setExadeConfig] = useState({
    codeCourtier: '',
    licenceKey: '',
    ssoKey: '',
    soapUrl: 'https://www.exade.fr/4DSOAP',
    isEnabled: false
  });

  const [showSecrets, setShowSecrets] = useState(false);

  // Initialize
  useEffect(() => {
    const init = async () => {
      // Dark mode
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      setDarkMode(savedDarkMode);
      if (savedDarkMode) {
        document.documentElement.classList.add('dark');
      }

      // Check auth and load broker
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/connexion');
        return;
      }

      // Get user's broker
      const brokers = await api.getMyBrokers();
      if (brokers.length === 0) {
        router.push('/connexion');
        return;
      }

      const broker = brokers[0];
      setBrokerInfo({
        id: broker.id,
        name: broker.name,
        onboarding_status: broker.onboarding_status
      });

      // If already onboarded, redirect to admin (sauf si force=true en dev)
      if (broker.onboarding_status === 'ready' && !forceShow) {
        router.push('/admin');
        return;
      }

      // Load existing Exade config if any
      const existingConfig = await api.getExadeConfig(broker.id);
      if (existingConfig) {
        setExadeConfig({
          codeCourtier: existingConfig.code_courtier || '',
          licenceKey: existingConfig.licence_key || '',
          ssoKey: existingConfig.sso_key || '',
          soapUrl: existingConfig.soap_url || 'https://www.exade.fr/4DSOAP',
          isEnabled: existingConfig.is_enabled ?? false
        });
      }

      setLoading(false);
    };

    init();
  }, [router]);

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const handleSaveExadeConfig = async () => {
    if (!brokerInfo) return;
    
    // Validation si activé
    if (exadeConfig.isEnabled && (!exadeConfig.codeCourtier.trim() || !exadeConfig.licenceKey.trim())) {
      setError('Le code courtier et la clé de licence sont obligatoires pour activer l\'intégration.');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.saveExadeConfig(brokerInfo.id, {
        code_courtier: exadeConfig.codeCourtier,
        licence_key: exadeConfig.licenceKey,
        sso_key: exadeConfig.ssoKey,
        soap_url: exadeConfig.soapUrl,
        is_enabled: exadeConfig.isEnabled
      });

      // Update onboarding status
      await supabase.rpc('update_broker_onboarding_status', {
        p_broker_id: brokerInfo.id,
        p_status: exadeConfig.isEnabled ? 'ready' : 'exade_pending'
      });

      setSuccess('Configuration Exade enregistrée !');
      
      // Move to next step after brief delay
      setTimeout(() => {
        setCurrentStep('invite');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipExade = () => {
    setCurrentStep('invite');
  };

  const handleFinishOnboarding = async () => {
    if (!brokerInfo) return;
    setSaving(true);

    try {
      // Mark onboarding as complete
      await supabase.rpc('update_broker_onboarding_status', {
        p_broker_id: brokerInfo.id,
        p_status: 'ready'
      });

      setCurrentStep('complete');
      
      // Redirect to admin after animation
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      console.error('Error finishing onboarding:', err);
      router.push('/admin');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateEmail = () => {
    const subject = encodeURIComponent("Demande d'accès au WebService Exade - Tarificateur Assurance Emprunteur");
    const body = encodeURIComponent(`Madame, Monsieur,

Je suis courtier en assurance et je souhaite intégrer le WebService Exade (Tarificateur Assurance de Prêt) dans mon application de gestion de dossiers clients.

═══════════════════════════════════════════════════════
INFORMATIONS SUR MON CABINET
═══════════════════════════════════════════════════════

• Nom du cabinet : ${brokerInfo?.name || '[À COMPLÉTER]'}
• Numéro ORIAS : [À COMPLÉTER]
• SIRET : [À COMPLÉTER]
• Adresse : [À COMPLÉTER]
• Email professionnel : [À COMPLÉTER]
• Téléphone : [À COMPLÉTER]

═══════════════════════════════════════════════════════
ÉLÉMENTS DEMANDÉS
═══════════════════════════════════════════════════════

Pour configurer notre connecteur, nous avons besoin de :

1. Code courtier (EXADE_PARTNER_CODE)
   → Identifiant unique de notre cabinet chez Exade

2. Clé de licence WebService (EXADE_LICENCE_KEY) ⚠️ OBLIGATOIRE
   → Clé d'authentification pour accéder à l'API

3. URL du WebService (EXADE_SOAP_URL)
   → URL de l'API de production

4. Clé SSO (EXADE_SSO_KEY) - Optionnel
   → Pour l'authentification automatique sur le portail

═══════════════════════════════════════════════════════

Je reste disponible pour tout complément d'information.

Cordialement,

[Votre nom]
${brokerInfo?.name || '[Nom du cabinet]'}`);

    window.open(`mailto:info@multi-impact.com?subject=${subject}&body=${body}`);
  };

  const copyEmailTemplate = () => {
    const template = `DEMANDE D'ACCÈS WEBSERVICE EXADE

Bonjour,

Je suis courtier et je souhaite intégrer le WebService Exade.

CABINET : ${brokerInfo?.name || '[Nom]'}
ORIAS : [Numéro]

Merci de me fournir :
✓ Code courtier (EXADE_PARTNER_CODE)
✓ Clé de licence (EXADE_LICENCE_KEY) - OBLIGATOIRE
✓ URL du WebService (EXADE_SOAP_URL)
✓ Clé SSO (optionnel)

Environnement : PRODUCTION

Cordialement,
[Signature]`;
    
    navigator.clipboard.writeText(template);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  // Validation visuelle
  const isConfigComplete = exadeConfig.codeCourtier.trim() && exadeConfig.licenceKey.trim();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 border border-[#335FAD]/20 dark:border-[#335FAD]/30 rounded-xl flex items-center justify-center">
                <i className="ri-building-2-line text-[#335FAD] dark:text-[#335FAD]/80 text-lg sm:text-xl"></i>
              </div>
              <div>
                <h1 className="font-semibold text-lg sm:text-xl text-gray-900 dark:text-white">{brokerInfo?.name}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Configuration de votre cabinet</p>
              </div>
            </div>

            <button 
              onClick={handleDarkModeToggle}
              className="w-10 h-10 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center transition-colors"
            >
              <i className={`${darkMode ? 'ri-sun-line' : 'ri-moon-line'} text-gray-600 dark:text-gray-300 text-sm`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex items-center justify-center space-x-4">
            {/* Step 1: Welcome */}
            <div className={`flex items-center ${currentStep === 'welcome' ? 'text-[#335FAD]' : 'text-green-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'welcome' 
                  ? 'border-[#335FAD] bg-[#335FAD]/10' 
                  : 'border-green-500 bg-green-500 text-white'
              }`}>
                {currentStep === 'welcome' ? (
                  <span className="text-sm font-medium">1</span>
                ) : (
                  <i className="ri-check-line text-sm"></i>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Bienvenue</span>
            </div>

            <div className="w-12 h-px bg-gray-200 dark:bg-gray-700"></div>

            {/* Step 2: Exade */}
            <div className={`flex items-center ${currentStep === 'exade' ? 'text-[#335FAD]' : currentStep === 'invite' || currentStep === 'complete' ? 'text-green-500' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'exade' 
                  ? 'border-[#335FAD] bg-[#335FAD]/10' 
                  : currentStep === 'invite' || currentStep === 'complete'
                    ? 'border-green-500 bg-green-500 text-white' 
                    : 'border-gray-300'
              }`}>
                {currentStep === 'invite' || currentStep === 'complete' ? (
                  <i className="ri-check-line text-sm"></i>
                ) : (
                  <span className="text-sm font-medium">2</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Exade</span>
            </div>

            <div className="w-12 h-px bg-gray-200 dark:bg-gray-700"></div>

            {/* Step 3: Invite */}
            <div className={`flex items-center ${currentStep === 'invite' ? 'text-[#335FAD]' : currentStep === 'complete' ? 'text-green-500' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep === 'invite' 
                  ? 'border-[#335FAD] bg-[#335FAD]/10' 
                  : currentStep === 'complete'
                    ? 'border-green-500 bg-green-500 text-white' 
                    : 'border-gray-300'
              }`}>
                {currentStep === 'complete' ? (
                  <i className="ri-check-line text-sm"></i>
                ) : (
                  <span className="text-sm font-medium">3</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Apporteurs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-20 h-20 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="ri-rocket-2-line text-[#335FAD] text-4xl"></i>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Bienvenue sur votre espace courtier !
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
              Votre cabinet <strong className="text-gray-900 dark:text-white">{brokerInfo?.name}</strong> a été créé avec succès. 
              Configurons maintenant votre espace de travail.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <i className="ri-settings-5-line text-[#335FAD] text-2xl mb-2"></i>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Configuration Exade</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connectez votre compte tarificateur</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <i className="ri-user-add-line text-emerald-500 text-2xl mb-2"></i>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Inviter des apporteurs</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Développez votre réseau</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <i className="ri-folder-add-line text-purple-500 text-2xl mb-2"></i>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">Gérer les dossiers</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Traitez les demandes clients</p>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('exade')}
              className="px-8 py-3 bg-[#335FAD] text-white rounded-xl font-medium hover:bg-[#2a4e8f] transition-colors"
            >
              Commencer la configuration
              <i className="ri-arrow-right-line ml-2"></i>
            </button>
          </div>
        )}

        {/* Exade Configuration Step */}
        {currentStep === 'exade' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <i className="ri-settings-5-line mr-3 text-[#335FAD]"></i>
                  Configuration Exade
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Connectez votre compte Exade pour générer automatiquement des devis d'assurance emprunteur.
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Info si pas de compte */}
                {!isConfigComplete && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <i className="ri-error-warning-line text-amber-600 dark:text-amber-400 mt-0.5"></i>
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">Vous n'avez pas encore vos accès ?</h4>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          Utilisez les boutons ci-dessous pour contacter Multi-Impact et obtenir vos identifiants Exade.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <div className="space-y-4">
                  {/* Code Courtier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Code Courtier <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={exadeConfig.codeCourtier}
                      onChange={(e) => setExadeConfig({ ...exadeConfig, codeCourtier: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] text-sm"
                      placeholder="Ex: 815178"
                    />
                  </div>

                  {/* Licence Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Clé de Licence WebService <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets ? "text" : "password"}
                        value={exadeConfig.licenceKey}
                        onChange={(e) => setExadeConfig({ ...exadeConfig, licenceKey: e.target.value })}
                        className="w-full px-4 py-3 pr-10 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] text-sm font-mono"
                        placeholder="Clé fournie par Multi-Impact"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        <i className={showSecrets ? "ri-eye-off-line" : "ri-eye-line"}></i>
                      </button>
                    </div>
                  </div>

                  {/* URL WebService */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      URL du WebService
                    </label>
                    <input
                      type="text"
                      value={exadeConfig.soapUrl}
                      onChange={(e) => setExadeConfig({ ...exadeConfig, soapUrl: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] text-sm font-mono"
                      placeholder="https://www.exade.fr/4DSOAP"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Généralement pas besoin de modifier (par défaut : https://www.exade.fr/4DSOAP)
                    </p>
                  </div>

                  {/* SSO Key (optionnel) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Clé SSO <span className="text-gray-400 font-normal">(optionnel)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets ? "text" : "password"}
                        value={exadeConfig.ssoKey}
                        onChange={(e) => setExadeConfig({ ...exadeConfig, ssoKey: e.target.value })}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#335FAD] text-sm font-mono"
                        placeholder="Clé SSO (si fournie)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title={showSecrets ? "Masquer" : "Afficher"}
                      >
                        <i className={`ri-${showSecrets ? 'eye-off' : 'eye'}-line text-lg`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Activation */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <input
                    type="checkbox"
                    id="enable-exade"
                    checked={exadeConfig.isEnabled}
                    onChange={(e) => setExadeConfig({ ...exadeConfig, isEnabled: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-[#335FAD] focus:ring-[#335FAD]"
                  />
                  <label htmlFor="enable-exade" className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Activer l'intégration Exade
                  </label>
                </div>

                {/* Error/Success messages */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                    <p className="text-sm text-red-700 dark:text-red-300 flex items-center">
                      <i className="ri-error-warning-line mr-2"></i>
                      {error}
                    </p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center">
                      <i className="ri-checkbox-circle-line mr-2"></i>
                      {success}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateEmail}
                    className="px-4 py-2.5 bg-[#335FAD] text-white rounded-xl hover:bg-[#2a4e8f] font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <i className="ri-mail-send-line"></i>
                    Ouvrir l'email de demande
                  </button>
                  <button
                    onClick={copyEmailTemplate}
                    className={`px-4 py-2.5 border rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                      emailCopied 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <i className={emailCopied ? "ri-check-line" : "ri-file-copy-line"}></i>
                    {emailCopied ? 'Copié !' : 'Copier le modèle'}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSkipExade}
                    className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium text-sm"
                  >
                    Passer cette étape
                  </button>
                  <button
                    onClick={handleSaveExadeConfig}
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#335FAD] text-white rounded-xl hover:bg-[#2a4e8f] font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
                    Enregistrer et continuer
                  </button>
                </div>
              </div>
            </div>

            {/* Guide */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <i className="ri-question-line text-[#335FAD]"></i>
                À quoi servent ces identifiants ?
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-[#335FAD]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[#335FAD] font-bold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Code Courtier</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Identifie votre cabinet chez Exade</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-[#335FAD]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[#335FAD] font-bold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Clé de Licence</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mot de passe API (secret)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite Step */}
        {currentStep === 'invite' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <i className="ri-user-add-line mr-3 text-emerald-500"></i>
                Inviter des apporteurs
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Vous pourrez inviter des apporteurs d'affaires depuis votre tableau de bord.
              </p>
            </div>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-team-line text-emerald-600 dark:text-emerald-400 text-3xl"></i>
              </div>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Prêt à développer votre réseau ?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                Une fois dans votre tableau de bord, vous pourrez générer des liens d'invitation pour vos apporteurs. 
                Chaque apporteur créera son compte via ce lien et sera automatiquement rattaché à votre cabinet.
              </p>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 max-w-sm mx-auto mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#335FAD]/10 dark:bg-[#335FAD]/20 rounded-lg flex items-center justify-center">
                    <i className="ri-link text-[#335FAD]"></i>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Lien d'invitation unique</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sécurisé et traçable</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleFinishOnboarding}
                disabled={saving}
                className="px-8 py-3 bg-[#335FAD] text-white rounded-xl font-medium hover:bg-[#2a4e8f] transition-colors flex items-center gap-2"
              >
                {saving ? <i className="ri-loader-4-line animate-spin"></i> : null}
                Accéder à mon tableau de bord
                <i className="ri-arrow-right-line"></i>
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-check-line text-green-600 dark:text-green-400 text-4xl"></i>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Configuration terminée !
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Redirection vers votre tableau de bord...
            </p>
            
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#335FAD] mx-auto"></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
