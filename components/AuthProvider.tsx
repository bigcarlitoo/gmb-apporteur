
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext<{
  user: any;
  loading: boolean;
}>({
  user: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const publicRoutes = ['/connexion', '/onboarding', '/reset-password'];

  useEffect(() => {
    // TEMPORAIRE : AUTHENTIFICATION DÉSACTIVÉE
    // Pour réactiver l'authentification avec Supabase, décommentez le code ci-dessous
    // et commentez les lignes "TEMPORAIRE" marquées
    
    // ===== DÉBUT DU CODE D'AUTHENTIFICATION À RÉACTIVER =====
    /*
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Vérifier si l'utilisateur a accepté les CGU
        const { data: profile } = await supabase
          .from('apporteur_profiles')
          .select('cgu_accepted_at')
          .eq('user_id', user.id)
          .single();

        if (!profile?.cgu_accepted_at && pathname !== '/onboarding') {
          router.push('/onboarding');
        } else if (profile?.cgu_accepted_at && (pathname === '/connexion' || pathname === '/onboarding')) {
          router.push('/');
        }
      } else if (!publicRoutes.includes(pathname)) {
        router.push('/connexion');
      }

      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          // Vérifier les CGU après connexion
          const { data: profile } = await supabase
            .from('apporteur_profiles')
            .select('cgu_accepted_at')
            .eq('user_id', currentUser.id)
            .single();

          if (!profile?.cgu_accepted_at) {
            router.push('/onboarding');
          } else {
            router.push('/');
          }
        } else if (event === 'SIGNED_OUT') {
          router.push('/connexion');
        }
      }
    );

    return () => subscription.unsubscribe();
    */
    // ===== FIN DU CODE D'AUTHENTIFICATION À RÉACTIVER =====

    // TEMPORAIRE : Mode développement sans authentification
    // Simuler un utilisateur connecté qui a accepté les CGU
    const mockUser = {
      id: 'mock-user-id',
      email: 'test@example.com',
      // Ajoutez d'autres propriétés utilisateur si nécessaire
    };
    
    setUser(mockUser);
    setLoading(false);

    // INSTRUCTIONS POUR RÉACTIVER L'AUTHENTIFICATION :
    // 1. Commentez les lignes "TEMPORAIRE" ci-dessus (lignes mockUser, setUser, setLoading)
    // 2. Décommentez tout le bloc "DÉBUT DU CODE D'AUTHENTIFICATION À RÉACTIVER"
    // 3. Assurez-vous que la table 'apporteur_profiles' existe avec les colonnes :
    //    - user_id (uuid, référence vers auth.users)
    //    - cgu_accepted_at (timestamp, nullable)
    //    - nom, prenom, email, telephone, siret, statut
    // 4. Configurez les RLS (Row Level Security) sur la table apporteur_profiles
    // 5. Testez le flux : inscription -> onboarding -> accueil

  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
