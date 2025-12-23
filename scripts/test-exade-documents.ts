/**
 * Script de test pour découvrir les documents disponibles via l'API Exade
 * Basé sur le format qui fonctionne dans test-exade-complete.ts
 * 
 * Usage: npx ts-node scripts/test-exade-documents.ts
 */

const fs = require('fs');

// Configuration - URL STAGING
const CONFIG = {
  SOAP_URL: 'https://stage-product.exade.fr/4DSOAP',
  LICENCE_KEY: 'GMB#7ùuQefujig8fu1+rulyXa)it',
  CODE_COURTIER: '815178',
};

// Date effet dans le futur
function getDateEffet(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

// Construire le XML interne (même format que test-exade-complete.ts)
function buildInnerXml(typeOperationDocument: number, idTarif?: number): string {
  const dateEffet = getDateEffet();
  
  const idTarifXml = idTarif ? `\n<id_tarif>${idTarif}</id_tarif>` : '';
  const typeDocXml = `\n<type_operation_document>${typeOperationDocument}</type_operation_document>`;

  return `
<licence>${CONFIG.LICENCE_KEY}</licence>
<code_courtier>${CONFIG.CODE_COURTIER}</code_courtier>
<type_operation>2</type_operation>${idTarifXml}${typeDocXml}
<retournerLesErreurs/>
<simulation>
  <date_effet>${dateEffet}</date_effet>
  <id_objetdufinancement>1</id_objetdufinancement>
  <frac_assurance>12</frac_assurance>
  <type_credit>0</type_credit>
  <assure>
    <statut>1</statut>
    <type_adhesion>0</type_adhesion>
    <numero>1</numero>
    <sexe>H</sexe>
    <nom>TESTDOC</nom>
    <nom_naissance>TESTDOC</nom_naissance>
    <prenom>API</prenom>
    <adresse>1 rue Test</adresse>
    <ville>Paris</ville>
    <code_postal>75001</code_postal>
    <lieu_naissance>Paris</lieu_naissance>
    <velIdPaysNaissance>118</velIdPaysNaissance>
    <idnationalite>84</idnationalite>
    <idPaysResidenceFiscale>84</idPaysResidenceFiscale>
    <date_naissance>19850315</date_naissance>
    <franchise>90</franchise>
    <fumeur>N</fumeur>
    <deplacement_pro>1</deplacement_pro>
    <travaux_manuels>1</travaux_manuels>
    <travaux_hauteur>1</travaux_hauteur>
    <manip_produit_dangereux>1</manip_produit_dangereux>
    <portable>0600000000</portable>
    <email>test@example.com</email>
    <politique_expose>N</politique_expose>
    <proche_politique_expose>N</proche_politique_expose>
    <encours_lemoine>180000</encours_lemoine>
    <categ_pro>1</categ_pro>
  </assure>
  <pret>
    <numero>1</numero>
    <type_pret>1</type_pret>
    <capital>20000000</capital>
    <taux>350</taux>
    <type_taux>1</type_taux>
    <duree>240</duree>
    <differe>0</differe>
    <amortissement>12</amortissement>
    <date_deblocage>${dateEffet}</date_deblocage>
    <palier/>
  </pret>
  <garantie_pret>
    <id_assure>1</id_assure>
    <id_pret>1</id_pret>
    <garantie>2</garantie>
    <quotite>100</quotite>
  </garantie_pret>
</simulation>`.trim();
}

// Construire l'enveloppe SOAP (EXACTEMENT comme test-exade-complete.ts)
function buildSoapEnvelope(innerXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
  xmlns:def="http://www.4d.com/namespace/default">
  <soapenv:Header/>
  <soapenv:Body>
    <def:webservice_tarificateur soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
      <webservice_tarificateurRequest xsi:type="xsd:string">
        <![CDATA[${innerXml}]]>
      </webservice_tarificateurRequest>
    </def:webservice_tarificateur>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// Appeler l'API
async function callApi(soapRequest: string): Promise<string> {
  console.log('📡 Appel API:', CONFIG.SOAP_URL);
  
  const response = await fetch(CONFIG.SOAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': '',
    },
    body: soapRequest,
  });

  const text = await response.text();
  
  if (!response.ok) {
    console.log('❌ HTTP', response.status);
    throw new Error(`HTTP ${response.status}`);
  }

  return text;
}

