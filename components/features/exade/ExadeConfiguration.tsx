"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useBrokerContext } from '@/hooks/useBrokerContext';

interface ExadeConfigState {
    codeCourtier: string;
    licenceKey: string;
    ssoKey: string;
    soapUrl: string;
    isEnabled: boolean;
}

export const ExadeConfiguration = () => {
    const { currentBrokerId } = useBrokerContext();
    const [loading, setLoading] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ status: 'success' | 'error', message: string } | null>(null);
    const [showSecrets, setShowSecrets] = useState(false);
    const [emailCopied, setEmailCopied] = useState(false);

    // Configuration State - TOUTES les clés Exade
    const [config, setConfig] = useState<ExadeConfigState>({
        codeCourtier: '',
        licenceKey: '',
        ssoKey: '',
        soapUrl: 'https://www.exade.fr/4DSOAP',  // URL par défaut
        isEnabled: false
    });

    // Load existing config on mount
    useEffect(() => {
        const loadConfig = async () => {
            if (!currentBrokerId) {
                setLoadingConfig(false);
                return;
            }

            try {
                const existingConfig = await api.getExadeConfig(currentBrokerId);
                if (existingConfig) {
                    setConfig({
                        codeCourtier: existingConfig.code_courtier || '',
                        licenceKey: existingConfig.licence_key || '',
                        ssoKey: existingConfig.sso_key || '',
                        soapUrl: existingConfig.soap_url || 'https://www.exade.fr/4DSOAP',
                        isEnabled: existingConfig.is_enabled ?? false
                    });
                }
            } catch (err) {
                console.error('Error loading Exade config:', err);
            } finally {
                setLoadingConfig(false);
            }
        };

        loadConfig();
    }, [currentBrokerId]);

    const handleTestConnection = async () => {
        if (!currentBrokerId) return;
        
        // Validation des champs obligatoires
        if (!config.codeCourtier.trim() || !config.licenceKey.trim()) {
            setError("Le code courtier et la clé de licence sont obligatoires pour tester la connexion.");
            return;
        }
        
        setLoading(true);
        setTestResult(null);
        setError(null);
        setSuccess(null);

        try {
            await api.testExadeConnection(currentBrokerId, {
                code_courtier: config.codeCourtier,
                licence_key: config.licenceKey,
                soap_url: config.soapUrl
            });
            
            setTestResult({ 
                status: 'success', 
                message: 'Connexion réussie !' 
            });
        } catch (err: any) {
            setTestResult({ 
                status: 'error', 
                message: err.message || "Échec de la connexion. Vérifiez vos identifiants." 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentBrokerId) return;
        
        // Validation
        if (config.isEnabled && (!config.codeCourtier.trim() || !config.licenceKey.trim())) {
            setError("Pour activer l'intégration, le code courtier et la clé de licence sont obligatoires.");
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            await api.saveExadeConfig(currentBrokerId, {
                code_courtier: config.codeCourtier,
                licence_key: config.licenceKey,
                sso_key: config.ssoKey,
                soap_url: config.soapUrl,
                is_enabled: config.isEnabled
            });
            setSuccess("Configuration Exade enregistrée avec succès !");
        } catch (err: any) {
            setError(err.message || "Erreur lors de la sauvegarde.");
        } finally {
            setLoading(false);
        }
    };

    // Email de demande professionnel
    const handleGenerateEmail = () => {
        const subject = encodeURIComponent("Demande d'accès au WebService Exade - Tarificateur Assurance Emprunteur");
        const body = encodeURIComponent(`Madame, Monsieur,

Je suis courtier en assurance et je souhaite intégrer le WebService Exade (Tarificateur Assurance de Prêt) dans mon application de gestion de dossiers clients.

═══════════════════════════════════════════════════════
INFORMATIONS SUR MON CABINET
═══════════════════════════════════════════════════════

• Nom du cabinet : [À COMPLÉTER]
• Numéro ORIAS : [À COMPLÉTER]
• SIRET : [À COMPLÉTER]
• Adresse : [À COMPLÉTER]
• Email professionnel : [À COMPLÉTER]
• Téléphone : [À COMPLÉTER]

═══════════════════════════════════════════════════════
INFORMATIONS TECHNIQUES
═══════════════════════════════════════════════════════

• Environnement souhaité : PRODUCTION
• Type d'intégration : WebService SOAP

═══════════════════════════════════════════════════════
ÉLÉMENTS DEMANDÉS
═══════════════════════════════════════════════════════

Pour configurer notre connecteur, nous avons besoin de :

1. EXADE_PARTNER_CODE (Code courtier)
   → Identifiant unique de notre cabinet chez Exade

2. EXADE_LICENCE_KEY (Clé de licence WebService) ⚠️ OBLIGATOIRE
   → Clé d'authentification pour accéder à l'API
   → Format attendu : chaîne de caractères avec caractères spéciaux

3. EXADE_SOAP_URL (URL du WebService)
   → URL de l'API de production
   → Format : https://www.exade.fr/4DSOAP (ou autre si personnalisé)

4. EXADE_SSO_KEY (Clé SSO) - Optionnel
   → Pour l'authentification automatique des utilisateurs sur le portail Exade

═══════════════════════════════════════════════════════
CONTEXTE D'UTILISATION
═══════════════════════════════════════════════════════

Notre application permettra à nos apporteurs d'affaires de :
- Soumettre des dossiers d'assurance emprunteur
- Générer automatiquement des devis multi-compagnies
- Suivre l'avancement des dossiers

Volume estimé : [À COMPLÉTER] dossiers/mois

═══════════════════════════════════════════════════════

Je reste disponible pour tout complément d'information et vous remercie par avance pour votre retour rapide.

Cordialement,

[Votre nom]
[Votre fonction]
[Nom du cabinet]
[Téléphone]
[Email]`);

        window.open(`mailto:info@multi-impact.com?subject=${subject}&body=${body}`);
    };

    const copyEmailTemplate = () => {
        const template = `DEMANDE D'ACCÈS WEBSERVICE EXADE

Bonjour,

Je suis courtier en assurance et je souhaite intégrer le WebService Exade dans mon application.

CABINET : [Nom]
ORIAS : [Numéro]

Merci de me fournir :
✓ EXADE_PARTNER_CODE - Code courtier
✓ EXADE_LICENCE_KEY - Clé de licence (OBLIGATOIRE)
✓ EXADE_SOAP_URL - URL du WebService
✓ EXADE_SSO_KEY - Clé SSO (optionnel)

Environnement : PRODUCTION

Cordialement,
[Signature]`;
        
        navigator.clipboard.writeText(template);
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
    };

    // Validation visuelle des champs
    const isConfigComplete = config.codeCourtier.trim() && config.licenceKey.trim();

    return (
        <div className="space-y-6">
            {/* Carte principale de configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <i className="ri-settings-5-line mr-2 text-[#335FAD]" />
                                Configuration Exade
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Tarificateur Assurance de Prêt Multi-Impact
                            </p>
                        </div>
                        {isConfigComplete && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                                <i className="ri-check-line mr-1" />
                                Configuré
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {loadingConfig ? (
                        <div className="flex items-center justify-center py-12">
                            <i className="ri-loader-4-line animate-spin text-3xl text-gray-400" />
                        </div>
                    ) : (
                    <>
                    {/* Statut de configuration */}
                    {!isConfigComplete && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <i className="ri-error-warning-line text-amber-600 dark:text-amber-400 text-xl mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                        Configuration incomplète
                                    </h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                        Vous devez entrer votre <strong>code courtier</strong> et votre <strong>clé de licence</strong> pour utiliser le tarificateur Exade.
                                        Cliquez sur "Demander mes accès" si vous ne les avez pas encore.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Formulaire de configuration */}
                    <div className="space-y-6">
                        {/* Code Courtier */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Code Courtier <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={config.codeCourtier}
                                onChange={e => setConfig({ ...config, codeCourtier: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD]"
                                placeholder="Ex: 815178"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Votre identifiant unique chez Exade/Multi-Impact
                            </p>
                        </div>

                        {/* Clé de Licence */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Clé de Licence WebService <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showSecrets ? "text" : "password"}
                                    value={config.licenceKey}
                                    onChange={e => setConfig({ ...config, licenceKey: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 pr-10 focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] font-mono"
                                    placeholder="Ex: GMB#7ùuQefujig8fu1+rulyXa)it"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSecrets(!showSecrets)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    <i className={showSecrets ? "ri-eye-off-line" : "ri-eye-line"} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Clé d'authentification fournie par Multi-Impact
                            </p>
                        </div>

                        {/* URL WebService */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                URL du WebService
                            </label>
                            <input
                                type="text"
                                value={config.soapUrl}
                                onChange={e => setConfig({ ...config, soapUrl: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] font-mono"
                                placeholder="https://www.exade.fr/4DSOAP"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                URL de l'API Exade (généralement https://www.exade.fr/4DSOAP)
                            </p>
                        </div>

                        {/* Clé SSO (optionnelle) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Clé SSO <span className="text-gray-400 font-normal">(optionnel)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showSecrets ? "text" : "password"}
                                    value={config.ssoKey}
                                    onChange={e => setConfig({ ...config, ssoKey: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm p-3 pr-12 focus:ring-2 focus:ring-[#335FAD] focus:border-[#335FAD] font-mono"
                                    placeholder="Ex: GMB#SSO83udYpo))voywà5èviw)G"
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
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Pour l'authentification automatique sur le portail Exade
                            </p>
                        </div>

                        {/* Activation */}
                        <div className="flex items-center gap-3 pt-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <input
                                type="checkbox"
                                id="enable-exade"
                                checked={config.isEnabled}
                                onChange={e => setConfig({ ...config, isEnabled: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-300 text-[#335FAD] focus:ring-[#335FAD]"
                            />
                            <label htmlFor="enable-exade" className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                Activer l'intégration Exade pour ce cabinet
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                        <button
                            onClick={handleTestConnection}
                            disabled={loading || !isConfigComplete}
                            className="px-4 py-3 border-2 border-[#335FAD] text-[#335FAD] rounded-lg hover:bg-[#335FAD]/10 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <i className="ri-loader-4-line animate-spin" />
                            ) : (
                                <i className="ri-plug-line" />
                            )}
                            Tester la connexion
                        </button>
                        
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-3 bg-[#335FAD] text-white rounded-lg hover:bg-[#2a4e8f] font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        >
                            {loading && <i className="ri-loader-4-line animate-spin" />}
                            <i className="ri-save-line" />
                            Enregistrer
                        </button>
                    </div>

                    {/* Messages de feedback */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm flex gap-3 items-start">
                            <i className="ri-error-warning-fill text-lg mt-0.5" />
                            <div>{error}</div>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm flex gap-3 items-center">
                            <i className="ri-checkbox-circle-fill text-lg" />
                            {success}
                        </div>
                    )}

                    {testResult && (
                        <div className={`p-4 rounded-lg text-sm flex gap-3 items-start border ${
                            testResult.status === 'success' 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        }`}>
                            <i className={`text-lg mt-0.5 ${testResult.status === 'success' ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill'}`} />
                            <div>{testResult.message}</div>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </div>

            {/* Carte de demande d'accès */}
            <div className="bg-gradient-to-br from-[#335FAD] to-[#2a4e8f] rounded-xl border border-[#335FAD] shadow-lg overflow-hidden text-white">
                <div className="p-6">
                    <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                        <i className="ri-mail-send-line" />
                        Vous n'avez pas encore vos accès ?
                    </h3>
                    <p className="text-sm text-white/80 mb-4">
                        Envoyez une demande à Multi-Impact pour obtenir vos identifiants Exade.
                        Notre équipe vous répondra sous 24-48h ouvrées.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            onClick={handleGenerateEmail}
                            className="px-4 py-3 bg-white text-[#335FAD] rounded-lg hover:bg-gray-100 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <i className="ri-mail-line" />
                            Ouvrir l'email de demande
                        </button>
                        
                        <button
                            onClick={copyEmailTemplate}
                            className={`px-4 py-3 border rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                                emailCopied 
                                    ? 'bg-green-500/20 text-green-200 border-green-400/50' 
                                    : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                            }`}
                        >
                            <i className={emailCopied ? "ri-check-line" : "ri-file-copy-line"} />
                            {emailCopied ? 'Copié !' : 'Copier le modèle'}
                        </button>
                    </div>
                </div>
                
                <div className="px-6 py-4 bg-black/10 border-t border-white/10">
                    <p className="text-xs text-white/70">
                        <i className="ri-information-line mr-1" />
                        <strong>Contact direct :</strong> info@multi-impact.com • Tél : 01 XX XX XX XX
                    </p>
                </div>
            </div>

            {/* Guide */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="ri-question-line text-[#335FAD]" />
                    À quoi servent ces identifiants ?
                </h3>
                
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-[#335FAD]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-[#335FAD] font-bold text-sm">1</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Code Courtier</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Identifie votre cabinet auprès d'Exade. C'est votre "numéro de compte".</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-[#335FAD]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-[#335FAD] font-bold text-sm">2</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Clé de Licence</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Mot de passe secret pour accéder à l'API. Ne la partagez jamais.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 font-bold text-sm">3</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">URL WebService</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">L'adresse technique de l'API. Rarement besoin de la modifier.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 font-bold text-sm">4</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Clé SSO (optionnel)</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Permet la connexion automatique au portail Exade si besoin.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
