
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext<{
  user: any;
  loading: boolean;
  userType: 'courtier' | 'apporteur' | null;
}>({
  user: null,
  loading: true,
  userType: null,
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
  const [userType, setUserType] = useState<'courtier' | 'apporteur' | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Public routes that don't require auth
  const publicRoutes = ['/connexion', '/reset-password'];
  // Routes that are public but have special handling
  const specialRoutes = ['/onboarding', '/admin/onboarding'];
  // Routes that start with /invite are always public
  const isInviteRoute = pathname?.startsWith('/invite/');
  // Dev routes are always public (only exist in development)
  const isDevRoute = pathname?.startsWith('/dev/');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Check if user is a broker_user (courtier)
        const { data: brokerUser } = await supabase
          .from('broker_users')
          .select('id, broker_id, role')
          .eq('user_id', user.id)
          .single();

        if (brokerUser) {
          // User is a courtier
          setUserType('courtier');
          
          // Check broker onboarding status
          const { data: broker } = await supabase
            .from('brokers')
            .select('onboarding_status')
            .eq('id', brokerUser.broker_id)
            .single();

          // Skip redirects for dev routes
          if (isDevRoute) {
            // Stay on dev page
          }
          // If on connexion page, redirect appropriately
          else if (pathname === '/connexion') {
            if (broker?.onboarding_status !== 'ready') {
              router.push('/admin/onboarding');
            } else {
              router.push('/admin');
            }
          }
          // If on apporteur routes, redirect to admin
          else if (pathname === '/' || pathname === '/onboarding' || pathname === '/mes-dossiers' || pathname === '/nouveau-dossier' || pathname === '/activites') {
            router.push('/admin');
          }
        } else {
          // 2. Check if user is an apporteur
          const { data: profile } = await supabase
            .from('apporteur_profiles')
            .select('id, cgu_accepted_at')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            setUserType('apporteur');
            
            // Check if linked to any broker
            const { data: brokerLink } = await supabase
              .from('broker_apporteurs')
              .select('id')
              .eq('apporteur_profile_id', profile.id)
              .limit(1)
              .single();

            // Apporteur without broker link - unusual state, let them use invite link
            if (!brokerLink && !isInviteRoute && pathname !== '/connexion') {
              // They need to accept an invite
              setUser(user);
              setLoading(false);
              return;
            }

            // Skip redirects for dev routes
            if (isDevRoute) {
              // Stay on dev page
            }
            // Si CGU non acceptées, rediriger vers onboarding
            else if (!profile.cgu_accepted_at && pathname !== '/onboarding') {
              router.push('/onboarding');
            } 
            // Si CGU acceptées et sur page connexion/onboarding, aller à l'accueil
            else if (profile.cgu_accepted_at && (pathname === '/connexion' || pathname === '/onboarding')) {
              router.push('/');
            }
            // Si sur admin routes, rediriger vers apporteur
            else if (pathname?.startsWith('/admin')) {
              router.push('/');
            }
          } else {
            // User has no profile at all - edge case (shouldn't happen normally)
            setUserType(null);
            if (pathname === '/connexion') {
              // Stay on connexion, they might need to complete signup
            }
          }
        }
      } else {
        // Not authenticated
        setUserType(null);
        
        // Allow invite routes and dev routes without auth
        if (isInviteRoute || isDevRoute) {
          // OK, stay on page
        }
        // Redirect to connexion if on protected route
        else if (!publicRoutes.includes(pathname || '') && !specialRoutes.includes(pathname || '')) {
          router.push('/connexion');
        }
      }

      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_OUT') {
          setUserType(null);
          router.push('/connexion');
        }
        // Note: SIGNED_IN is handled by the individual signup handlers in /connexion
        // to properly route based on user type
      }
    );

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, userType }}>
      {children}
    </AuthContext.Provider>
  );
}
