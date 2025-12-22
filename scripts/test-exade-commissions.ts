/**
 * Script de test des codes de commission Exade
 * 
 * Ce script teste différents scénarios pour comprendre comment Exade
 * gère les codes de commission quand on demande tous les tarifs.
 * 
 * Scénarios testés :
 * 1. Sans code commission → Tous les tarifs avec défauts
 * 2. Avec code GENERALI (1T4) → Voir si tous les tarifs sont retournés
 * 3. Avec code SWISSLIFE (2T2) → Idem
 * 4. Avec id_tarif spécifique + son code
 * 5. Avec un code "incompatible"
 * 
 * Usage: npx tsx scripts/test-exade-commissions.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('[ENV] Chargé depuis .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('[ENV] Chargé depuis .env');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // URL de TARIFICATION (staging) - ne crée PAS de simulation sur le dashboard courtier
  SOAP_URL: process.env.EXADE_SOAP_URL || 'https://stage-product.exade.fr/4DSOAP',
  LICENCE_KEY: process.env.EXADE_LICENCE_KEY || '',
  PARTNER_CODE: process.env.EXADE_PARTNER_CODE || '',
  SOAP_ACTION: 'A_WebService#webservice_tarificateur',
};

// ============================================================================
// LISTE DES TARIFS EXADE (Section III.6 de la documentation)
// ============================================================================

const EXADE_TARIFS = {
  1: { compagnie: 'GENERALI', nom: 'ASSUREA PRET 7301 CI', codesValides: ['1T1', '1T2', '1T3', '1T4', '1T4bis', '1T5', '1T6', '1T7', '1T8', '1T9', '1T10', '1PU1', '1PU2'] },
  2: { compagnie: 'SWISSLIFE', nom: 'ASSUREA PREMIUM L1047', codesValides: ['2T1', '2T2', '2T3', '2T4', '2T5', '2T6', '2PR1', '2PR2', '2PR3', '2PU1', '2PU2', '2PU3'] },
  3: { compagnie: 'MNCAP', nom: 'ASSUREA ALTERNATIVE 1350', codesValides: ['3T1', '3T2', '3T3', '3T4', '3T5', '3T6', '3T7', '3T8', '3T9', '3T10'] },
  4: { compagnie: 'CNP', nom: 'ASSUREA CREDIT +', codesValides: ['4T1', '4T2', '4T3', '4T4', '4T5', '4T6', '4T7', '4T8', '4T9', '4T10', '4PR1'] },
  5: { compagnie: 'ASSUREA', nom: 'DIGITAL 4044 CRD', codesValides: ['5T1', '5T2', '5T3', '5T4', '5T5', '5T6', '5T7', '5T8', '5T9', '5T10'] },
  6: { compagnie: 'ASSUREA', nom: 'DIGITAL 4044 CI', codesValides: ['6T1', '6T2', '6T3', '6T4', '6T5', '6T6', '6T7', '6T8', '6T9', '6T10'] },
  7: { compagnie: 'ASSUREA', nom: 'PROTECTION +', codesValides: ['7T1', '7T2', '7T3', '7T4', '7T5', '7T6', '7T7', '7T8', '7T9', '7T10', '7PR1'] },
  8: { compagnie: 'GENERALI', nom: '7301 CRD', codesValides: ['8T1', '8T2', '8T3', '8T4', '8T4bis', '8T5', '8T6', '8T7', '8T8', '8T9', '8T10', '8PU1', '8PU2'] },
  9: { compagnie: 'ASSUREA', nom: 'OPEN EMPRUNTEUR CRD', codesValides: ['9T1', '9T2', '9T3', '9T4', '9T5', '9T6', '9T7', '9T8'] },
  10: { compagnie: 'MAIF', nom: 'AVANTAGE EMPRUNTEUR', codesValides: ['10T1', '10T2', '10T3', '10T4', '10T5', '10T6', '10T7', '10T8', '10T9', '10T10'] },
  11: { compagnie: 'MALAKOFF HUMANIS', nom: 'EMPRUNTEUR CI', codesValides: ['11T1', '11T2', '11T3', '11T4', '11T5', '11T6', '11T7', '11T8', '11T9', '11T10'] },
  12: { compagnie: 'ASSUREA', nom: 'PERFORMANCE 6092', codesValides: ['12T1', '12T2', '12T3', '12T4', '12T5', '12T6', '12T7', '12T8', '12T9', '12T10'] },
};

// ============================================================================
// DONNÉES DE TEST
// ============================================================================

const TEST_DATA = {
  assure: {
    numero: 1,
    sexe: 'H',
    nom: 'TEST',
    nom_naissance: 'TEST',
    prenom: 'Commission',
    date_naissance: '19850315',
    adresse: '15 rue Test',
    code_postal: '75001',
    ville: 'Paris',
    lieu_naissance: 'Lyon',
    email: 'test@gmb-courtage.fr',
    portable: '+33612345678',
    fumeur: 'N',
    categ_pro: 1,
    franchise: 90,
    deplacement_pro: 1,
    travaux_manuels: 0,
    encours_lemoine: 0,
  },
  pret: {
    numero: 1,
    type_pret: 1,
    capital: 20000000, // 200 000€
    taux: 350, // 3.50%
    type_taux: 1,
    duree: 240, // 20 ans
    differe: 0,
    amortissement: 12,
  },
  garantie: {
    id_assure: 1,
    id_pret: 1,
    garantie: 2,
    quotite: 100,
  },
};

// ============================================================================
// TYPE DE TEST
// ============================================================================

interface TestScenario {
  name: string;
  description: string;
  idTarif?: number;
  commissionnement?: string;
  typeCommissionnement?: string;
  fraisAdhesionApporteur?: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'SCENARIO_1_SANS_CODE',
    description: 'Sans code commission - Tous les tarifs avec leurs défauts',
    // Pas de commissionnement
  },
  {
    name: 'SCENARIO_2_CODE_GENERALI',
    description: 'Avec code GENERALI 1T4 - Demande tous les tarifs',
    commissionnement: '1T4',
  },
  {
    name: 'SCENARIO_3_CODE_SWISSLIFE',
    description: 'Avec code SWISSLIFE 2T2 - Demande tous les tarifs',
    commissionnement: '2T2',
  },
  {
    name: 'SCENARIO_4_CODE_HUMANIS',
    description: 'Avec code HUMANIS 11T4 - Demande tous les tarifs',
    commissionnement: '11T4',
  },
  {
    name: 'SCENARIO_5_TARIF_SPECIFIQUE',
    description: 'Tarif GENERALI (id=1) avec son code 1T4',
    idTarif: 1,
    commissionnement: '1T4',
  },
  {
    name: 'SCENARIO_6_CODE_BAS',
    description: 'Code commission bas (1T1 = 0% linéaire)',
    commissionnement: '1T1',
  },
  {
    name: 'SCENARIO_7_CODE_HAUT',
    description: 'Code commission haut (1T10 = 40% linéaire)',
    commissionnement: '1T10',
  },
  {
    name: 'SCENARIO_8_AVEC_FRAIS',
    description: 'Avec frais adhésion apporteur (200€)',
    fraisAdhesionApporteur: 20000, // 200€ en centimes
    commissionnement: '1T4',
  },
];

// ============================================================================
// CONSTRUCTION XML
// ============================================================================

function getDateEffet(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function buildTarificationXml(scenario: TestScenario): string {
  const dateEffet = getDateEffet();
  const { assure, pret, garantie } = TEST_DATA;

  // Balises de commission (optionnelles)
  let commissionXml = '';
  if (scenario.fraisAdhesionApporteur !== undefined) {
    commissionXml += `\n    <frais_adhesion_apporteur>${scenario.fraisAdhesionApporteur}</frais_adhesion_apporteur>`;
  }
  if (scenario.commissionnement) {
    commissionXml += `\n    <commissionnement>${scenario.commissionnement}</commissionnement>`;
  }
  if (scenario.typeCommissionnement) {
    commissionXml += `\n    <typecommissionnement>${scenario.typeCommissionnement}</typecommissionnement>`;
  }

  // Balise id_tarif (optionnelle)
  const idTarifXml = scenario.idTarif ? `\n<id_tarif>${scenario.idTarif}</id_tarif>` : '';

  return `
<licence>${CONFIG.LICENCE_KEY}</licence>
<code_courtier>${CONFIG.PARTNER_CODE}</code_courtier>
<type_operation>2</type_operation>${idTarifXml}
<retournerLesErreurs/>
<simulation>
  <date_effet>${dateEffet}</date_effet>
  <id_objetdufinancement>1</id_objetdufinancement>
  <frac_assurance>12</frac_assurance>
  <type_credit>0</type_credit>
  <assure>
    <statut>1</statut>
    <type_adhesion>0</type_adhesion>
    <numero>${assure.numero}</numero>
    <sexe>${assure.sexe}</sexe>
    <nom>${assure.nom}</nom>
    <nom_naissance>${assure.nom_naissance}</nom_naissance>
    <prenom>${assure.prenom}</prenom>
    <adresse>${assure.adresse}</adresse>
    <ville>${assure.ville}</ville>
    <code_postal>${assure.code_postal}</code_postal>
    <lieu_naissance>${assure.lieu_naissance}</lieu_naissance>
    <velIdPaysNaissance>118</velIdPaysNaissance>
    <idnationalite>84</idnationalite>
    <idPaysResidenceFiscale>84</idPaysResidenceFiscale>
    <date_naissance>${assure.date_naissance}</date_naissance>
    <franchise>${assure.franchise}</franchise>
    <fumeur>${assure.fumeur}</fumeur>
    <deplacement_pro>${assure.deplacement_pro}</deplacement_pro>
    <travaux_manuels>${assure.travaux_manuels}</travaux_manuels>
    <travaux_hauteur>1</travaux_hauteur>
    <manip_produit_dangereux>1</manip_produit_dangereux>
    <portable>${assure.portable}</portable>
    <email>${assure.email}</email>
    <politique_expose>N</politique_expose>
    <proche_politique_expose>N</proche_politique_expose>
    <encours_lemoine>${assure.encours_lemoine}</encours_lemoine>
    <categ_pro>${assure.categ_pro}</categ_pro>${commissionXml}
  </assure>
  <pret>
    <numero>${pret.numero}</numero>
    <type_pret>${pret.type_pret}</type_pret>
    <capital>${pret.capital}</capital>
    <taux>${pret.taux}</taux>
    <type_taux>${pret.type_taux}</type_taux>
    <duree>${pret.duree}</duree>
    <differe>${pret.differe}</differe>
    <amortissement>${pret.amortissement}</amortissement>
    <date_deblocage>${dateEffet}</date_deblocage>
    <palier/>
  </pret>
  <garantie_pret>
    <id_assure>${garantie.id_assure}</id_assure>
    <id_pret>${garantie.id_pret}</id_pret>
    <garantie>${garantie.garantie}</garantie>
    <quotite>${garantie.quotite}</quotite>
  </garantie_pret>
</simulation>`.trim();
}

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

// ============================================================================
// PARSING RÉPONSE
// ============================================================================

interface TarifResult {
  id_tarif: string;
  compagnie: string;
  nom: string;
  cout_total: number;
  frais_adhesion: number;
  frais_adhesion_apporteur: number;
  taux_capital_assure?: number;
  erreur?: string;
}

interface ExadeResult {
  success: boolean;
  id_simulation?: string;
  tarifs: TarifResult[];
  erreurs: string[];
  rawXml?: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseExadeResponse(xmlResponse: string): ExadeResult {
  let innerXml: string;
  
  // Extraire le CDATA ou le contenu encodé
  const cdataMatch = xmlResponse.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) {
    innerXml = cdataMatch[1];
  } else {
    const resultMatch = xmlResponse.match(/<webservice_tarificateurResult[^>]*>([\s\S]*?)<\/webservice_tarificateurResult>/);
    if (resultMatch) {
      innerXml = decodeHtmlEntities(resultMatch[1]);
    } else {
      // Vérifier SOAP Fault
      if (xmlResponse.includes('faultstring')) {
        const faultMatch = xmlResponse.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/);
        return {
          success: false,
          tarifs: [],
          erreurs: [faultMatch ? faultMatch[1] : 'Erreur SOAP inconnue'],
          rawXml: xmlResponse.substring(0, 1500),
        };
      }
      return {
        success: false,
        tarifs: [],
        erreurs: ['Impossible de parser la réponse'],
        rawXml: xmlResponse.substring(0, 1500),
      };
    }
  }

  const idSimMatch = innerXml.match(/<id_simulation>(\d+)<\/id_simulation>/);
  const tarifs: TarifResult[] = [];
  const erreurs: string[] = [];

  // Parser les tarifs
  const tarifRegex = /<tarif>([\s\S]*?)<\/tarif>/g;
  let match;
  
  while ((match = tarifRegex.exec(innerXml)) !== null) {
    const t = match[1];
    
    const idTarif = t.match(/<id_tarif>(\d+)<\/id_tarif>/)?.[1] || '';
    const compagnie = t.match(/<compagnie>([^<]*)<\/compagnie>/)?.[1] || '';
    const nom = t.match(/<nom>([^<]*)<\/nom>/)?.[1] || '';
    const coutTotal = parseInt(t.match(/<cout_total_tarif>(\d+)<\/cout_total_tarif>/)?.[1] || '0', 10);
    const fraisAdhesion = parseInt(t.match(/<frais_adhesion>(\d+)<\/frais_adhesion>/)?.[1] || '0', 10);
    const fraisAdhesionApporteur = parseInt(t.match(/<frais_adhesion_apporteur>(\d+)<\/frais_adhesion_apporteur>/)?.[1] || '0', 10);
    const tauxCapital = parseInt(t.match(/<taux_capital_assure_tarif>(\d+)<\/taux_capital_assure_tarif>/)?.[1] || '0', 10);
    
    // Vérifier erreur dans le tarif
    const erreurMatch = t.match(/<listeErreurs>([\s\S]*?)<\/listeErreurs>/);
    let erreur: string | undefined;
    if (erreurMatch) {
      const erreurLibelle = erreurMatch[1].match(/<libelle>([^<]*)<\/libelle>/)?.[1];
      erreur = erreurLibelle;
    }

    tarifs.push({
      id_tarif: idTarif,
      compagnie,
      nom,
      cout_total: coutTotal / 100,
      frais_adhesion: fraisAdhesion / 100,
      frais_adhesion_apporteur: fraisAdhesionApporteur / 100,
      taux_capital_assure: tauxCapital > 0 ? tauxCapital / 10000 : undefined,
      erreur,
    });
  }

  // Erreurs globales
  const erreurGlobalRegex = /<erreur>([^<]+)<\/erreur>/g;
  let errMatch;
  while ((errMatch = erreurGlobalRegex.exec(innerXml)) !== null) {
    erreurs.push(errMatch[1]);
  }

  return {
    success: tarifs.length > 0 || !!idSimMatch,
    id_simulation: idSimMatch?.[1],
    tarifs,
    erreurs,
    rawXml: innerXml.length > 2000 ? innerXml.substring(0, 2000) + '...' : innerXml,
  };
}

// ============================================================================
// APPEL API
// ============================================================================

async function callExadeApi(scenario: TestScenario): Promise<ExadeResult> {
  const innerXml = buildTarificationXml(scenario);
  const soapEnvelope = buildSoapEnvelope(innerXml);

  try {
    const response = await fetch(CONFIG.SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': CONFIG.SOAP_ACTION,
      },
      body: soapEnvelope,
    });

    const responseText = await response.text();

    if (!response.ok) {
      return {
        success: false,
        tarifs: [],
        erreurs: [`HTTP ${response.status}: ${response.statusText}`],
        rawXml: responseText.substring(0, 1000),
      };
    }

    return parseExadeResponse(responseText);
  } catch (error: any) {
    return {
      success: false,
      tarifs: [],
      erreurs: [error.message],
    };
  }
}

// ============================================================================
// EXÉCUTION DES TESTS
// ============================================================================

interface TestResult {
  scenario: TestScenario;
  result: ExadeResult;
  duration: number;
}

async function runTest(scenario: TestScenario): Promise<TestResult> {
  const start = Date.now();
  const result = await callExadeApi(scenario);
  const duration = Date.now() - start;
  return { scenario, result, duration };
}

async function main() {
  console.log('═'.repeat(80));
  console.log('🧪 TEST DES CODES DE COMMISSION EXADE');
  console.log('═'.repeat(80));
  console.log(`\n📅 Date: ${new Date().toLocaleString('fr-FR')}`);
  console.log(`🌐 URL: ${CONFIG.SOAP_URL}`);
  console.log(`🔑 Licence: ${CONFIG.LICENCE_KEY ? '✅ Configurée' : '❌ Manquante'}`);
  console.log(`👤 Code courtier: ${CONFIG.PARTNER_CODE || '❌ Manquant'}`);

  if (!CONFIG.LICENCE_KEY || !CONFIG.PARTNER_CODE) {
    console.log('\n❌ Configuration incomplète! Ajoutez EXADE_LICENCE_KEY et EXADE_PARTNER_CODE dans .env.local');
    process.exit(1);
  }

  const results: TestResult[] = [];

  // Exécuter chaque scénario
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    
    console.log('\n' + '─'.repeat(80));
    console.log(`\n🔬 TEST ${i + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
    console.log(`   📋 ${scenario.description}`);
    if (scenario.idTarif) console.log(`   🎯 id_tarif: ${scenario.idTarif}`);
    if (scenario.commissionnement) console.log(`   💰 commissionnement: ${scenario.commissionnement}`);
    if (scenario.fraisAdhesionApporteur) console.log(`   💵 frais_adhesion_apporteur: ${scenario.fraisAdhesionApporteur / 100}€`);
    
    console.log('\n   ⏳ Appel API en cours...');
    
    const testResult = await runTest(scenario);
    results.push(testResult);
    
    console.log(`   ⏱️  Durée: ${testResult.duration}ms`);
    
    if (testResult.result.success) {
      console.log(`   ✅ SUCCÈS - ${testResult.result.tarifs.length} tarif(s) reçu(s)`);
      if (testResult.result.id_simulation) {
        console.log(`   📝 ID Simulation: ${testResult.result.id_simulation}`);
      }
      
      // Afficher les tarifs
      console.log('\n   📊 TARIFS REÇUS:');
      console.log('   ' + '─'.repeat(70));
      
      for (const tarif of testResult.result.tarifs) {
        const status = tarif.erreur ? '⚠️' : '✅';
        console.log(`   ${status} [${tarif.id_tarif.padStart(2)}] ${tarif.compagnie} - ${tarif.nom}`);
        console.log(`       Coût total: ${tarif.cout_total.toFixed(2)}€ | Frais adhésion: ${tarif.frais_adhesion.toFixed(2)}€ | Frais apporteur: ${tarif.frais_adhesion_apporteur.toFixed(2)}€`);
        if (tarif.taux_capital_assure) {
          console.log(`       Taux capital assuré: ${tarif.taux_capital_assure.toFixed(4)}%`);
        }
        if (tarif.erreur) {
          console.log(`       ⚠️ Erreur: ${tarif.erreur}`);
        }
      }
    } else {
      console.log(`   ❌ ÉCHEC`);
      if (testResult.result.erreurs.length > 0) {
        console.log('   Erreurs:');
        testResult.result.erreurs.forEach(e => console.log(`      - ${e}`));
      }
    }

    // Petite pause entre les tests pour ne pas surcharger l'API
    if (i < TEST_SCENARIOS.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // ============================================================================
  // SYNTHÈSE
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('📊 SYNTHÈSE DES RÉSULTATS');
  console.log('═'.repeat(80));

  // Tableau récapitulatif
  console.log('\n┌─────────────────────────────────┬─────────┬───────────┬─────────────────────────┐');
  console.log('│ Scénario                        │ Statut  │ Nb Tarifs │ Observation             │');
  console.log('├─────────────────────────────────┼─────────┼───────────┼─────────────────────────┤');
  
  for (const r of results) {
    const name = r.scenario.name.substring(0, 30).padEnd(31);
    const status = r.result.success ? '✅' : '❌';
    const nbTarifs = String(r.result.tarifs.length).padStart(4);
    let obs = '';
    
    if (r.result.success) {
      if (r.scenario.idTarif && r.result.tarifs.length === 1) {
        obs = 'Tarif unique demandé';
      } else if (!r.scenario.commissionnement) {
        obs = 'Défauts Exade';
      } else {
        obs = `Code ${r.scenario.commissionnement} appliqué`;
      }
    } else {
      obs = r.result.erreurs[0]?.substring(0, 20) || 'Erreur';
    }
    
    console.log(`│ ${name} │   ${status}    │   ${nbTarifs}    │ ${obs.padEnd(23)} │`);
  }
  
  console.log('└─────────────────────────────────┴─────────┴───────────┴─────────────────────────┘');

  // Comparaison des frais entre scénarios
  console.log('\n📈 COMPARAISON DES FRAIS APPORTEUR:');
  console.log('─'.repeat(60));
  
  const scenariosSansCode = results.find(r => r.scenario.name === 'SCENARIO_1_SANS_CODE');
  const scenariosAvecCode = results.filter(r => r.scenario.commissionnement && r.result.success);
  
  if (scenariosSansCode?.result.success && scenariosAvecCode.length > 0) {
    console.log('\nTarif GENERALI (id=1) - Frais apporteur selon le code:');
    for (const r of results) {
      const generaliTarif = r.result.tarifs.find(t => t.id_tarif === '1');
      if (generaliTarif) {
        const code = r.scenario.commissionnement || 'DÉFAUT';
        console.log(`   ${code.padEnd(10)}: ${generaliTarif.frais_adhesion_apporteur.toFixed(2)}€`);
      }
    }
  }

  // Conclusions
  console.log('\n' + '═'.repeat(80));
  console.log('🎯 CONCLUSIONS');
  console.log('═'.repeat(80));
  
  const allHaveTarifs = results.filter(r => r.scenario.commissionnement && !r.scenario.idTarif)
    .every(r => r.result.tarifs.length > 1);
  
  if (allHaveTarifs) {
    console.log(`
✅ Exade retourne TOUS les tarifs même avec un code de commission spécifique.
   → Le code est appliqué au tarif correspondant
   → Les autres tarifs utilisent leurs valeurs par défaut

💡 RECOMMANDATION pour l'UI:
   1. Réglages admin: Permettre de définir un code PAR TARIF (optionnel)
   2. Lors de la tarification: Ne pas envoyer de code → tous les défauts
   3. Panel devis: Filtrer les codes selon le tarif du devis sélectionné
   4. Régénération: Utiliser le code spécifique au tarif sélectionné
`);
  } else {
    console.log(`
⚠️ Comportement à analyser selon les résultats ci-dessus.
   Vérifiez les erreurs et le nombre de tarifs retournés pour chaque scénario.
`);
  }

  // Sauvegarder les résultats
  const outputPath = path.resolve(process.cwd(), 'exade_commission_tests_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Résultats sauvegardés dans: ${outputPath}`);
}

// Exécution
main().catch(console.error);





