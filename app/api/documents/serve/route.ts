import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const key = url.searchParams.get('key') || ''
    const bucket = 'documents'

    if (!key || key.includes('..')) {
      return new Response(JSON.stringify({ error: 'Paramètre key invalide' }), { status: 400 })
    }

    // DEV: contrôle simple (auth optionnelle). En prod: vérifier session et RLS d’accès au dossier
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Configuration Supabase manquante' }), { status: 500 })
    }

    // Récupérer le fichier depuis Storage via service role et le retransmettre (proxy)
    const storageObjectUrl = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${bucket}/${encodeURI(key)}`
    const upstream = await fetch(storageObjectUrl, {
      headers: { Authorization: `Bearer ${serviceKey}` }
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return new Response(JSON.stringify({ error: 'Fetch storage échoué', status: upstream.status, body: text }), { status: 400 })
    }

    // Copier headers utiles pour aperçu inline
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length') || undefined
    const dispo = upstream.headers.get('content-disposition') || 'inline'

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Content-Disposition': dispo,
        'Cache-Control': 'private, max-age=0, no-store'
      }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Erreur interne' }), { status: 500 })
  }
}


