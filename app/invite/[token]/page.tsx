'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';

type InviteState = 'loading' | 'valid' | 'invalid' | 'expired' | 'consumed' | 'error' | 'success';

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const token = params.token as string;

    const [state, setState] = useState<InviteState>('loading');
    const [error, setError] = useState<string | null>(null);
    const [inviteInfo, setInviteInfo] = useState<{
        broker_id?: string;
        broker_name?: string;
        owner_name?: string;
        invite_type?: string;
        expires_at?: string;
    } | null>(null);
    const [consuming, setConsuming] = useState(false);

    // Valider le token au chargement
    useEffect(() => {
        if (!token) {
            setState('invalid');
            return;
        }

        const validateToken = async () => {
            try {
                // Décoder le token car il peut être URL-encodé (ex: = devient %3D)
                const decodedToken = decodeURIComponent(token);
                const result = await api.validateBrokerInvite(decodedToken);

                if (result.is_valid) {
                    setState('valid');
                    setInviteInfo({
                        broker_id: result.broker_id,
                        broker_name: result.broker_name,
                        owner_name: result.owner_name,
                        invite_type: result.invite_type,
                        expires_at: result.expires_at
                    });
                } else {
                    // Déterminer le type d'erreur
                    if (result.reason?.includes('expired')) {
                        setState('expired');
                    } else if (result.reason?.includes('maximum uses') || result.reason?.includes('revoked')) {
                        setState('consumed');
                    } else {
                        setState('invalid');
                    }
                    setError(result.reason || 'Token invalide');
                }
            } catch (err) {
                console.error('Error validating invite:', err);
                setState('error');
                setError('Une erreur est survenue lors de la validation');
            }
        };

        validateToken();
    }, [token]);

    // Handler pour accepter l'invitation
    const handleAcceptInvite = async () => {
        // Décoder le token car il peut être URL-encodé
        const decodedToken = decodeURIComponent(token);
        
        if (!user) {
            // Rediriger vers la connexion avec le token en query param
            // Le token est passé directement pour que /connexion puisse valider et consommer
            router.push(`/connexion?invite=${encodeURIComponent(decodedToken)}`);
            return;
        }

        setConsuming(true);
        setError(null);

        try {
            const result = await api.consumeBrokerInvite(decodedToken);

            if (result.success) {
                setState('success');
                // Rediriger vers l'accueil après 2 secondes
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            } else {
                setError(result.error || 'Erreur lors de l\'acceptation');
                setState('error');
            }
        } catch (err) {
            console.error('Error consuming invite:', err);
            setError('Une erreur est survenue');
            setState('error');
        } finally {
            setConsuming(false);
        }
    };

    // Loading state
    if (state === 'loading' || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#335FAD] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Vérification de l'invitation...</p>
                </div>
            </div>
        );
    }

    // Success state
    if (state === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-check-line text-3xl text-green-600 dark:text-green-400"></i>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                        Invitation acceptée !
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Vous avez été rattaché au cabinet avec succès.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                        Redirection vers l'accueil...
                    </p>
                </div>
            </div>
        );
    }

    // Valid state - show accept button
    if (state === 'valid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="ri-mail-open-line text-3xl text-[#335FAD]"></i>
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                            Invitation valide
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Vous avez été invité à rejoindre le cabinet{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {inviteInfo?.broker_name || 'un cabinet'}
                            </span>
                            {inviteInfo?.owner_name && (
                                <>
                                    {' '}de{' '}
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {inviteInfo.owner_name}
                                    </span>
                                </>
                            )}
                            {' '}en tant qu'
                            <span className="font-medium text-[#335FAD]">
                                {inviteInfo?.invite_type === 'apporteur' ? 'apporteur d\'affaires' : 'collaborateur'}
                            </span>.
                        </p>

                        {!user && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-6">
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    <i className="ri-information-line mr-2"></i>
                                    Vous devez vous connecter ou créer un compte pour accepter cette invitation.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleAcceptInvite}
                            disabled={consuming}
                            className="w-full px-6 py-3 bg-[#335FAD] text-white rounded-lg font-medium hover:bg-[#2a4e8f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {consuming ? (
                                <>
                                    <i className="ri-loader-4-line animate-spin"></i>
                                    Acceptation en cours...
                                </>
                            ) : user ? (
                                <>
                                    <i className="ri-check-line"></i>
                                    Accepter l'invitation
                                </>
                            ) : (
                                <>
                                    <i className="ri-login-box-line"></i>
                                    Se connecter pour accepter
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Error states (invalid, expired, consumed, error)
    const errorConfig = {
        invalid: {
            icon: 'ri-close-circle-line',
            iconBg: 'bg-red-100 dark:bg-red-900/20',
            iconColor: 'text-red-600 dark:text-red-400',
            title: 'Invitation invalide',
            description: 'Ce lien d\'invitation n\'est pas valide ou n\'existe pas.'
        },
        expired: {
            icon: 'ri-time-line',
            iconBg: 'bg-orange-100 dark:bg-orange-900/20',
            iconColor: 'text-orange-600 dark:text-orange-400',
            title: 'Invitation expirée',
            description: 'Ce lien d\'invitation a expiré. Demandez un nouveau lien au courtier.'
        },
        consumed: {
            icon: 'ri-checkbox-circle-line',
            iconBg: 'bg-gray-100 dark:bg-gray-700',
            iconColor: 'text-gray-600 dark:text-gray-400',
            title: 'Invitation déjà utilisée',
            description: 'Ce lien d\'invitation a atteint son nombre maximum d\'utilisations.'
        },
        error: {
            icon: 'ri-error-warning-line',
            iconBg: 'bg-red-100 dark:bg-red-900/20',
            iconColor: 'text-red-600 dark:text-red-400',
            title: 'Erreur',
            description: error || 'Une erreur est survenue lors de la validation de l\'invitation.'
        }
    };

    const config = errorConfig[state as keyof typeof errorConfig] || errorConfig.error;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <div className={`w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <i className={`${config.icon} text-3xl ${config.iconColor}`}></i>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    {config.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {config.description}
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    Retour à l'accueil
                </button>
            </div>
        </div>
    );
}









