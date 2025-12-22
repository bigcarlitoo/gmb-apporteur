import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { broker_id, code_courtier, licence_key, soap_url } = body

    if (!code_courtier || !licence_key) {
      return NextResponse.json(
        { error: 'Code courtier et clé de licence obligatoires' },
        { status: 400 }
      )
    }

    const dateEffet = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    // Construire le XML interne (format identique au script de test qui fonctionne)
    const innerXml = `
<licence>${licence_key}</licence>
<code_courtier>${code_courtier}</code_courtier>
<type_operation>2</type_operation>
<type_operation_document>0</type_operation_document>
<retournerLesErreurs />

<simulation>
  <date_effet>${dateEffet}</date_effet>
  <frac_assurance>12</frac_assurance>
  <type_credit>0</type_credit>
  <id_objetdufinancement>1</id_objetdufinancement>

  <assure>
    <numero>1</numero>
    <statut>1</statut>
    <type_adhesion>0</type_adhesion>
    <sexe>H</sexe>
    <nom>TEST</nom>
    <nom_naissance>TEST</nom_naissance>
    <prenom>Connexion</prenom>
    <adresse>1 rue test</adresse>
    <ville>Paris</ville>
    <code_postal>75001</code_postal>
    <lieu_naissance>Paris</lieu_naissance>
    <velIdPaysNaissance>118</velIdPaysNaissance>
    <idnationalite>84</idnationalite>
    <idPaysResidenceFiscale>84</idPaysResidenceFiscale>
    <date_naissance>19850101</date_naissance>
    <franchise>90</franchise>
    <fumeur>N</fumeur>
    <deplacement_pro>1</deplacement_pro>
    <travaux_manuels>0</travaux_manuels>
    <travaux_hauteur>1</travaux_hauteur>
    <manip_produit_dangereux>1</manip_produit_dangereux>
    <portable>+33600000000</portable>
    <email>test@test.fr</email>
    <politique_expose>N</politique_expose>
    <proche_politique_expose>N</proche_politique_expose>
    <encours_lemoine>0</encours_lemoine>
    <categ_pro>1</categ_pro>
  </assure>

  <pret>
    <id_pret>1</id_pret>
    <numero>1</numero>
    <type_pret>1</type_pret>
    <capital>15000000</capital>
    <taux>350</taux>
    <type_taux>1</type_taux>
    <duree>240</duree>
    <differe>0</differe>
    <amortissement>12</amortissement>
    <date_deblocage>${dateEffet}</date_deblocage>
  </pret>

  <garantie_pret>
    <id_assure>1</id_assure>
    <id_pret>1</id_pret>
    <garantie>2</garantie>
    <quotite>100</quotite>
  </garantie_pret>
</simulation>
`.trim()

    // Enveloppe SOAP correcte (même structure que le service Exade qui fonctionne)
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:def="http://www.4d.com/namespace/default">
  <soapenv:Header/>
  <soapenv:Body>
    <def:webservice_tarificateur soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      <webservice_tarificateurRequest xsi:type="xsd:string">
        <![CDATA[
${innerXml}
        ]]>
      </webservice_tarificateurRequest>
    </def:webservice_tarificateur>
  </soapenv:Body>
</soapenv:Envelope>`

    console.log('[API Test] Appel Exade vers:', soap_url || 'https://www.exade.fr/4DSOAP')

    const response = await fetch(soap_url || 'https://www.exade.fr/4DSOAP', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=utf-8',
        'SOAPAction': 'A_WebService#webservice_tarificateur'
      },
      body: soapEnvelope
    })

    console.log('[API Test] Réponse Exade:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[API Test] Erreur Exade:', errorText.substring(0, 500))
      return NextResponse.json(
        { error: `Erreur serveur Exade: ${response.status} ${response.statusText}` },
        { status: 502 }
      )
    }

    const responseText = await response.text()
    
    // Décoder les entités HTML si nécessaire
    let xmlContent = responseText
    if (responseText.includes('&lt;')) {
      xmlContent = responseText
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    }

    // Vérifier les erreurs Exade
    if (xmlContent.includes('<listeErreurs>')) {
      const errorMatch = xmlContent.match(/<libelle>([^<]+)<\/libelle>/i)
      return NextResponse.json(
        { error: errorMatch ? errorMatch[1] : 'Erreur retournée par Exade' },
        { status: 400 }
      )
    }

    // Succès - connexion établie
    return NextResponse.json({
      success: true,
      message: 'Connexion réussie !'
    })

  } catch (error: any) {
    console.error('[API Test] Erreur:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors du test de connexion' },
      { status: 500 }
    )
  }
}
