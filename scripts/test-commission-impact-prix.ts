/**
 * Script pour vérifier si le code commission impacte le prix client
 * 
 * On teste le MÊME tarif (GENERALI id=1) avec différents codes commission
 * pour voir si le cout_total_tarif change.
 * 
 * Usage: npx tsx scripts/test-commission-impact-prix.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

const CONFIG = {
  // URL de TARIFICATION (staging) - ne crée PAS de simulation sur le dashboard courtier
  SOAP_URL: process.env.EXADE_SOAP_URL || 'https://stage-product.exade.fr/4DSOAP',
  LICENCE_KEY: process.env.EXADE_LICENCE_KEY || '',
  PARTNER_CODE: process.env.EXADE_PARTNER_CODE || '',
  SOAP_ACTION: 'A_WebService#webservice_tarificateur',
};

// Test uniquement le tarif GENERALI (id=1) avec différents codes
const CODES_A_TESTER = [
  { code: '', label: 'SANS CODE (défaut Exade)' },
  { code: '1T1', label: '0% linéaire' },
  { code: '1T4', label: '30% 1ère année / 10% suivantes' },
  { code: '1T10', label: '40% linéaire' },
];

function getDateEffet(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function buildRequest(commissionCode: string): string {
  const dateEffet = getDateEffet();
  
  // Balise commissionnement seulement si code fourni
  const commissionXml = commissionCode 
    ? `<commissionnement>${commissionCode}</commissionnement>` 
    : '';

  const innerXml = `
<licence>${CONFIG.LICENCE_KEY}</licence>
<code_courtier>${CONFIG.PARTNER_CODE}</code_courtier>
<type_operation>2</type_operation>
<id_tarif>1</id_tarif>
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
    <nom>TEST</nom>
    <nom_naissance>TEST</nom_naissance>
    <prenom>Commission</prenom>
    <adresse>15 rue Test</adresse>
    <ville>Paris</ville>
    <code_postal>75001</code_postal>
    <lieu_naissance>Lyon</lieu_naissance>
    <velIdPaysNaissance>118</velIdPaysNaissance>
    <idnationalite>84</idnationalite>
    <idPaysResidenceFiscale>84</idPaysResidenceFiscale>
    <date_naissance>19850315</date_naissance>
    <franchise>90</franchise>
    <fumeur>N</fumeur>
    <deplacement_pro>1</deplacement_pro>
    <travaux_manuels>0</travaux_manuels>
    <travaux_hauteur>1</travaux_hauteur>
    <manip_produit_dangereux>1</manip_produit_dangereux>
    <portable>+33612345678</portable>
    <email>test@test.fr</email>
    <politique_expose>N</politique_expose>
    <proche_politique_expose>N</proche_politique_expose>
    <encours_lemoine>0</encours_lemoine>
    <categ_pro>1</categ_pro>
    ${commissionXml}
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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

interface Result {
  code: string;
  label: string;
  cout_total: number;
  frais_adhesion: number;
  taux_capital: number;
  id_simulation: string;
  error?: string;
}

async function testCode(codeInfo: { code: string; label: string }): Promise<Result> {
  const envelope = buildRequest(codeInfo.code);
  
  try {
    const response = await fetch(CONFIG.SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': CONFIG.SOAP_ACTION,
      },
      body: envelope,
    });

    const text = await response.text();
    
    // Parser la réponse
    let xml = text;
    if (text.includes('&lt;')) {
      xml = decodeHtmlEntities(text);
    }
    
    const idSim = xml.match(/<id_simulation>(\d+)<\/id_simulation>/)?.[1] || '';
    const coutTotal = parseInt(xml.match(/<cout_total_tarif>(\d+)<\/cout_total_tarif>/)?.[1] || '0', 10);
    const fraisAdhesion = parseInt(xml.match(/<frais_adhesion>(\d+)<\/frais_adhesion>/)?.[1] || '0', 10);
    const tauxCapital = parseInt(xml.match(/<taux_capital_assure_tarif>(\d+)<\/taux_capital_assure_tarif>/)?.[1] || '0', 10);
    
    return {
      code: codeInfo.code || 'DEFAUT',
      label: codeInfo.label,
      cout_total: coutTotal / 100,
      frais_adhesion: fraisAdhesion / 100,
      taux_capital: tauxCapital / 10000,
      id_simulation: idSim,
    };
  } catch (err: any) {
    return {
      code: codeInfo.code || 'DEFAUT',
      label: codeInfo.label,
      cout_total: 0,
      frais_adhesion: 0,
      taux_capital: 0,
      id_simulation: '',
      error: err.message,
    };
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('🔬 TEST : LE CODE COMMISSION IMPACTE-T-IL LE PRIX CLIENT ?');
  console.log('═'.repeat(80));
  console.log('\n📋 Tarif testé : GENERALI 7301 CI (id_tarif=1)');
  console.log('📋 Prêt : 200 000€ sur 20 ans\n');

  if (!CONFIG.LICENCE_KEY) {
    console.log('❌ EXADE_LICENCE_KEY manquante');
    process.exit(1);
  }

  const results: Result[] = [];

  for (const codeInfo of CODES_A_TESTER) {
    process.stdout.write(`⏳ Test avec ${codeInfo.code || 'DEFAUT'}... `);
    const result = await testCode(codeInfo);
    results.push(result);
    
    if (result.error) {
      console.log(`❌ ${result.error}`);
    } else {
      console.log(`✅ ${result.cout_total.toFixed(2)}€`);
    }
    
    // Pause entre les tests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Affichage des résultats
  console.log('\n' + '═'.repeat(80));
  console.log('📊 RÉSULTATS');
  console.log('═'.repeat(80));
  
  console.log('\n┌──────────────────────────────────────────┬───────────────┬───────────────┬──────────────┐');
  console.log('│ Code commission                          │ Coût total    │ Frais adhés.  │ Taux capital │');
  console.log('├──────────────────────────────────────────┼───────────────┼───────────────┼──────────────┤');
  
  for (const r of results) {
    const codeLabel = `${r.code} (${r.label})`.substring(0, 40).padEnd(40);
    const cout = `${r.cout_total.toFixed(2)}€`.padStart(12);
    const frais = `${r.frais_adhesion.toFixed(2)}€`.padStart(12);
    const taux = `${r.taux_capital.toFixed(4)}%`.padStart(11);
    
    console.log(`│ ${codeLabel} │ ${cout} │ ${frais} │ ${taux} │`);
  }
  
  console.log('└──────────────────────────────────────────┴───────────────┴───────────────┴──────────────┘');

  // Analyse
  const prixDifferents = new Set(results.map(r => r.cout_total)).size > 1;
  
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 CONCLUSION');
  console.log('═'.repeat(80));
  
  if (prixDifferents) {
    console.log(`
⚠️ LES PRIX SONT DIFFÉRENTS selon le code commission !
   → Le code commission IMPACTE le tarif payé par le client
   → Plus la commission courtier est élevée, plus le client paie cher
   → Cela explique pourquoi on ne peut pas toujours choisir le max
`);
  } else {
    console.log(`
✅ LES PRIX SONT IDENTIQUES quel que soit le code commission.
   → Le code commission ne change PAS le tarif client
   → Il détermine seulement la part que l'assureur reverse au courtier
   → Le client paie toujours le même prix

   MAIS ALORS pourquoi ne pas toujours choisir le maximum ?
   
   Hypothèses :
   1. ACCÈS LIMITÉ : Chaque courtier a un palier max négocié avec Exade/Multi-Impact
   2. ACCORD COMMERCIAL : Les paliers élevés sont réservés aux gros volumes
   3. VALIDATION REQUISE : Multi-Impact doit autoriser les paliers élevés
`);
  }
}

main().catch(console.error);





