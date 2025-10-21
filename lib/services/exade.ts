import { XMLParser } from 'fast-xml-parser'

type ExadeTarif = {
  compagnie: string
  reference: string
  mensualite: number
  primeTotale?: number
  garanties?: Array<{ code: string; libelle: string }>
}

function buildSoapEnvelope(xmlBody: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      ${xmlBody}
    </soap:Body>
  </soap:Envelope>`
}

export async function getExadeTarifs(payload: {
  assure: any
  pret: any
  garanties?: any
}) {
  if (process.env.EXADE_USE_MOCK === 'true') {
    // Réponse simulée pour dev/local pendant la whitelist IP
    const mois = Number(payload?.pret?.duree_mois || 240)
    return [
      {
        compagnie: 'Assurea/Generali',
        reference: 'GEN-ASSUR-001',
        mensualite: 95.5,
        primeTotale: 95.5 * mois,
        garanties: [
          { code: 'DEC', libelle: 'Décès' },
          { code: 'PTIA', libelle: 'Perte Totale et Irréversible d’Autonomie' },
          { code: 'ITT', libelle: 'Incapacité Temporaire de Travail' },
        ],
      },
      {
        compagnie: 'Assurea/Swisslife',
        reference: 'SWL-SECUR-PLUS',
        mensualite: 102.3,
        primeTotale: 102.3 * mois,
        garanties: [
          { code: 'DEC', libelle: 'Décès' },
          { code: 'PTIA', libelle: 'Perte Totale et Irréversible d’Autonomie' },
          { code: 'IPT', libelle: 'Invalidité Permanente Totale' },
        ],
      },
    ] as ExadeTarif[]
  }
  const WS_KEY = process.env.EXADE_WS_KEY || ''
  const API_KEY = process.env.EXADE_API_KEY || ''
  const SOAP_URL = process.env.EXADE_SOAP_URL || ''

  // Corps XML selon doc: webservice_tarificateurRequest
  const requestXml = `
    <webservice_tarificateur xmlns="http://assurea.exade.fr/">
      <webservice_tarificateurRequest>
        <identifiants>
          <key>${API_KEY}</key>
          <ws>${WS_KEY}</ws>
        </identifiants>
        <assure>
          ${/* map minimal, à compléter avec champs exacts de la doc */''}
          <nom>${payload.assure?.nom ?? ''}</nom>
          <prenom>${payload.assure?.prenom ?? ''}</prenom>
          <date_naissance>${payload.assure?.date_naissance ?? ''}</date_naissance>
          <fumeur>${payload.assure?.fumeur ? 'true' : 'false'}</fumeur>
        </assure>
        <pret>
          <montant>${payload.pret?.montant ?? ''}</montant>
          <duree>${payload.pret?.duree_mois ?? ''}</duree>
          <taux>${payload.pret?.taux ?? ''}</taux>
        </pret>
        <garanties>${payload.garanties ?? ''}</garanties>
        <id_tarif></id_tarif>
      </webservice_tarificateurRequest>
    </webservice_tarificateur>
  `

  const envelope = buildSoapEnvelope(requestXml)

  const res = await fetch(SOAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'http://assurea.exade.fr/webservice_tarificateur'
    },
    body: envelope
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[EXADE] HTTP ${res.status}: ${text}`)
  }

  const xml = await res.text()
  const parser = new XMLParser({ ignoreAttributes: false })
  const parsed: any = parser.parse(xml)

  // Extraire la balise webservice_tarificateurResult
  const result = parsed?.['soap:Envelope']?.['soap:Body']?.['webservice_tarificateurResponse']?.['webservice_tarificateurResult']
  if (!result) {
    throw new Error('[EXADE] Réponse invalide (pas de webservice_tarificateurResult)')
  }

  // Selon doc, convertir result (XML) en liste tarifs
  const tarifs: ExadeTarif[] = []
  const items = Array.isArray(result?.tarifs?.tarif) ? result.tarifs.tarif : (result?.tarifs?.tarif ? [result.tarifs.tarif] : [])
  for (const it of items) {
    tarifs.push({
      compagnie: it?.compagnie ?? '',
      reference: it?.reference ?? '',
      mensualite: Number(it?.mensualite ?? 0),
      primeTotale: it?.prime_totale ? Number(it.prime_totale) : undefined,
      garanties: Array.isArray(it?.garanties?.garantie) ? it.garanties.garantie.map((g: any) => ({ code: g?.code ?? '', libelle: g?.libelle ?? '' })) : undefined
    })
  }

  return tarifs
}


