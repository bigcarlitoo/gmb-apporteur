import { NextRequest, NextResponse } from 'next/server'
import { getExadeTarifs } from '@/lib/services/exade'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tarifs = await getExadeTarifs({
      assure: body?.assure,
      pret: body?.pret,
      garanties: body?.garanties,
    })
    return NextResponse.json({ tarifs })
  } catch (e: any) {
    console.error('[API /exade/tarifs] error', e)
    return NextResponse.json({ error: e?.message || 'Erreur EXADE' }, { status: 500 })
  }
}


