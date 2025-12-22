/**
 * Script de test de connexion à l'API Exade
 * 
 * Ce script vérifie :
 * 1. Les variables d'environnement nécessaires
 * 2. La connexion à l'API Exade
 * 3. La tarification avec des données de test
 * 
 * Usage: npx ts-node scripts/test-exade-connection.ts
 * Ou:    npx tsx scripts/test-exade-connection.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement (essayer .env.local puis .env)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('[ENV] Chargé depuis .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('[ENV] Chargé depuis .env');
} else {
  console.warn('[ENV] Aucun fichier .env trouvé!');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // URL de TARIFICATION (staging) - ne crée PAS de simulation sur le dashboard courtier
  // Pour créer un devis en production, utiliser: https://www.exade.fr/4DSOAP
  SOAP_URL: process.env.EXADE_SOAP_URL || 'https://stage-product.exade.fr/4DSOAP',
  
  // Credentials depuis .env
  LICENCE_KEY: process.env.EXADE_LICENCE_KEY || '',
  PARTNER_CODE: process.env.EXADE_PARTNER_CODE || '815178',
  SSO_KEY: process.env.EXADE_SSO_KEY || '',
  
  // SOAP Action
  SOAP_ACTION: 'A_WebService#webservice_tarificateur',
};

// ============================================================================
// DONNÉES DE TEST RÉALISTES
// ============================================================================

const TEST_DATA = {
  // Assuré fictif mais réaliste
  assure: {
    numero: 1,
    sexe: 'H',
    nom: 'DUPONT',
    nom_naissance: 'DUPONT',
    prenom: 'Jean',
    date_naissance: '19850315', // 15 mars 1985 - 39 ans
    adresse: '15 rue de la République',
    code_postal: '75001',
    ville: 'Paris',
    lieu_naissance: 'Lyon',
    email: 'test@gmb-courtage.fr',
    portable: '+33 6 12 34 56 78',
    fumeur: 'N',
    categ_pro: 1, // Salarié cadre
    detail_profession: 'Développeur informatique',
    politique_expose: 'N',
    proche_politique_expose: 'N',
    franchise: 90,
    deplacement_pro: 1,
    travaux_manuels: 0,
    travaux_hauteur: 1,
    manip_produit_dangereux: 1,
    encours_lemoine: 0,
    velIdPaysNaissance: 118, // France
    idnationalite: 84, // Française
    idPaysResidenceFiscale: 84,
  },
  
  // Prêt immobilier classique
  pret: {
    numero: 1,
    type_pret: 1, // Amortissable
    capital: 20000000, // 200 000 € en centimes
    taux: 350, // 3.50% en centièmes
    type_taux: 1, // Fixe
    duree: 240, // 20 ans
    differe: 0,
    amortissement: 12, // Mensuel
  },
  
  // Garantie Décès/PTIA/ITT/IPT
  garantie: {
    id_assure: 1,
    id_pret: 1,
    garantie: 2, // Décès/PTIA/ITT/IPT
    quotite: 100,
  },
};

// ============================================================================
// CONSTRUCTION DU XML
// ============================================================================

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

function buildTarificationXml(): string {
  const dateEffet = getDateEffet();
  const dateDeblocage = dateEffet;
  
  const { assure, pret, garantie } = TEST_DATA;
  
  // XML identique à l'exemple Postman de la documentation Exade
  // Toutes les balises sont dans l'ordre exact de la doc
  // NOTE: Sans <id_tarif>, Exade retourne TOUS les tarifs disponibles
  return `
<licence>${CONFIG.LICENCE_KEY}</licence>
<code_courtier>${CONFIG.PARTNER_CODE}</code_courtier>
<type_operation>2</type_operation>
<retournerLesErreurs/>
<simulation>
  <date_effet>${dateEffet}</date_effet>
  <id_objetdufinancement>1</id_objetdufinancement>
  <frac_assurance>12</frac_assurance>
  <assure>
    <statut>1</statut>
    <type_adhesion>3</type_adhesion>
    <numero>${assure.numero}</numero>
    <sexe>${assure.sexe}</sexe>
    <nom>${assure.nom}</nom>
    <nom_naissance>${assure.nom_naissance}</nom_naissance>
    <prenom>${assure.prenom}</prenom>
    <adresse>${assure.adresse}</adresse>
    <ville>${assure.ville}</ville>
    <code_postal>${assure.code_postal}</code_postal>
    <lieu_naissance>${assure.lieu_naissance}</lieu_naissance>
    <velIdPaysNaissance>${assure.velIdPaysNaissance}</velIdPaysNaissance>
    <idnationalite>${assure.idnationalite}</idnationalite>
    <idPaysResidenceFiscale>${assure.idPaysResidenceFiscale}</idPaysResidenceFiscale>
    <codepostalvillenaissance></codepostalvillenaissance>
    <date_naissance>${assure.date_naissance}</date_naissance>
    <franchise>${assure.franchise}</franchise>
    <fumeur>${assure.fumeur}</fumeur>
    <deplacement_pro>${assure.deplacement_pro}</deplacement_pro>
    <travaux_manuels>${assure.travaux_manuels}</travaux_manuels>
    <travaux_hauteur>${assure.travaux_hauteur}</travaux_hauteur>
    <manip_produit_dangereux>${assure.manip_produit_dangereux}</manip_produit_dangereux>
    <telephone></telephone>
    <portable>${assure.portable}</portable>
    <email>${assure.email}</email>
    <politique_expose>${assure.politique_expose}</politique_expose>
    <proche_politique_expose>${assure.proche_politique_expose}</proche_politique_expose>
    <frais_adhesion_apporteur>15000</frais_adhesion_apporteur>
    <encours_lemoine>${assure.encours_lemoine}</encours_lemoine>
    <categ_pro>${assure.categ_pro}</categ_pro>
    <detail_profession>${assure.detail_profession}</detail_profession>
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
    <date_deblocage>${dateDeblocage}</date_deblocage>
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

function getDateEffet(): string {
  // Date effet = aujourd'hui + 3 mois (format AAAAMMJJ)
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// ============================================================================
// APPEL API
// ============================================================================

async function callExadeApi(url: string, soapBody: string): Promise<string> {
  console.log('\n📡 Appel API Exade...');
  console.log(`   URL: ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': CONFIG.SOAP_ACTION,
    },
    body: soapBody,
  });
  
  const responseText = await response.text();
  
  console.log(`   Status: ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} - ${responseText}`);
  }
  
  return responseText;
}

// ============================================================================
// PARSING RÉPONSE
// ============================================================================

interface ExadeResponse {
  success: boolean;
  id_simulation?: string;
  tarifs?: Array<{
    id_tarif: string;
    compagnie: string;
    nom: string;
    cout_total: number;
    mensualite?: number;
    frais_adhesion?: number;
    erreur?: string;
  }>;
  erreurs?: string[];
  rawResponse?: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseExadeResponse(xmlResponse: string): ExadeResponse {
  // Extraire le CDATA de la réponse SOAP
  let cdataMatch = xmlResponse.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  let innerXml: string;
  
  if (cdataMatch) {
    innerXml = cdataMatch[1];
  } else {
    // Exade peut aussi retourner le contenu encodé en HTML entities
    // au lieu de CDATA - on essaie d'extraire le contenu de webservice_tarificateurResult
    const resultMatch = xmlResponse.match(/<webservice_tarificateurResult[^>]*>([\s\S]*?)<\/webservice_tarificateurResult>/);
    
    if (resultMatch) {
      // Décoder les entités HTML
      innerXml = decodeHtmlEntities(resultMatch[1]);
    } else {
      // Vérifier si c'est une erreur SOAP Fault
      if (xmlResponse.includes('SOAP-ENV:Fault') || xmlResponse.includes('faultstring')) {
        const faultMatch = xmlResponse.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/);
        return {
          success: false,
          erreurs: [faultMatch ? faultMatch[1] : 'Erreur SOAP inconnue'],
          rawResponse: xmlResponse,
        };
      }
      
      return {
        success: false,
        erreurs: ['Impossible de parser la réponse - pas de données trouvées'],
        rawResponse: xmlResponse,
      };
    }
  }
  
  // Extraire l'ID de simulation
  const idSimMatch = innerXml.match(/<id_simulation>(\d+)<\/id_simulation>/);
  const idSimulation = idSimMatch ? idSimMatch[1] : undefined;
  
  // Extraire les tarifs
  const tarifs: ExadeResponse['tarifs'] = [];
  const tarifRegex = /<tarif>([\s\S]*?)<\/tarif>/g;
  let tarifMatch;
  
  while ((tarifMatch = tarifRegex.exec(innerXml)) !== null) {
    const tarifXml = tarifMatch[1];
    
    const idTarif = tarifXml.match(/<id_tarif>(\d+)<\/id_tarif>/)?.[1] || '';
    const compagnie = tarifXml.match(/<compagnie>([^<]*)<\/compagnie>/)?.[1] || '';
    const nom = tarifXml.match(/<nom>([^<]*)<\/nom>/)?.[1] || '';
    const coutTotal = parseInt(tarifXml.match(/<cout_total_tarif>(\d+)<\/cout_total_tarif>/)?.[1] || '0', 10);
    const fraisAdhesion = parseInt(tarifXml.match(/<frais_adhesion>(\d+)<\/frais_adhesion>/)?.[1] || '0', 10);
    const erreur = tarifXml.match(/<erreur>([^<]*)<\/erreur>/)?.[1];
    
    tarifs.push({
      id_tarif: idTarif,
      compagnie,
      nom,
      cout_total: coutTotal / 100, // Convertir centimes en euros
      frais_adhesion: fraisAdhesion / 100,
      erreur,
    });
  }
  
  // Extraire les erreurs globales
  const erreurs: string[] = [];
  const erreurRegex = /<erreur>([^<]+)<\/erreur>/g;
  let erreurMatch;
  while ((erreurMatch = erreurRegex.exec(innerXml)) !== null) {
    if (!erreurMatch[1].includes('tarif')) {
      erreurs.push(erreurMatch[1]);
    }
  }
  
  return {
    success: tarifs.length > 0 || !!idSimulation,
    id_simulation: idSimulation,
    tarifs: tarifs.length > 0 ? tarifs : undefined,
    erreurs: erreurs.length > 0 ? erreurs : undefined,
    rawResponse: innerXml.substring(0, 2000) + (innerXml.length > 2000 ? '...' : ''),
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('🔌 TEST DE CONNEXION À L\'API EXADE');
  console.log('═'.repeat(70));
  
  // 1. Vérification des variables d'environnement
  console.log('\n📋 ÉTAPE 1: Vérification des variables d\'environnement');
  console.log('─'.repeat(50));
  
  const checks = [
    { name: 'EXADE_LICENCE_KEY', value: CONFIG.LICENCE_KEY, required: true },
    { name: 'EXADE_PARTNER_CODE', value: CONFIG.PARTNER_CODE, required: true },
    { name: 'EXADE_SOAP_URL', value: CONFIG.SOAP_URL, required: false },
    { name: 'EXADE_SSO_KEY', value: CONFIG.SSO_KEY, required: false },
  ];
  
  let allOk = true;
  
  for (const check of checks) {
    const hasValue = !!check.value && check.value.length > 0;
    const status = hasValue ? '✅' : (check.required ? '❌' : '⚠️');
    const display = hasValue ? `${check.value.substring(0, 10)}...` : 'NON DÉFINI';
    
    console.log(`   ${status} ${check.name}: ${display}`);
    
    if (check.required && !hasValue) {
      allOk = false;
    }
  }
  
  if (!allOk) {
    console.log('\n❌ ERREUR: Variables d\'environnement manquantes!');
    console.log('\n📝 Ce dont tu as besoin de Multi-Impact / Exade:');
    console.log('   1. EXADE_LICENCE_KEY - Clé de licence WebService (OBLIGATOIRE)');
    console.log('   2. EXADE_PARTNER_CODE - Code courtier (tu l\'as: 815178)');
    console.log('\n💡 Ajoute ces variables dans ton fichier .env.local:');
    console.log('   EXADE_LICENCE_KEY=ta_cle_ici');
    console.log('   EXADE_PARTNER_CODE=815178');
    process.exit(1);
  }
  
  console.log('\n   ✅ Toutes les variables sont configurées!');
  
  // 2. Construction de la requête
  console.log('\n📋 ÉTAPE 2: Construction de la requête SOAP');
  console.log('─'.repeat(50));
  
  const innerXml = buildTarificationXml();
  const soapEnvelope = buildSoapEnvelope(innerXml);
  
  console.log(`   📄 Taille du XML: ${soapEnvelope.length} caractères`);
  console.log(`   📅 Date effet: ${getDateEffet()}`);
  console.log(`   👤 Assuré test: ${TEST_DATA.assure.prenom} ${TEST_DATA.assure.nom}`);
  console.log(`   🏦 Prêt: ${TEST_DATA.pret.capital / 100}€ sur ${TEST_DATA.pret.duree} mois`);
  
  // 3. Appel API Exade
  console.log('\n📋 ÉTAPE 3: Appel API EXADE');
  console.log('─'.repeat(50));
  console.log(`   🌐 URL: ${CONFIG.SOAP_URL}`);
  
  try {
    const response = await callExadeApi(CONFIG.SOAP_URL, soapEnvelope);
    const parsed = parseExadeResponse(response);
    
    if (parsed.success) {
      console.log('\n   ✅ SUCCÈS! Connexion établie avec Exade');
      
      if (parsed.id_simulation) {
        console.log(`   📝 ID Simulation: ${parsed.id_simulation}`);
      }
      
      if (parsed.tarifs && parsed.tarifs.length > 0) {
        console.log(`\n   📊 ${parsed.tarifs.length} tarif(s) reçu(s):`);
        console.log('   ' + '─'.repeat(60));
        
        for (const tarif of parsed.tarifs) {
          if (tarif.erreur) {
            console.log(`   ⚠️  ${tarif.compagnie} ${tarif.nom}: ERREUR - ${tarif.erreur}`);
          } else {
            console.log(`   ✅ ${tarif.compagnie} ${tarif.nom}`);
            console.log(`      Coût total: ${tarif.cout_total.toFixed(2)}€`);
            if (tarif.frais_adhesion) {
              console.log(`      Frais adhésion: ${tarif.frais_adhesion.toFixed(2)}€`);
            }
          }
        }
      }
      
      if (parsed.erreurs && parsed.erreurs.length > 0) {
        console.log('\n   ⚠️  Erreurs/Avertissements:');
        for (const err of parsed.erreurs) {
          console.log(`      - ${err}`);
        }
      }
    } else {
      console.log('\n   ❌ ÉCHEC de la tarification');
      
      if (parsed.erreurs) {
        console.log('\n   Erreurs Exade:');
        for (const err of parsed.erreurs) {
          console.log(`      ❌ ${err}`);
        }
      }
      
      // Analyser l'erreur
      console.log('\n   🔍 Analyse de l\'erreur:');
      
      const rawResp = parsed.rawResponse || '';
      
      if (rawResp.includes('[100]') || rawResp.includes('licence')) {
        console.log('      → Problème de LICENCE: La clé de licence est invalide ou expirée');
        console.log('      → Action: Contacter Multi-Impact pour obtenir une nouvelle clé');
      } else if (rawResp.includes('[200]') || rawResp.includes('courtier')) {
        console.log('      → Problème de CODE COURTIER: Le code 815178 n\'est pas reconnu');
        console.log('      → Action: Vérifier le code courtier avec Multi-Impact');
      } else if (rawResp.includes('[300]')) {
        console.log('      → Problème de DONNÉES: Certaines données sont manquantes ou invalides');
      } else {
        console.log('      → Erreur non identifiée, voir les détails ci-dessous');
      }
      
      console.log('\n   📄 Réponse brute (extrait):');
      console.log('   ' + (parsed.rawResponse || response).substring(0, 500));
    }
    
  } catch (error: any) {
    console.log(`\n   ❌ ERREUR lors de l'appel API:`);
    console.log(`      ${error.message}`);
    
    if (error.message.includes('fetch')) {
      console.log('\n   💡 Vérifiez votre connexion internet');
    }
  }
  
  // 4. Résumé
  console.log('\n' + '═'.repeat(70));
  console.log('📋 RÉSUMÉ - CE QU\'IL FAUT POUR QUE ÇA FONCTIONNE:');
  console.log('═'.repeat(70));
  console.log(`
   📦 Variables d'environnement nécessaires:
   
   ┌─────────────────────────┬─────────────────────────────────────────────┐
   │ Variable                │ Description                                 │
   ├─────────────────────────┼─────────────────────────────────────────────┤
   │ EXADE_LICENCE_KEY       │ Clé de licence WebService (fournie par      │
   │                         │ Multi-Impact lors de la création du compte) │
   ├─────────────────────────┼─────────────────────────────────────────────┤
   │ EXADE_PARTNER_CODE      │ Code courtier Exade (tu as: 815178)         │
   │                         │ C'est suffisant si la licence est valide!   │
   └─────────────────────────┴─────────────────────────────────────────────┘
   
   ❓ QUESTION: Est-ce que le code courtier seul suffit?
   
   → NON, tu as aussi besoin de la LICENCE KEY (clé WebService)
   → Cette clé est différente du code courtier
   → Elle doit être demandée à Multi-Impact / Exade
   
   📧 Pour obtenir la licence:
   → Contacter Multi-Impact avec ton code courtier 815178
   → Demander l'activation du WebService pour ton compte
   → Ils te fourniront une EXADE_LICENCE_KEY
`);
}

// Exécution
main().catch(console.error);

