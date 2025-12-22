'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Mot de passe par défaut pour tous les comptes dev
const DEV_PASSWORD = 'Dev123!';

// Vérifier si on est en environnement de développement
const isDev = process.env.NODE_ENV === 'development';

interface BrokerAccount {
  user_id: string;
  email: string;
  name: string;
  broker_id: string;
  broker_name: string;
  role: string;
  onboarding_status: string;
}

interface ApporteurAccount {
  user_id: string;
  email: string;
  name: string;
  apporteur_profile_id: string;
  broker_name: string | null;
  cgu_accepted: boolean;
}

export default function DevLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userType, setUserType] = useState<'broker' | 'apporteur' | null>(null);
  
  // Comptes depuis la DB
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccount[]>([]);
  const [apporteurAccounts, setApporteurAccounts] = useState<ApporteurAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Formulaire de connexion manuelle
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(DEV_PASSWORD);

  // Formulaire de création de compte test
  const [testAccountType, setTestAccountType] = useState<'broker' | 'apporteur'>('broker');
  const [testEmail, setTestEmail] = useState('');
  const [testNom, setTestNom] = useState('Test');
  const [testPrenom, setTestPrenom] = useState('');
  const [testCabinet, setTestCabinet] = useState('Cabinet Test Dev');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Onglet actif
  const [activeTab, setActiveTab] = useState<'brokers' | 'apporteurs'>('brokers');

  // Actions en cours
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [resettingOnboarding, setResettingOnboarding] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      // Charger les courtiers via la fonction RPC
      const { data: brokerData, error: brokersError } = await supabase
        .rpc('get_dev_broker_accounts');

      if (brokersError) {
        console.error('Erreur chargement courtiers:', brokersError);
      }

      const brokers: BrokerAccount[] = (brokerData || []).map((b: any) => ({
        user_id: b.user_id,
        email: b.email,
        name: b.broker_name,
        broker_id: b.broker_id,
        broker_name: b.broker_name,
        role: b.role,
        onboarding_status: b.onboarding_status
      }));

      // Charger les apporteurs via la fonction RPC
      const { data: apporteurData, error: apporteursError } = await supabase
        .rpc('get_dev_apporteur_accounts');

      if (apporteursError) {
        console.error('Erreur chargement apporteurs:', apporteursError);
      }

      const apporteursList: ApporteurAccount[] = (apporteurData || []).map((ap: any) => ({
        user_id: ap.user_id,
        email: ap.email,
        name: ap.apporteur_name?.trim() || 'Apporteur',
        apporteur_profile_id: ap.apporteur_profile_id,
        broker_name: ap.broker_name,
        cgu_accepted: ap.cgu_accepted
      }));

      setBrokerAccounts(brokers);
      setApporteurAccounts(apporteursList);
    } catch (err) {
      console.error('Erreur chargement comptes:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    checkCurrentUser();
    loadAccounts();
  }, [loadAccounts]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    setUserType(null);
    
    if (user) {
      // Vérifier si c'est un courtier
      const { data: brokerUser } = await supabase
        .from('broker_users')
        .select('id, broker_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (brokerUser) {
        setUserType('broker');
        return;
      }
      
      // Sinon vérifier si c'est un apporteur
      const { data: apporteurProfile } = await supabase
        .from('apporteur_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (apporteurProfile) {
        setUserType('apporteur');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      await checkCurrentUser();
      setSuccess('Connecté avec succès !');
      await loadAccounts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, type: 'broker' | 'apporteur') => {
    setLoading(true);
    setError(null);

    try {
      // Essayer avec le mot de passe par défaut
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: DEV_PASSWORD,
      });

      if (error) {
        // Si échec, proposer de reset le mot de passe
        setEmail(userEmail);
        setPassword(DEV_PASSWORD);
        throw new Error(`Mot de passe incorrect. Utilisez "Reset MdP" pour réinitialiser à "${DEV_PASSWORD}"`);
      }

      await checkCurrentUser();
      setSuccess(`Connecté en tant que ${type === 'broker' ? 'courtier' : 'apporteur'} !`);
      await loadAccounts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userEmail: string, accountName?: string) => {
    setResettingPassword(userEmail);
    setError(null);
    
    try {
      // En dev, on utilise l'API admin pour reset le mot de passe
      const response = await fetch('/api/dev/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, newPassword: DEV_PASSWORD })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du reset');
      }

      const displayName = accountName ? `"${accountName}" (${userEmail})` : userEmail;
      setSuccess(`✅ Mot de passe réinitialisé à "${DEV_PASSWORD}" pour ${displayName}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(`Erreur reset MdP: ${err.message}. Le mot de passe dev est "${DEV_PASSWORD}"`);
    } finally {
      setResettingPassword(null);
    }
  };

  const handleResetOnboarding = async (brokerId: string, brokerName: string) => {
    setResettingOnboarding(brokerId);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('brokers')
        .update({ 
          onboarding_status: 'created',
          onboarding_completed_at: null 
        })
        .eq('id', brokerId);

      if (error) throw error;

      setSuccess(`Onboarding reset pour "${brokerName}" - Vous pouvez maintenant refaire l'onboarding !`);
      await loadAccounts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(`Erreur reset onboarding: ${err.message}`);
    } finally {
      setResettingOnboarding(null);
    }
  };

  const handleResetCGU = async (apporteurId: string, apporteurName: string) => {
    setError(null);
    
    try {
      const { error } = await supabase
        .from('apporteur_profiles')
        .update({ cgu_accepted_at: null })
        .eq('id', apporteurId);

      if (error) throw error;

      setSuccess(`CGU reset pour "${apporteurName}" - L'apporteur devra re-accepter les CGU !`);
      await loadAccounts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(`Erreur reset CGU: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserType(null);
    router.refresh();
  };

  const handleCreateTestAccount = async () => {
    if (!isDev) {
      setError('Création de compte test uniquement disponible en développement');
      return;
    }

    if (!testEmail) {
      setError('Email requis');
      return;
    }

    setCreatingAccount(true);
    setError(null);
    setSuccess(null);

    try {
      // Créer le compte auth avec le mot de passe dev par défaut
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: DEV_PASSWORD,
        options: {
          data: {
            nom: testNom,
            prenom: testPrenom || (testAccountType === 'broker' ? 'Courtier' : 'Apporteur'),
            dev_password: DEV_PASSWORD, // Stocker dans les metadata pour référence
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erreur lors de la création du compte');

      const userId = authData.user.id;

      if (testAccountType === 'broker') {
        // Créer le broker
        const { data: brokerData, error: brokerError } = await supabase
          .from('brokers')
          .insert({
            name: testCabinet,
            billing_email: testEmail,
            status: 'actif',
            onboarding_status: 'created'
          })
          .select()
          .single();

        if (brokerError) throw brokerError;

        // Lier l'utilisateur au broker
        const { error: linkError } = await supabase
          .from('broker_users')
          .insert({
            user_id: userId,
            broker_id: brokerData.id,
            role: 'owner'
          });

        if (linkError) throw linkError;

        // Créer les settings de commission
        await supabase
          .from('broker_commission_settings')
          .insert({
            broker_id: brokerData.id,
            default_apporteur_share_pct: 80,
            default_frais_courtier: 15000
          });

        setSuccess(`✅ Compte courtier créé !\n📧 Email: ${testEmail}\n🔑 Mot de passe: ${DEV_PASSWORD}\n🏢 Cabinet: ${testCabinet}`);

      } else {
        // Récupérer un broker actif pour lier l'apporteur
        const { data: brokers } = await supabase
          .from('brokers')
          .select('id, name')
          .eq('status', 'actif')
          .limit(1);

        if (!brokers || brokers.length === 0) {
          throw new Error('Aucun courtier disponible. Créez d\'abord un compte courtier.');
        }

        const brokerId = brokers[0].id;

        // Créer le profil apporteur
        const { data: apporteurData, error: apporteurError } = await supabase
          .from('apporteur_profiles')
          .insert({
            user_id: userId,
            nom: testNom,
            prenom: testPrenom || 'Apporteur',
            email: testEmail,
            telephone: '0600000000',
            statut: 'actif'
          })
          .select()
          .single();

        if (apporteurError) throw apporteurError;

        // Lier l'apporteur au broker
        const { error: linkError } = await supabase
          .from('broker_apporteurs')
          .insert({
            broker_id: brokerId,
            apporteur_profile_id: apporteurData.id,
            status: 'actif'
          });

        if (linkError) throw linkError;

        setSuccess(`✅ Compte apporteur créé !\n📧 Email: ${testEmail}\n🔑 Mot de passe: ${DEV_PASSWORD}\n🔗 Rattaché à: ${brokers[0].name}`);
      }

      // Mettre à jour l'état utilisateur
      await checkCurrentUser();
      await loadAccounts();

      // Réinitialiser le formulaire
      setTestEmail('');
      setTestPrenom('');

    } catch (err: any) {
      console.error('Erreur création compte:', err);
      setError(err.message || 'Erreur lors de la création du compte');
    } finally {
      setCreatingAccount(false);
    }
  };

  const generateTestEmail = () => {
    const timestamp = Date.now();
    const type = testAccountType === 'broker' ? 'courtier' : 'apporteur';
    setTestEmail(`test.${type}.${timestamp}@dev.local`);
    setTestPrenom(`Test${timestamp.toString().slice(-4)}`);
    setTestCabinet(`Cabinet Test ${timestamp.toString().slice(-4)}`);
  };

  // Vérification de sécurité
  if (!isDev) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <i className="ri-error-warning-line text-red-400 text-4xl"></i>
          </div>
          <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-gray-400">Cette page n'est disponible qu'en environnement de développement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/40 rounded-2xl mb-3">
            <i className="ri-code-box-line text-amber-400 text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold mb-1">🛠️ Dev Login</h1>
          <p className="text-gray-400 text-sm">Switch rapide entre comptes • Mot de passe: <code className="bg-gray-800 px-2 py-0.5 rounded text-amber-400">{DEV_PASSWORD}</code></p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm flex items-start">
              <i className="ri-error-warning-line mr-2 mt-0.5"></i>
              <span className="whitespace-pre-line">{error}</span>
            </p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm flex items-start">
              <i className="ri-check-line mr-2 mt-0.5"></i>
              <span className="whitespace-pre-line">{success}</span>
            </p>
          </div>
        )}

        {/* Current User Status */}
        {currentUser && (
          <div className="mb-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                  <i className="ri-user-line text-emerald-400 text-lg"></i>
                </div>
                <div>
                  <p className="font-medium text-emerald-400 text-sm">Connecté</p>
                  <p className="text-xs text-gray-400">{currentUser.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    userType === 'broker' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : userType === 'apporteur'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {userType === 'broker' ? '🏢 Courtier' : userType === 'apporteur' ? '👤 Apporteur' : '❓ Non assigné'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <a 
                  href={userType === 'broker' ? '/admin' : '/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg transition-colors text-xs font-medium"
                >
                  <i className="ri-external-link-line mr-1"></i>
                  Dashboard
                </a>
                {userType === 'broker' && (
                  <a 
                    href="/admin/onboarding?dev=true&force=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-lg transition-colors text-xs font-medium"
                  >
                    <i className="ri-rocket-2-line mr-1"></i>
                    Onboarding
                  </a>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition-colors text-xs font-medium"
                >
                  <i className="ri-logout-box-line mr-1"></i>
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des comptes */}
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('brokers')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'brokers'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <i className="ri-building-2-line mr-2"></i>
                Courtiers ({brokerAccounts.length})
              </button>
              <button
                onClick={() => setActiveTab('apporteurs')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'apporteurs'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <i className="ri-user-star-line mr-2"></i>
                Apporteurs ({apporteurAccounts.length})
              </button>
            </div>

            {/* Liste */}
            {loadingAccounts ? (
              <div className="text-center py-12">
                <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
                <p className="text-sm text-gray-500 mt-2">Chargement...</p>
              </div>
            ) : activeTab === 'brokers' ? (
              brokerAccounts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="ri-building-2-line text-4xl mb-2 block opacity-50"></i>
                  <p>Aucun courtier trouvé</p>
                  <p className="text-xs mt-1">Créez un compte courtier ci-dessous</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {brokerAccounts.map((account) => (
                    <div
                      key={account.user_id}
                      className="p-3 rounded-xl border bg-slate-900/50 border-slate-700 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <i className="ri-building-2-line text-blue-400"></i>
                            <span className="font-medium text-white text-sm truncate">{account.broker_name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              account.onboarding_status === 'ready' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {account.onboarding_status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{account.email}</p>
                          <p className="text-xs text-gray-500">Rôle: {account.role}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleQuickLogin(account.email, 'broker')}
                            disabled={loading}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            <i className="ri-login-box-line mr-1"></i>
                            Connexion
                          </button>
                          <button
                            onClick={() => handleResetPassword(account.email, account.broker_name)}
                            disabled={resettingPassword === account.email}
                            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {resettingPassword === account.email ? (
                              <i className="ri-loader-4-line animate-spin"></i>
                            ) : (
                              <>
                                <i className="ri-lock-password-line mr-1"></i>
                                Reset MdP
                              </>
                            )}
                          </button>
                          {account.onboarding_status !== 'created' && (
                            <button
                              onClick={() => handleResetOnboarding(account.broker_id, account.broker_name)}
                              disabled={resettingOnboarding === account.broker_id}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                            >
                              {resettingOnboarding === account.broker_id ? (
                                <i className="ri-loader-4-line animate-spin"></i>
                              ) : (
                                <>
                                  <i className="ri-restart-line mr-1"></i>
                                  Reset Onboarding
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              apporteurAccounts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="ri-user-star-line text-4xl mb-2 block opacity-50"></i>
                  <p>Aucun apporteur trouvé</p>
                  <p className="text-xs mt-1">Créez un compte apporteur ci-dessous</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {apporteurAccounts.map((account) => (
                    <div
                      key={account.user_id}
                      className="p-3 rounded-xl border bg-slate-900/50 border-slate-700 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <i className="ri-user-star-line text-emerald-400"></i>
                            <span className="font-medium text-white text-sm truncate">{account.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              account.cgu_accepted 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {account.cgu_accepted ? 'CGU OK' : 'CGU non acceptées'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 truncate">{account.email}</p>
                          {account.broker_name && (
                            <p className="text-xs text-gray-500">Broker: {account.broker_name}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleQuickLogin(account.email, 'apporteur')}
                            disabled={loading}
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            <i className="ri-login-box-line mr-1"></i>
                            Connexion
                          </button>
                          <button
                            onClick={() => handleResetPassword(account.email, account.name)}
                            disabled={resettingPassword === account.email}
                            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-400 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {resettingPassword === account.email ? (
                              <i className="ri-loader-4-line animate-spin"></i>
                            ) : (
                              <>
                                <i className="ri-lock-password-line mr-1"></i>
                                Reset MdP
                              </>
                            )}
                          </button>
                          {account.cgu_accepted && (
                            <button
                              onClick={() => handleResetCGU(account.apporteur_profile_id, account.name)}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg transition-colors text-xs font-medium"
                            >
                              <i className="ri-restart-line mr-1"></i>
                              Reset CGU
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Bouton refresh */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <button
                onClick={loadAccounts}
                disabled={loadingAccounts}
                className="w-full py-2 text-gray-400 hover:text-white text-xs transition-colors"
              >
                <i className={`ri-refresh-line mr-1 ${loadingAccounts ? 'animate-spin' : ''}`}></i>
                Rafraîchir la liste
              </button>
            </div>
          </div>

          {/* Panneau de droite */}
          <div className="space-y-5">
            {/* Connexion manuelle */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-semibold mb-3 flex items-center text-gray-300">
                <i className="ri-login-box-line mr-2 text-purple-400"></i>
                Connexion manuelle
              </h2>

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="email@exemple.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Mot de passe</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? (
                    <><i className="ri-loader-4-line animate-spin mr-2"></i>Connexion...</>
                  ) : (
                    <><i className="ri-login-box-line mr-2"></i>Se connecter</>
                  )}
                </button>
              </form>
            </div>

            {/* Création de compte test */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-semibold mb-3 flex items-center text-gray-300">
                <i className="ri-user-add-line mr-2 text-emerald-400"></i>
                Créer un compte test
              </h2>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTestAccountType('broker')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      testAccountType === 'broker'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                        : 'border-slate-600 text-gray-400 hover:border-slate-500'
                    }`}
                  >
                    <i className="ri-building-2-line mr-1"></i>
                    Courtier
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestAccountType('apporteur')}
                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      testAccountType === 'apporteur'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-600 text-gray-400 hover:border-slate-500'
                    }`}
                  >
                    <i className="ri-user-star-line mr-1"></i>
                    Apporteur
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-400">Email</label>
                    <button
                      type="button"
                      onClick={generateTestEmail}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      <i className="ri-magic-line mr-1"></i>
                      Générer
                    </button>
                  </div>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 text-sm"
                    placeholder="test@dev.local"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Nom</label>
                    <input
                      type="text"
                      value={testNom}
                      onChange={(e) => setTestNom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={testPrenom}
                      onChange={(e) => setTestPrenom(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>

                {testAccountType === 'broker' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Cabinet</label>
                    <input
                      type="text"
                      value={testCabinet}
                      onChange={(e) => setTestCabinet(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                )}

                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-400 flex items-center">
                    <i className="ri-key-line mr-1.5"></i>
                    Mot de passe: <code className="ml-1 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded">{DEV_PASSWORD}</code>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateTestAccount}
                  disabled={creatingAccount || !testEmail}
                  className={`w-full py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                    testAccountType === 'broker'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {creatingAccount ? (
                    <><i className="ri-loader-4-line animate-spin mr-2"></i>Création...</>
                  ) : (
                    <><i className="ri-user-add-line mr-2"></i>Créer {testAccountType === 'broker' ? 'courtier' : 'apporteur'}</>
                  )}
                </button>
              </div>
            </div>

            {/* Liens rapides */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <h2 className="text-sm font-semibold mb-3 flex items-center text-gray-300">
                <i className="ri-links-line mr-2 text-cyan-400"></i>
                Liens rapides
              </h2>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: '/connexion', icon: 'ri-login-circle-line', label: 'Connexion', color: 'text-gray-400' },
                  { href: '/admin', icon: 'ri-building-2-line', label: 'Admin', color: 'text-blue-400' },
                  { href: '/', icon: 'ri-user-star-line', label: 'Apporteur', color: 'text-emerald-400' },
                  { href: '/admin/onboarding?dev=true&force=true', icon: 'ri-rocket-2-line', label: 'Onboarding', color: 'text-purple-400' },
                  { href: '/admin/billing', icon: 'ri-wallet-3-line', label: 'Paiements', color: 'text-amber-400' },
                  { href: '/admin/profil', icon: 'ri-settings-3-line', label: 'Réglages', color: 'text-cyan-400' },
                ].map((link) => (
                  <a 
                    key={link.href}
                    href={link.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-center transition-colors group"
                  >
                    <i className={`${link.icon} text-lg ${link.color} block mb-0.5`}></i>
                    <p className="text-xs text-gray-400 group-hover:text-white">{link.label}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600 text-xs">
          <p>🔒 Page réservée au développement • NODE_ENV = {process.env.NODE_ENV}</p>
        </div>
      </div>
    </div>
  );
}
