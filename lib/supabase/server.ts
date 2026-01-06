/**
 * Supabase Server-Side Client
 * 
 * Ce module fournit des utilitaires pour créer des clients Supabase
 * côté serveur (API Routes, Server Components, Middleware).
 * 
 * UTILISATION:
 * - `createServerSupabaseClient()` : Client avec authentification via cookies
 * - `createServiceRoleClient()` : Client admin qui bypass les RLS (pour les opérations système)
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Types pour l'utilisateur authentifié avec son contexte
export interface AuthenticatedUser {
  id: string
  email: string
  role: 'admin' | 'broker_user' | 'apporteur'
  brokerId: string | null
  apporteurId: string | null
  brokerName: string | null
}

/**
 * Crée un client Supabase pour les Server Components et API Routes
 * Gère automatiquement les cookies d'authentification
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // La méthode set peut échouer dans les Server Components
            // C'est OK car les cookies sont gérés par le middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Idem
          }
        },
      },
    }
  )
}

/**
 * Crée un client Supabase pour les API Routes avec accès aux cookies via NextRequest
 * Utilise le header Authorization si disponible (pour les appels API avec token)
 */
export async function createApiRouteClient(request?: NextRequest) {
  // Si un token JWT est fourni dans le header, l'utiliser directement
  if (request) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      return client
    }
  }
  
  // Sinon, utiliser les cookies
  return createServerSupabaseClient()
}

/**
 * Crée un client Supabase avec le Service Role Key
 * ⚠️ ATTENTION: Ce client bypass TOUTES les RLS policies
 * À utiliser UNIQUEMENT pour les opérations système (uploads, triggers, etc.)
 */
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurée')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

/**
 * Récupère l'utilisateur authentifié avec tout son contexte
 * (rôle, broker associé, profil apporteur, etc.)
 * 
 * @returns L'utilisateur avec son contexte ou null si non authentifié
 */
export async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): Promise<AuthenticatedUser | null> {
  try {
    // 1. Récupérer l'utilisateur Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }
    
    // 2. Vérifier si c'est un admin (dans la table profiles)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role === 'admin') {
      return {
        id: user.id,
        email: user.email || '',
        role: 'admin',
        brokerId: null,
        apporteurId: null,
        brokerName: null
      }
    }
    
    // 3. Vérifier si c'est un broker_user
    const { data: brokerUser } = await supabase
      .from('broker_users')
      .select(`
        broker_id,
        brokers!inner (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .single()
    
    if (brokerUser) {
      return {
        id: user.id,
        email: user.email || '',
        role: 'broker_user',
        brokerId: brokerUser.broker_id,
        apporteurId: null,
        brokerName: (brokerUser.brokers as any)?.name || null
      }
    }
    
    // 4. Vérifier si c'est un apporteur
    const { data: apporteur } = await supabase
      .from('apporteur_profiles')
      .select(`
        id,
        broker_apporteurs!inner (
          broker_id,
          brokers!inner (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .single()
    
    if (apporteur) {
      const brokerApporteur = (apporteur.broker_apporteurs as any)?.[0]
      return {
        id: user.id,
        email: user.email || '',
        role: 'apporteur',
        brokerId: brokerApporteur?.broker_id || null,
        apporteurId: apporteur.id,
        brokerName: brokerApporteur?.brokers?.name || null
      }
    }
    
    // Utilisateur authentifié mais sans rôle spécifique
    return {
      id: user.id,
      email: user.email || '',
      role: 'apporteur', // Rôle par défaut
      brokerId: null,
      apporteurId: null,
      brokerName: null
    }
    
  } catch (error) {
    console.error('[getAuthenticatedUser] Erreur:', error)
    return null
  }
}

/**
 * Middleware helper pour vérifier l'authentification dans les API Routes
 * Retourne l'utilisateur authentifié ou une réponse d'erreur 401
 */
export async function requireAuth(request?: NextRequest): Promise<{
  user: AuthenticatedUser
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  response?: never
} | {
  user?: never
  supabase?: never
  response: NextResponse
}> {
  const supabase = await createApiRouteClient(request)
  const user = await getAuthenticatedUser(supabase)
  
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
  }
  
  return { user, supabase }
}

/**
 * Middleware helper pour vérifier que l'utilisateur est admin
 */
export async function requireAdmin(request?: NextRequest): Promise<{
  user: AuthenticatedUser
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  response?: never
} | {
  user?: never
  supabase?: never
  response: NextResponse
}> {
  const result = await requireAuth(request)
  
  if ('response' in result) {
    return result
  }
  
  if (result.user.role !== 'admin') {
    return {
      response: NextResponse.json(
        { error: 'Accès réservé aux administrateurs', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }
  
  return result
}

/**
 * Middleware helper pour vérifier que l'utilisateur est broker_user ou admin
 */
export async function requireBrokerOrAdmin(request?: NextRequest): Promise<{
  user: AuthenticatedUser
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
  response?: never
} | {
  user?: never
  supabase?: never
  response: NextResponse
}> {
  const result = await requireAuth(request)
  
  if ('response' in result) {
    return result
  }
  
  if (result.user.role !== 'admin' && result.user.role !== 'broker_user') {
    return {
      response: NextResponse.json(
        { error: 'Accès réservé aux courtiers et administrateurs', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }
  }
  
  return result
}

