/**
 * Point d'entrée pour les utilitaires Supabase CLIENT
 * 
 * ⚠️ Ce fichier est UNIQUEMENT pour le code côté CLIENT
 * 
 * UTILISATION:
 * 
 * Côté CLIENT (composants React):
 * ```typescript
 * import { supabase } from '@/lib/supabase'
 * // ou
 * import { createBrowserSupabaseClient } from '@/lib/supabase/client'
 * ```
 * 
 * Côté SERVEUR (API Routes, Server Components):
 * ```typescript
 * // Importez DIRECTEMENT depuis server.ts
 * import { createServerSupabaseClient, requireAuth, createServiceRoleClient } from '@/lib/supabase/server'
 * ```
 */

// Re-export UNIQUEMENT le client browser
export { supabase, createBrowserSupabaseClient } from './client'

// NOTE: Les exports serveur ne sont PAS inclus ici car ils utilisent `next/headers`