// Décoder les entités HTML
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Extraire le XML interne de la réponse
function extractInnerXml(response: string): string {
  const cdataMatch = response.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) {
    return cdataMatch[1];
  }
  
  const resultMatch = response.match(/<webservice_tarificateurResult[^>]*>([\s\S]*?)<\/webservice_tarificateurResult>/);
  if (resultMatch) {
    return decodeHtmlEntities(resultMatch[1]);
  }
  
  return response;
}

// Extraire les fichiers/documents
function extractDocuments(xml: string): any[] {
  const documents: any[] = [];
  const fichierRegex = /<fichier>([\s\S]*?)<\/fichier>/gi;
  let match;
  
  while ((match = fichierRegex.exec(xml)) !== null) {
    const content = match[1];
    const doc: any = {};
    
    ['libelle', 'identifiant', 'nom', 'type', 'taille', 'encodage', 'compression', 'commentaire'].forEach(field => {
      const m = content.match(new RegExp(`<${field}>([^<]*)</${field}>`, 'i'));
      if (m) doc[field] = m[1];
    });
    
    if (content.includes('<data>')) {
      doc.hasData = true;
      const dataMatch = content.match(/<data>([^<]+)<\/data>/);
      if (dataMatch) {
        doc.dataLength = dataMatch[1].length;
      }
    }
    
    if (Object.keys(doc).length > 0) {
      documents.push(doc);
    }
  }
  
  return documents;
}

// Extraire les tarifs
function extractTarifs(xml: string): any[] {
  const tarifs: any[] = [];
  const tarifRegex = /<tarif>([\s\S]*?)<\/tarif>/gi;
  let match;
  
  while ((match = tarifRegex.exec(xml)) !== null) {
    const content = match[1];
    const id = content.match(/<id_tarif>(\d+)<\/id_tarif>/);
    const compagnie = content.match(/<compagnie>([^<]*)<\/compagnie>/);
    
    if (id) {
      tarifs.push({
        id: id[1],
        compagnie: compagnie ? compagnie[1] : 'N/A'
      });
    }
  }
  
  return tarifs;
}

