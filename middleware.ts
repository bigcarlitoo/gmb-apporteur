/**
 * Middleware Next.js pour la gestion de l'authentification Supabase
 * 
 * Ce middleware :
 * 1. Rafraîchit les tokens de session automatiquement
 * 2. Protège les routes qui nécessitent une authentification
 * 3. Redirige vers /connexion si non authentifié
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes publiques (pas besoin d'authentification)
const PUBLIC_ROUTES = [
  '/connexion',
  '/login',        // Fallback au cas où
  '/signup',
  '/auth',
  '/invite',
  '/reset-password',
  '/dev',          // Pages de développement/test
  '/api/auth',
  '/api/dev',      // API de développement
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/.well-known',  // Chrome DevTools et autres
]

// Routes API publiques
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/health',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Ignorer les assets statiques et routes publiques
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Ignorer les API publiques
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Créer une réponse mutable pour modifier les cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  // Créer le client Supabase avec gestion des cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set le cookie sur la request pour les server components
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // Set le cookie sur la response pour le browser
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
  
  // Rafraîchir la session (important pour maintenir l'auth)
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Pour les routes API, laisser l'API gérer l'authentification
  if (pathname.startsWith('/api/')) {
    return response
  }
  
  // Rediriger vers /connexion si pas authentifié sur routes protégées
  if (!user && !pathname.startsWith('/connexion') && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
    const loginUrl = new URL('/connexion', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Si authentifié et sur /connexion ou /login, rediriger vers home
  if (user && (pathname === '/connexion' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

