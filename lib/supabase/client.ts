/**
 * Supabase Client-Side Client
 * 
 * Ce module fournit le client Supabase pour les composants React côté client.
 * Utilise le browser storage pour persister la session.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * Crée ou retourne le client Supabase singleton pour le browser
 */
export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient
  }
  
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  return browserClient
}

// Export pour compatibilité avec l'ancien code
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_, prop) {
    const client = createBrowserSupabaseClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

