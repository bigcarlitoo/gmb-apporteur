/**
 * Script de test COMPLET de l'API Exade
 * 
 * Ce script vérifie TOUS les points importants pour GMB Apporteur :
 * 
 * TEST 1 : Tarification SANS code_courtier → Peut-on tarifier en brouillon ?
 * TEST 2 : Vérifier si frais_adhesion_apporteur est bien retourné
 * TEST 3 : Vérifier si cout_premieres_annees_tarif est retourné (pour calculer commission)
 * TEST 4 : Vérifier si frac_assurance fonctionne (mensuel vs annuel)
 * TEST 5 : Vérifier les différents codes de commission
 * TEST 6 : Tarification avec un tarif spécifique (id_tarif)
 * 
 * Usage: npx tsx scripts/test-exade-complete.ts
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
  // URL STAGING forcée pour ce test - ne crée PAS de simulation sur le dashboard courtier
  SOAP_URL: 'https://stage-product.exade.fr/4DSOAP',
  LICENCE_KEY: process.env.EXADE_LICENCE_KEY || '',
  PARTNER_CODE: process.env.EXADE_PARTNER_CODE || '',
  SOAP_ACTION: 'A_WebService#webservice_tarificateur',
};

// ============================================================================
// DONNÉES DE TEST
// ============================================================================

const TEST_DATA = {
  assure: {
    numero: 1,
    sexe: 'H',
    nom: 'GAMBE',
    nom_naissance: 'GAMBE',
    prenom: 'Clovis',
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
  question: string;
  impactSiOui: string;
  impactSiNon: string;
  codeCourtier?: string;
  idTarif?: number;
  commissionnement?: string;
  fraisAdhesionApporteur?: number;
  fracAssurance?: number; // 1 = annuel, 12 = mensuel
}

const TEST_SCENARIOS: TestScenario[] = [
  // ============================================================================
  // TEST 1 : SANS CODE COURTIER
  // ============================================================================
  {
    name: 'TEST_1_SANS_CODE_COURTIER',
    description: 'Appel API SANS code_courtier du tout',
    question: 'Est-ce que l\'API retourne des tarifs sans code_courtier ?',
    impactSiOui: 'On peut tarifer en "brouillon" sans créer de simulation sur Exade → Push seulement après acceptation',
    impactSiNon: 'Les simulations sont créées dès la tarification, on doit l\'accepter',
    codeCourtier: '', // Pas de code courtier
  },
  
  // ============================================================================
  // TEST 2 : AVEC CODE COURTIER + FRAIS APPORTEUR
  // ============================================================================
  {
    name: 'TEST_2_AVEC_FRAIS_APPORTEUR',
    description: 'Avec frais_adhesion_apporteur = 200€',
    question: 'Est-ce que frais_adhesion_apporteur est bien RETOURNÉ dans la réponse ?',
    impactSiOui: 'On peut lire les frais courtier depuis la réponse API pour calculer la commission plateforme',
    impactSiNon: 'On devra stocker les frais qu\'on a envoyé car l\'API ne les retourne pas',
    fraisAdhesionApporteur: 20000, // 200€
  },
  
  // ============================================================================
  // TEST 3 : VÉRIFIER cout_premieres_annees_tarif
  // ============================================================================
  {
    name: 'TEST_3_COUT_PREMIERES_ANNEES',
    description: 'Vérifier si cout_premieres_annees_tarif est présent',
    question: 'Est-ce que cout_premieres_annees_tarif (8 premières années) est retourné ?',
    impactSiOui: 'On peut approximer la commission Exade 1ère année en divisant par 8',
    impactSiNon: 'On ne peut pas calculer la commission 1ère année, on devra se baser sur le relevé',
    commissionnement: '1T4',
  },
  
  // ============================================================================
  // TEST 4 : FRACTIONNEMENT ANNUEL vs MENSUEL
  // ============================================================================
  {
    name: 'TEST_4A_FRAC_MENSUEL',
    description: 'frac_assurance = 12 (mensuel)',
    question: 'Quelle différence de prix entre mensuel et annuel ?',
    impactSiOui: 'L\'app doit permettre au courtier de choisir',
    impactSiNon: 'Le fractionnement n\'impacte pas le prix, pas besoin de l\'option',
    fracAssurance: 12,
    commissionnement: '1T4',
  },
  {
    name: 'TEST_4B_FRAC_ANNUEL',
    description: 'frac_assurance = 1 (annuel)',
    question: 'Quelle différence de prix entre mensuel et annuel ?',
    impactSiOui: 'L\'app doit permettre au courtier de choisir',
    impactSiNon: 'Le fractionnement n\'impacte pas le prix, pas besoin de l\'option',
    fracAssurance: 1,
    commissionnement: '1T4',
  },
  
  // ============================================================================
  // TEST 5 : CODES DE COMMISSION
  // ============================================================================
  {
    name: 'TEST_5A_CODE_BAS',
    description: 'Code commission bas (1T1 = ~0%)',
    question: 'Le prix total varie-t-il selon le code commission ?',
    impactSiOui: 'Le client paie plus cher si le courtier prend plus de commission',
    impactSiNon: 'La commission courtier n\'affecte pas le prix client',
    commissionnement: '1T1',
    idTarif: 1,
  },
  {
    name: 'TEST_5B_CODE_HAUT',
    description: 'Code commission haut (1T10 = ~40%)',
    question: 'Le prix total varie-t-il selon le code commission ?',
    impactSiOui: 'Le client paie plus cher si le courtier prend plus de commission',
    impactSiNon: 'La commission courtier n\'affecte pas le prix client',
    commissionnement: '1T10',
    idTarif: 1,
  },
  
  // ============================================================================
  // TEST 6 : TARIF SPÉCIFIQUE
  // ============================================================================
  {
    name: 'TEST_6_TARIF_SPECIFIQUE',
    description: 'Demander un seul tarif (id_tarif = 1 GENERALI)',
    question: 'Est-ce que l\'API retourne uniquement ce tarif ?',
    impactSiOui: 'On peut optimiser les appels en ne demandant qu\'un tarif quand on régénère',
    impactSiNon: 'On reçoit toujours tous les tarifs, pas d\'optimisation possible',
    idTarif: 1,
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

  // Code courtier (peut être vide pour le test 1)
  const codeCourtier = scenario.codeCourtier !== undefined 
    ? scenario.codeCourtier 
    : CONFIG.PARTNER_CODE;

  // Balises de commission (optionnelles)
  let commissionXml = '';
  if (scenario.fraisAdhesionApporteur !== undefined) {
    commissionXml += `\n    <frais_adhesion_apporteur>${scenario.fraisAdhesionApporteur}</frais_adhesion_apporteur>`;
  }
  if (scenario.commissionnement) {
    commissionXml += `\n    <commissionnement>${scenario.commissionnement}</commissionnement>`;
  }

  // Balise id_tarif (optionnelle)
  const idTarifXml = scenario.idTarif ? `\n<id_tarif>${scenario.idTarif}</id_tarif>` : '';
  
  // Fractionnement (12 = mensuel par défaut)
  const fracAssurance = scenario.fracAssurance || 12;

  return `
<licence>${CONFIG.LICENCE_KEY}</licence>
<code_courtier>${codeCourtier}</code_courtier>
<type_operation>2</type_operation>${idTarifXml}
<retournerLesErreurs/>
<simulation>
  <date_effet>${dateEffet}</date_effet>
  <id_objetdufinancement>1</id_objetdufinancement>
  <frac_assurance>${fracAssurance}</frac_assurance>
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
  cout_premieres_annees?: number;
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
  
  const cdataMatch = xmlResponse.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) {
    innerXml = cdataMatch[1];
  } else {
    const resultMatch = xmlResponse.match(/<webservice_tarificateurResult[^>]*>([\s\S]*?)<\/webservice_tarificateurResult>/);
    if (resultMatch) {
      innerXml = decodeHtmlEntities(resultMatch[1]);
    } else {
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

  const tarifRegex = /<tarif>([\s\S]*?)<\/tarif>/g;
  let match;
  
  while ((match = tarifRegex.exec(innerXml)) !== null) {
    const t = match[1];
    
    const idTarif = t.match(/<id_tarif>(\d+)<\/id_tarif>/)?.[1] || '';
    const compagnie = t.match(/<compagnie>([^<]*)<\/compagnie>/)?.[1] || '';
    const nom = t.match(/<nom>([^<]*)<\/nom>/)?.[1] || '';
    const coutTotal = parseInt(t.match(/<cout_total_tarif>(\d+)<\/cout_total_tarif>/)?.[1] || '0', 10);
    const coutPremieresAnnees = parseInt(t.match(/<cout_premieres_annees_tarif>(\d+)<\/cout_premieres_annees_tarif>/)?.[1] || '0', 10);
    const fraisAdhesion = parseInt(t.match(/<frais_adhesion>(\d+)<\/frais_adhesion>/)?.[1] || '0', 10);
    const fraisAdhesionApporteur = parseInt(t.match(/<frais_adhesion_apporteur>(\d+)<\/frais_adhesion_apporteur>/)?.[1] || '0', 10);
    const tauxCapital = parseInt(t.match(/<taux_capital_assure_tarif>(\d+)<\/taux_capital_assure_tarif>/)?.[1] || '0', 10);
    
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
      cout_premieres_annees: coutPremieresAnnees > 0 ? coutPremieresAnnees / 100 : undefined,
      frais_adhesion: fraisAdhesion / 100,
      frais_adhesion_apporteur: fraisAdhesionApporteur / 100,
      taux_capital_assure: tauxCapital > 0 ? tauxCapital / 10000 : undefined,
      erreur,
    });
  }

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
    rawXml: innerXml.length > 3000 ? innerXml.substring(0, 3000) + '...' : innerXml,
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
  reponse: string;
}

async function runTest(scenario: TestScenario): Promise<TestResult> {
  const start = Date.now();
  const result = await callExadeApi(scenario);
  const duration = Date.now() - start;
  
  // Déterminer la réponse à la question
  let reponse = '⚠️ À ANALYSER';
  
  if (scenario.name === 'TEST_1_SANS_CODE_COURTIER') {
    reponse = result.success 
      ? '✅ OUI - On peut tarifer SANS code courtier!' 
      : `❌ NON - Erreur: ${result.erreurs.join(', ')}`;
  }
  else if (scenario.name === 'TEST_2_AVEC_FRAIS_APPORTEUR') {
    const hasApporteurFees = result.tarifs.some(t => t.frais_adhesion_apporteur > 0);
    reponse = hasApporteurFees 
      ? '✅ OUI - frais_adhesion_apporteur est bien retourné!' 
      : '❌ NON - frais_adhesion_apporteur n\'est pas retourné';
  }
  else if (scenario.name === 'TEST_3_COUT_PREMIERES_ANNEES') {
    const hasCoutPremieres = result.tarifs.some(t => t.cout_premieres_annees && t.cout_premieres_annees > 0);
    reponse = hasCoutPremieres 
      ? '✅ OUI - cout_premieres_annees_tarif est présent!' 
      : '❌ NON - cout_premieres_annees_tarif absent';
  }
  else if (scenario.name === 'TEST_6_TARIF_SPECIFIQUE') {
    reponse = result.tarifs.length === 1 
      ? '✅ OUI - Un seul tarif retourné!' 
      : `⚠️ ${result.tarifs.length} tarifs retournés`;
  }
  
  return { scenario, result, duration, reponse };
}

async function main() {
  console.log('═'.repeat(80));
  console.log('🧪 TESTS COMPLETS API EXADE - GMB APPORTEUR');
  console.log('═'.repeat(80));
  console.log(`\n📅 Date: ${new Date().toLocaleString('fr-FR')}`);
  console.log(`🌐 URL: ${CONFIG.SOAP_URL}`);
  console.log(`🔑 Licence: ${CONFIG.LICENCE_KEY ? '✅ Configurée' : '❌ Manquante'}`);
  console.log(`👤 Code courtier: ${CONFIG.PARTNER_CODE || '❌ Manquant'}`);

  if (!CONFIG.LICENCE_KEY) {
    console.log('\n❌ Configuration incomplète! Ajoutez EXADE_LICENCE_KEY dans .env.local');
    process.exit(1);
  }

  const results: TestResult[] = [];

  // Exécuter chaque scénario
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    
    console.log('\n' + '─'.repeat(80));
    console.log(`\n🔬 TEST ${i + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
    console.log(`   📋 ${scenario.description}`);
    console.log(`   ❓ Question: ${scenario.question}`);
    
    console.log('\n   ⏳ Appel API en cours...');
    
    const testResult = await runTest(scenario);
    results.push(testResult);
    
    console.log(`   ⏱️  Durée: ${testResult.duration}ms`);
    console.log(`   📊 Résultat: ${testResult.reponse}`);
    
    if (testResult.result.success) {
      console.log(`   ✅ ${testResult.result.tarifs.length} tarif(s) reçu(s)`);
      if (testResult.result.id_simulation) {
        console.log(`   📝 ID Simulation: ${testResult.result.id_simulation}`);
      }
      
      // Afficher un échantillon des tarifs
      if (testResult.result.tarifs.length > 0) {
        const t = testResult.result.tarifs[0];
        console.log(`\n   📊 Premier tarif (${t.compagnie} ${t.nom}):`);
        console.log(`      └── Coût total: ${t.cout_total.toFixed(2)}€`);
        if (t.cout_premieres_annees) {
          console.log(`      └── Coût 8 premières années: ${t.cout_premieres_annees.toFixed(2)}€`);
        }
        console.log(`      └── Frais adhésion: ${t.frais_adhesion.toFixed(2)}€`);
        console.log(`      └── Frais apporteur: ${t.frais_adhesion_apporteur.toFixed(2)}€`);
      }
    } else {
      console.log(`   ❌ ÉCHEC: ${testResult.result.erreurs.join(', ')}`);
    }

    // Pause entre les tests
    if (i < TEST_SCENARIOS.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // ============================================================================
  // SYNTHÈSE FINALE
  // ============================================================================

  console.log('\n' + '═'.repeat(80));
  console.log('📊 SYNTHÈSE DES RÉPONSES AUX QUESTIONS');
  console.log('═'.repeat(80));

  for (const r of results) {
    console.log(`\n🔹 ${r.scenario.name}`);
    console.log(`   ${r.reponse}`);
    if (r.reponse.startsWith('✅')) {
      console.log(`   → Impact: ${r.scenario.impactSiOui}`);
    } else if (r.reponse.startsWith('❌')) {
      console.log(`   → Impact: ${r.scenario.impactSiNon}`);
    }
  }

  // Comparaison fractionnement
  const fracMensuel = results.find(r => r.scenario.name === 'TEST_4A_FRAC_MENSUEL');
  const fracAnnuel = results.find(r => r.scenario.name === 'TEST_4B_FRAC_ANNUEL');
  
  if (fracMensuel?.result.success && fracAnnuel?.result.success) {
    const tarifMensuel = fracMensuel.result.tarifs.find(t => t.id_tarif === '1');
    const tarifAnnuel = fracAnnuel.result.tarifs.find(t => t.id_tarif === '1');
    
    if (tarifMensuel && tarifAnnuel) {
      const diff = tarifMensuel.cout_total - tarifAnnuel.cout_total;
      console.log(`\n🔹 COMPARAISON FRACTIONNEMENT (GENERALI id=1):`);
      console.log(`   Mensuel: ${tarifMensuel.cout_total.toFixed(2)}€`);
      console.log(`   Annuel: ${tarifAnnuel.cout_total.toFixed(2)}€`);
      console.log(`   Différence: ${diff.toFixed(2)}€ (${((diff / tarifAnnuel.cout_total) * 100).toFixed(2)}%)`);
    }
  }

  // Comparaison codes commission
  const codeBas = results.find(r => r.scenario.name === 'TEST_5A_CODE_BAS');
  const codeHaut = results.find(r => r.scenario.name === 'TEST_5B_CODE_HAUT');
  
  if (codeBas?.result.success && codeHaut?.result.success) {
    const tarifBas = codeBas.result.tarifs[0];
    const tarifHaut = codeHaut.result.tarifs[0];
    
    if (tarifBas && tarifHaut) {
      const diff = tarifHaut.cout_total - tarifBas.cout_total;
      console.log(`\n🔹 COMPARAISON CODES COMMISSION (GENERALI id=1):`);
      console.log(`   Code bas (1T1 ~0%): ${tarifBas.cout_total.toFixed(2)}€`);
      console.log(`   Code haut (1T10 ~40%): ${tarifHaut.cout_total.toFixed(2)}€`);
      console.log(`   Différence: ${diff.toFixed(2)}€`);
      if (diff === 0) {
        console.log(`   → ⚠️ Les prix sont IDENTIQUES! La commission n'affecte pas le prix client.`);
      } else {
        console.log(`   → Le client paie ${diff.toFixed(2)}€ de plus avec une commission haute.`);
      }
    }
  }

  // Sauvegarder les résultats
  const outputPath = path.resolve(process.cwd(), 'exade_complete_tests_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Résultats sauvegardés dans: ${outputPath}`);
  
  console.log('\n' + '═'.repeat(80));
  console.log('✅ TESTS TERMINÉS');
  console.log('═'.repeat(80));
}

// Exécution
main().catch(console.error);