// Extraire les erreurs
function extractErrors(xml: string): string[] {
  const errors: string[] = [];
  
  const faultMatch = xml.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/);
  if (faultMatch) {
    errors.push(faultMatch[1]);
  }
  
  const erreurMatch = xml.match(/<erreur[^>]*>([\s\S]*?)<\/erreur>/gi);
  if (erreurMatch) {
    erreurMatch.forEach(e => {
      const msg = e.match(/>([^<]+)</);
      if (msg) errors.push(msg[1]);
    });
  }
  
  return errors;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 TEST DES DOCUMENTS EXADE');
  console.log('='.repeat(70));
  console.log('\nURL:', CONFIG.SOAP_URL, '(STAGING)');
  console.log('Format: Identique à test-exade-complete.ts\n');

  const results: any = { timestamp: new Date().toISOString(), tests: [] };

  // ===== TEST 1: Liste des documents (type_operation_document = 1) =====
  console.log('─'.repeat(70));
  console.log('📋 TEST 1: Liste des documents (type_operation_document=1)');
  console.log('   Avec id_tarif=10 (MAIF) - requis selon la doc');
  console.log('─'.repeat(70));

  try {
    const innerXml1 = buildInnerXml(1, 10);
    const soapRequest1 = buildSoapEnvelope(innerXml1);
    fs.writeFileSync('exade_doc_req1.xml', soapRequest1);
    console.log('✅ Requête sauvegardée: exade_doc_req1.xml');
    
    const response1 = await callApi(soapRequest1);
    fs.writeFileSync('exade_doc_resp1.xml', response1);
    console.log('✅ Réponse sauvegardée: exade_doc_resp1.xml');
    
    const innerResponse1 = extractInnerXml(response1);
    const errors1 = extractErrors(response1);
    
    if (errors1.length > 0) {
      console.log('\n⚠️ Erreurs:', errors1.join(', '));
    }
    
    const docs1 = extractDocuments(innerResponse1);
    const tarifs1 = extractTarifs(innerResponse1);
    
    console.log('\n📄 Documents trouvés:', docs1.length);
    if (docs1.length > 0) {
      docs1.forEach((d, i) => console.log(`   ${i+1}. [${d.identifiant || '?'}] ${d.libelle || d.nom || 'Sans nom'}`));
    }
    
    console.log('📊 Tarifs trouvés:', tarifs1.length);
    
    results.tests.push({ 
      name: 'liste_documents_type1', 
      success: true, 
      documents: docs1,
      tarifs: tarifs1.length,
      errors: errors1
    });
    
  } catch (err) {
    console.log('❌ Erreur:', (err as Error).message);
    results.tests.push({ name: 'liste_documents_type1', success: false, error: (err as Error).message });
  }

  // ===== TEST 2: Documents complets (type_operation_document = 2) =====
  console.log('\n' + '─'.repeat(70));
  console.log('📄 TEST 2: Documents complets (type_operation_document=2)');
  console.log('   Avec id_tarif=10 (MAIF)');
  console.log('─'.repeat(70));

  try {
    const innerXml2 = buildInnerXml(2, 10);
    const soapRequest2 = buildSoapEnvelope(innerXml2);
    fs.writeFileSync('exade_doc_req2.xml', soapRequest2);
    console.log('✅ Requête sauvegardée: exade_doc_req2.xml');
    
    const response2 = await callApi(soapRequest2);
    fs.writeFileSync('exade_doc_resp2.xml', response2);
    console.log('✅ Réponse sauvegardée: exade_doc_resp2.xml');
    
    const innerResponse2 = extractInnerXml(response2);
    const errors2 = extractErrors(response2);
    
    if (errors2.length > 0) {
      console.log('\n⚠️ Erreurs:', errors2.join(', '));
    }
    
    const docs2 = extractDocuments(innerResponse2);
    
    console.log('\n📄 Documents trouvés:', docs2.length);
    if (docs2.length > 0) {
      docs2.forEach((d, i) => {
        console.log(`\n   📎 Document ${i+1}:`);
        console.log(`      Libellé: ${d.libelle || 'N/A'}`);
        console.log(`      Nom: ${d.nom || 'N/A'}`);
        console.log(`      Type: ${d.type || 'N/A'}`);
        console.log(`      Taille: ${d.taille ? Math.round(parseInt(d.taille)/1024) + ' Ko' : 'N/A'}`);
        console.log(`      ID: ${d.identifiant || 'N/A'}`);
        if (d.hasData) {
          console.log(`      ✅ Données présentes (${Math.round(d.dataLength/1024)} Ko encodé)`);
        }
      });
    } else {
      console.log('   (Aucun document - peut-être non disponible pour ce tarif)');
    }
    
    results.tests.push({ 
      name: 'documents_complets_type2', 
      success: true, 
      documents: docs2.map(d => ({...d, data: d.hasData ? '[DONNÉES PRÉSENTES]' : undefined})),
      errors: errors2
    });
    
  } catch (err) {
    console.log('❌ Erreur:', (err as Error).message);
    results.tests.push({ name: 'documents_complets_type2', success: false, error: (err as Error).message });
  }

  // ===== TEST 3: Essai avec un autre tarif (Malakoff = 11) =====
  console.log('\n' + '─'.repeat(70));
  console.log('📄 TEST 3: Documents pour Malakoff Humanis (id_tarif=11)');
  console.log('─'.repeat(70));

  try {
    const innerXml3 = buildInnerXml(2, 11);
    const soapRequest3 = buildSoapEnvelope(innerXml3);
    
    const response3 = await callApi(soapRequest3);
    fs.writeFileSync('exade_doc_resp3.xml', response3);
    
    const innerResponse3 = extractInnerXml(response3);
    const docs3 = extractDocuments(innerResponse3);
    
    console.log('📄 Documents trouvés:', docs3.length);
    if (docs3.length > 0) {
      docs3.forEach((d, i) => console.log(`   ${i+1}. ${d.libelle || d.nom || 'Document'} (${d.type || 'N/A'})`));
    }
    
    results.tests.push({ 
      name: 'documents_malakoff', 
      success: true, 
      documents: docs3.map(d => ({...d, data: d.hasData ? '[DONNÉES]' : undefined}))
    });
    
  } catch (err) {
    console.log('❌ Erreur:', (err as Error).message);
    results.tests.push({ name: 'documents_malakoff', success: false, error: (err as Error).message });
  }

  // Sauvegarder les résultats
  fs.writeFileSync('exade_documents_test_results.json', JSON.stringify(results, null, 2));
  console.log('\n' + '='.repeat(70));
  console.log('✅ Résultats sauvegardés: exade_documents_test_results.json');
  console.log('='.repeat(70));
}

main().catch(console.error);
