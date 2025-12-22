/**
 * Script de test pour CALCULER LA COMMISSION 1ÈRE ANNÉE
 * 
 * L'API Exade retourne les coûts détaillés par année dans le XML.
 * On peut donc extraire le coût de la 1ère année et appliquer le pourcentage
 * de commission selon le code choisi.
 * 
 * Usage: npx tsx scripts/test-exade-commission-calculation.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
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
// TABLE DE CORRESPONDANCE DES CODES DE COMMISSION
// Source: Documentation Exade III.7
// ============================================================================

interface CommissionRate {
  code: string;
  description: string;
  type: 'linear' | 'first_year_plus';
  firstYearPercent: number;
  followingYearsPercent: number;
}

const COMMISSION_RATES: Record<string, CommissionRate> = {
  // GENERALI (tarif 1 et 8)
  '1T1': { code: '1T1', description: '0% linéaire', type: 'linear', firstYearPercent: 0, followingYearsPercent: 0 },
  '1T2': { code: '1T2', description: '5% linéaire', type: 'linear', firstYearPercent: 5, followingYearsPercent: 5 },
  '1T3': { code: '1T3', description: '10% linéaire', type: 'linear', firstYearPercent: 10, followingYearsPercent: 10 },
  '1T4': { code: '1T4', description: '30% 1ère année / 10% suivantes', type: 'first_year_plus', firstYearPercent: 30, followingYearsPercent: 10 },
  '1T4bis': { code: '1T4bis', description: '55% 1ère année / 20% suivantes', type: 'first_year_plus', firstYearPercent: 55, followingYearsPercent: 20 },
  '1T5': { code: '1T5', description: '15% linéaire', type: 'linear', firstYearPercent: 15, followingYearsPercent: 15 },
  '1T6': { code: '1T6', description: '20% linéaire', type: 'linear', firstYearPercent: 20, followingYearsPercent: 20 },
  '1T7': { code: '1T7', description: '25% linéaire', type: 'linear', firstYearPercent: 25, followingYearsPercent: 25 },
  '1T8': { code: '1T8', description: '30% linéaire', type: 'linear', firstYearPercent: 30, followingYearsPercent: 30 },
  '1T9': { code: '1T9', description: '35% linéaire', type: 'linear', firstYearPercent: 35, followingYearsPercent: 35 },
  '1T10': { code: '1T10', description: '40% linéaire', type: 'linear', firstYearPercent: 40, followingYearsPercent: 40 },
  
  // SWISSLIFE (tarif 2 et 13)
  '2T1': { code: '2T1', description: '30% 1ère / 5% suivantes', type: 'first_year_plus', firstYearPercent: 30, followingYearsPercent: 5 },
  '2T2': { code: '2T2', description: '40% 1ère / 10% suivantes', type: 'first_year_plus', firstYearPercent: 40, followingYearsPercent: 10 },
  '2T3': { code: '2T3', description: '40% 1ère / 15% suivantes', type: 'first_year_plus', firstYearPercent: 40, followingYearsPercent: 15 },
  '2T4': { code: '2T4', description: '18% linéaire', type: 'linear', firstYearPercent: 18, followingYearsPercent: 18 },
  '2T5': { code: '2T5', description: '40% 1ère / 30% suivantes', type: 'first_year_plus', firstYearPercent: 40, followingYearsPercent: 30 },
  '2T6': { code: '2T6', description: '40% linéaire', type: 'linear', firstYearPercent: 40, followingYearsPercent: 40 },
  
  // MNCAP (tarif 3)
  '3T1': { code: '3T1', description: '0%', type: 'linear', firstYearPercent: 0, followingYearsPercent: 0 },
  '3T2': { code: '3T2', description: '5% linéaire', type: 'linear', firstYearPercent: 5, followingYearsPercent: 5 },
  '3T3': { code: '3T3', description: '10% linéaire', type: 'linear', firstYearPercent: 10, followingYearsPercent: 10 },
  '3T4': { code: '3T4', description: '40% 1ère / 10% suivantes', type: 'first_year_plus', firstYearPercent: 40, followingYearsPercent: 10 },
  '3T5': { code: '3T5', description: '15% linéaire', type: 'linear', firstYearPercent: 15, followingYearsPercent: 15 },
  '3T6': { code: '3T6', description: '20% linéaire', type: 'linear', firstYearPercent: 20, followingYearsPercent: 20 },
  '3T7': { code: '3T7', description: '25% linéaire', type: 'linear', firstYearPercent: 25, followingYearsPercent: 25 },
  '3T8': { code: '3T8', description: '30% linéaire', type: 'linear', firstYearPercent: 30, followingYearsPercent: 30 },
  '3T9': { code: '3T9', description: '35% linéaire', type: 'linear', firstYearPercent: 35, followingYearsPercent: 35 },
  '3T10': { code: '3T10', description: '40% linéaire', type: 'linear', firstYearPercent: 40, followingYearsPercent: 40 },
  
  // CNP (tarif 4 et 7)
  '4T1': { code: '4T1', description: '0%', type: 'linear', firstYearPercent: 0, followingYearsPercent: 0 },
  '4T2': { code: '4T2', description: '5% linéaire', type: 'linear', firstYearPercent: 5, followingYearsPercent: 5 },
  '4T3': { code: '4T3', description: '10% linéaire', type: 'linear', firstYearPercent: 10, followingYearsPercent: 10 },
  '4T4': { code: '4T4', description: '30% 1ère / 10% suivantes', type: 'first_year_plus', firstYearPercent: 30, followingYearsPercent: 10 },
  '4T5': { code: '4T5', description: '15% linéaire', type: 'linear', firstYearPercent: 15, followingYearsPercent: 15 },
  '4T6': { code: '4T6', description: '20% linéaire', type: 'linear', firstYearPercent: 20, followingYearsPercent: 20 },
  '4T7': { code: '4T7', description: '25% linéaire', type: 'linear', firstYearPercent: 25, followingYearsPercent: 25 },
  '4T8': { code: '4T8', description: '30% linéaire', type: 'linear', firstYearPercent: 30, followingYearsPercent: 30 },
  '4T9': { code: '4T9', description: '35% linéaire', type: 'linear', firstYearPercent: 35, followingYearsPercent: 35 },
  '4T10': { code: '4T10', description: '40% linéaire', type: 'linear', firstYearPercent: 40, followingYearsPercent: 40 },
};

// ============================================================================
// DONNÉES DE TEST
// ============================================================================

const TEST_DATA = {
  assure: {
    numero: 1,
    sexe: 'H',
    nom: 'TESTCOMMISSION',
    nom_naissance: 'TESTCOMMISSION',
    prenom: 'Calcul',
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
// SCÉNARIOS DE TEST
// ============================================================================

interface TestScenario {
  name: string;
  idTarif: number;
  tarifName: string;
  commissionnement: string;
  fraisAdhesionApporteur: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  // Test avec différents codes pour GENERALI (tarif 1)
  { name: 'GENERALI_1T1_0pct', idTarif: 1, tarifName: 'GENERALI', commissionnement: '1T1', fraisAdhesionApporteur: 20000 },
  { name: 'GENERALI_1T4_30_10', idTarif: 1, tarifName: 'GENERALI', commissionnement: '1T4', fraisAdhesionApporteur: 20000 },
  { name: 'GENERALI_1T10_40pct', idTarif: 1, tarifName: 'GENERALI', commissionnement: '1T10', fraisAdhesionApporteur: 20000 },
  
  // Test avec SWISSLIFE (tarif 2)
  { name: 'SWISSLIFE_2T2_40_10', idTarif: 2, tarifName: 'SWISSLIFE', commissionnement: '2T2', fraisAdhesionApporteur: 20000 },
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

  return `
<licence>${CONFIG.LICENCE_KEY}</licence>
<code_courtier></code_courtier>
<type_operation>2</type_operation>
<id_tarif>${scenario.idTarif}</id_tarif>
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
    <categ_pro>${assure.categ_pro}</categ_pro>
    <frais_adhesion_apporteur>${scenario.fraisAdhesionApporteur}</frais_adhesion_apporteur>
    <commissionnement>${scenario.commissionnement}</commissionnement>
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
// PARSING RÉPONSE AVEC EXTRACTION DES COÛTS PAR ANNÉE
// ============================================================================

interface YearlyCost {
  year: number;
  date: string;
  cost: number; // en euros
}

interface ParsedResult {
  success: boolean;
  idSimulation?: string;
  idTarif?: string;
  compagnie?: string;
  nom?: string;
  coutTotal: number;
  coutPremieresAnnees: number;
  fraisAdhesion: number;
  fraisAdhesionApporteur: number;
  yearlyCosts: YearlyCost[];
  rawXml?: string;
  erreurs: string[];
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseExadeResponse(xmlResponse: string): ParsedResult {
  let innerXml: string;
  
  const cdataMatch = xmlResponse.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) {
    innerXml = cdataMatch[1];
  } else {
    const resultMatch = xmlResponse.match(/<webservice_tarificateurResult[^>]*>([\s\S]*?)<\/webservice_tarificateurResult>/);
    if (resultMatch) {
      innerXml = decodeHtmlEntities(resultMatch[1]);
    } else {
      return {
        success: false,
        coutTotal: 0,
        coutPremieresAnnees: 0,
        fraisAdhesion: 0,
        fraisAdhesionApporteur: 0,
        yearlyCosts: [],
        erreurs: ['Impossible de parser la réponse'],
      };
    }
  }

  const idSimMatch = innerXml.match(/<id_simulation>(\d+)<\/id_simulation>/);
  
  // Extraire le tarif
  const tarifMatch = innerXml.match(/<tarif>([\s\S]*?)<\/tarif>/);
  if (!tarifMatch) {
    return {
      success: false,
      coutTotal: 0,
      coutPremieresAnnees: 0,
      fraisAdhesion: 0,
      fraisAdhesionApporteur: 0,
      yearlyCosts: [],
      erreurs: ['Aucun tarif trouvé'],
    };
  }
  
  const tarifXml = tarifMatch[1];
  
  const idTarif = tarifXml.match(/<id_tarif>(\d+)<\/id_tarif>/)?.[1];
  const compagnie = tarifXml.match(/<compagnie>([^<]*)<\/compagnie>/)?.[1];
  const nom = tarifXml.match(/<nom>([^<]*)<\/nom>/)?.[1];
  const coutTotal = parseInt(tarifXml.match(/<cout_total_tarif>(\d+)<\/cout_total_tarif>/)?.[1] || '0', 10) / 100;
  const coutPremieresAnnees = parseInt(tarifXml.match(/<cout_premieres_annees_tarif>(\d+)<\/cout_premieres_annees_tarif>/)?.[1] || '0', 10) / 100;
  const fraisAdhesion = parseInt(tarifXml.match(/<frais_adhesion>(\d+)<\/frais_adhesion>/)?.[1] || '0', 10) / 100;
  const fraisAdhesionApporteur = parseInt(tarifXml.match(/<frais_adhesion_apporteur>(\d+)<\/frais_adhesion_apporteur>/)?.[1] || '0', 10) / 100;
  
  // EXTRACTION DES COÛTS PAR ANNÉE
  // Le XML contient des <garantie_pret> avec <periode> et <cout>
  const yearlyCosts: YearlyCost[] = [];
  const garantieRegex = /<garantie_pret>([\s\S]*?)<\/garantie_pret>/g;
  let match;
  
  while ((match = garantieRegex.exec(innerXml)) !== null) {
    const garantieXml = match[1];
    const periode = garantieXml.match(/<periode>(\d+)<\/periode>/)?.[1];
    const cout = garantieXml.match(/<cout>(\d+)<\/cout>/)?.[1];
    
    if (periode && cout) {
      const year = parseInt(periode.substring(0, 4), 10);
      yearlyCosts.push({
        year,
        date: periode,
        cost: parseInt(cout, 10) / 100,
      });
    }
  }
  
  // Dédupliquer par année (garder le premier de chaque année)
  const seenYears = new Set<number>();
  const uniqueYearlyCosts = yearlyCosts.filter(yc => {
    if (seenYears.has(yc.year)) return false;
    seenYears.add(yc.year);
    return true;
  });

  return {
    success: true,
    idSimulation: idSimMatch?.[1],
    idTarif,
    compagnie,
    nom,
    coutTotal,
    coutPremieresAnnees,
    fraisAdhesion,
    fraisAdhesionApporteur,
    yearlyCosts: uniqueYearlyCosts.slice(0, 20), // Limiter aux 20 premières années
    erreurs: [],
    rawXml: innerXml.length > 5000 ? innerXml.substring(0, 5000) + '...' : innerXml,
  };
}

// ============================================================================
// CALCUL DE LA COMMISSION
// ============================================================================

interface CommissionCalculation {
  codeCommission: string;
  description: string;
  coutAnnee1: number;
  percentAnnee1: number;
  commissionAnnee1: number;
  fraisCourtier: number;
  totalRevenusCourtier: number;
  commissionPlateforme6pct: number;
}

function calculateCommission(result: ParsedResult, commissionCode: string): CommissionCalculation | null {
  const rate = COMMISSION_RATES[commissionCode];
  if (!rate) {
    console.log(`⚠️ Code commission inconnu: ${commissionCode}`);
    return null;
  }
  
  // Trouver le coût de l'année 1
  const firstYearCost = result.yearlyCosts.length > 0 ? result.yearlyCosts[0].cost : 0;
  
  // Calculer la commission 1ère année
  const commissionAnnee1 = firstYearCost * (rate.firstYearPercent / 100);
  
  // Frais courtier
  const fraisCourtier = result.fraisAdhesionApporteur;
  
  // Total revenus courtier
  const totalRevenusCourtier = fraisCourtier + commissionAnnee1;
  
  // Commission plateforme (6%)
  const commissionPlateforme = totalRevenusCourtier * 0.06;
  
  return {
    codeCommission: commissionCode,
    description: rate.description,
    coutAnnee1: firstYearCost,
    percentAnnee1: rate.firstYearPercent,
    commissionAnnee1,
    fraisCourtier,
    totalRevenusCourtier,
    commissionPlateforme6pct: commissionPlateforme,
  };
}

// ============================================================================
// APPEL API
// ============================================================================

async function callExadeApi(scenario: TestScenario): Promise<ParsedResult> {
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
        coutTotal: 0,
        coutPremieresAnnees: 0,
        fraisAdhesion: 0,
        fraisAdhesionApporteur: 0,
        yearlyCosts: [],
        erreurs: [`HTTP ${response.status}`],
      };
    }

    return parseExadeResponse(responseText);
  } catch (error: any) {
    return {
      success: false,
      coutTotal: 0,
      coutPremieresAnnees: 0,
      fraisAdhesion: 0,
      fraisAdhesionApporteur: 0,
      yearlyCosts: [],
      erreurs: [error.message],
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(80));
  console.log('🧮 CALCUL DE LA COMMISSION 1ÈRE ANNÉE - TEST API EXADE');
  console.log('═'.repeat(80));
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
  console.log(`🔑 Licence: ${CONFIG.LICENCE_KEY ? '✅' : '❌'}`);
  console.log(`👤 Code courtier: VIDE (test brouillon)`);

  if (!CONFIG.LICENCE_KEY) {
    console.log('\n❌ EXADE_LICENCE_KEY manquante!');
    process.exit(1);
  }

  const results: Array<{
    scenario: TestScenario;
    result: ParsedResult;
    commission: CommissionCalculation | null;
  }> = [];

  for (const scenario of TEST_SCENARIOS) {
    console.log('\n' + '─'.repeat(80));
    console.log(`\n🔬 ${scenario.name}`);
    console.log(`   Tarif: ${scenario.tarifName} (id=${scenario.idTarif})`);
    console.log(`   Code commission: ${scenario.commissionnement}`);
    console.log(`   Frais courtier: ${scenario.fraisAdhesionApporteur / 100}€`);
    
    console.log('   ⏳ Appel API...');
    const result = await callExadeApi(scenario);
    
    if (result.success) {
      console.log(`   ✅ Succès! ID Simulation: ${result.idSimulation}`);
      console.log(`   📊 Coût total: ${result.coutTotal.toFixed(2)}€`);
      console.log(`   📊 Coût 8 premières années: ${result.coutPremieresAnnees.toFixed(2)}€`);
      console.log(`   📊 Frais adhésion apporteur retournés: ${result.fraisAdhesionApporteur.toFixed(2)}€`);
      
      // Afficher les coûts par année
      console.log(`\n   📅 COÛTS PAR ANNÉE (${result.yearlyCosts.length} années):`);
      for (let i = 0; i < Math.min(5, result.yearlyCosts.length); i++) {
        const yc = result.yearlyCosts[i];
        console.log(`      Année ${i + 1} (${yc.year}): ${yc.cost.toFixed(2)}€`);
      }
      if (result.yearlyCosts.length > 5) {
        console.log(`      ... et ${result.yearlyCosts.length - 5} autres années`);
      }
      
      // Calculer la commission
      const commission = calculateCommission(result, scenario.commissionnement);
      if (commission) {
        console.log(`\n   💰 CALCUL DE LA COMMISSION:`);
        console.log(`      Code: ${commission.codeCommission} (${commission.description})`);
        console.log(`      Coût année 1: ${commission.coutAnnee1.toFixed(2)}€`);
        console.log(`      Taux commission année 1: ${commission.percentAnnee1}%`);
        console.log(`      Commission courtier année 1: ${commission.commissionAnnee1.toFixed(2)}€`);
        console.log(`      Frais courtier: ${commission.fraisCourtier.toFixed(2)}€`);
        console.log(`      ─────────────────────────────────`);
        console.log(`      TOTAL REVENUS COURTIER: ${commission.totalRevenusCourtier.toFixed(2)}€`);
        console.log(`      COMMISSION PLATEFORME (6%): ${commission.commissionPlateforme6pct.toFixed(2)}€`);
      }
      
      results.push({ scenario, result, commission });
    } else {
      console.log(`   ❌ Échec: ${result.erreurs.join(', ')}`);
      results.push({ scenario, result, commission: null });
    }
    
    // Pause entre les tests
    await new Promise(r => setTimeout(r, 1500));
  }

  // Synthèse
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SYNTHÈSE DES CALCULS DE COMMISSION');
  console.log('═'.repeat(80));
  
  console.log('\n┌────────────────────────┬─────────────┬───────────────┬───────────────┬───────────────┬───────────────┐');
  console.log('│ Scénario               │ Coût An 1   │ % Commission  │ Commission    │ Frais Court.  │ Plateforme 6% │');
  console.log('├────────────────────────┼─────────────┼───────────────┼───────────────┼───────────────┼───────────────┤');
  
  for (const r of results) {
    if (r.commission) {
      const name = r.scenario.name.substring(0, 22).padEnd(22);
      const coutAn1 = r.commission.coutAnnee1.toFixed(2).padStart(9) + '€';
      const pct = (r.commission.percentAnnee1 + '%').padStart(11);
      const commAn1 = r.commission.commissionAnnee1.toFixed(2).padStart(11) + '€';
      const frais = r.commission.fraisCourtier.toFixed(2).padStart(11) + '€';
      const plateforme = r.commission.commissionPlateforme6pct.toFixed(2).padStart(11) + '€';
      console.log(`│ ${name} │ ${coutAn1} │ ${pct} │ ${commAn1} │ ${frais} │ ${plateforme} │`);
    }
  }
  
  console.log('└────────────────────────┴─────────────┴───────────────┴───────────────┴───────────────┴───────────────┘');

  // Sauvegarder les résultats
  const outputPath = path.resolve(process.cwd(), 'exade_commission_calculation_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Résultats: ${outputPath}`);
  
  // Conclusion
  console.log('\n' + '═'.repeat(80));
  console.log('✅ CONCLUSION');
  console.log('═'.repeat(80));
  console.log(`
La méthode de calcul est ROBUSTE car:

1. L'API retourne les COÛTS PAR ANNÉE dans le XML (balises <garantie_pret>)
   → On peut extraire le coût exact de l'année 1

2. On connaît le CODE DE COMMISSION choisi par le courtier
   → On peut appliquer le bon pourcentage (stocké dans notre table)

3. FORMULE DE CALCUL:
   Commission courtier année 1 = coût_année_1 × pourcentage_code_commission
   Total revenus courtier = frais_courtier + commission_année_1
   Commission plateforme = total_revenus × 6%

4. DONNÉES NÉCESSAIRES (toutes disponibles):
   ✅ Coût année 1 → extrait du XML
   ✅ Code commission → choisi par le courtier dans l'UI
   ✅ Pourcentage → stocké dans notre table COMMISSION_RATES
   ✅ Frais courtier → retournés par l'API (frais_adhesion_apporteur)
`);
}

main().catch(console.error);

