/**
 * Point d'entrée Supabase pour les composants CLIENT
 * 
 * Ce fichier maintient la compatibilité avec les imports existants:
 * `import { supabase } from '@/lib/supabase'`
 * 
 * ⚠️ Ce fichier est UNIQUEMENT pour le code côté CLIENT
 * 
 * Pour le code SERVEUR (API Routes, Server Components), utilisez:
 * `import { createServerSupabaseClient } from '@/lib/supabase/server'`
 */

// Re-export UNIQUEMENT le client browser
export { supabase, createBrowserSupabaseClient } from './supabase/client'

// NOTE: Les exports serveur (createServerSupabaseClient, etc.) ne sont PAS inclus ici
// car ils utilisent `next/headers` qui ne fonctionne pas côté client.
// Pour le serveur, importez directement depuis '@/lib/supabase/server'
