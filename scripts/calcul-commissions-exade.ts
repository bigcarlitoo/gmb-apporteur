/**
 * Script de calcul des commissions Exade
 * 
 * Ce script calcule les commissions estimées que le courtier recevra
 * pour chaque tarif en fonction du code de commission choisi.
 * 
 * Usage: npx tsx scripts/calcul-commissions-exade.ts
 */

// ============================================================================
// TARIFS RÉCUPÉRÉS DES TESTS (23 tarifs)
// ============================================================================

interface TarifInfo {
  id: string;
  compagnie: string;
  nom: string;
  cout_total: number; // Coût total sur la durée du prêt (en €)
  duree_mois: number;
}

// Données des tests (prêt 200 000€ sur 20 ans = 240 mois)
const TARIFS: TarifInfo[] = [
  { id: '1', compagnie: 'GENERALI', nom: '7301 CI', cout_total: 6942.53, duree_mois: 240 },
  { id: '2', compagnie: 'SWISS LIFE', nom: 'ASSUREA PREMIUM CRD', cout_total: 5075.80, duree_mois: 240 },
  { id: '3', compagnie: 'MNCAP', nom: 'ALTERNATIVE 1350', cout_total: 7839.81, duree_mois: 240 },
  { id: '4', compagnie: 'CNP', nom: '2901D', cout_total: 5509.60, duree_mois: 240 },
  { id: '5', compagnie: 'AXA', nom: '4044/0000', cout_total: 7741.96, duree_mois: 240 },
  { id: '6', compagnie: 'AXA', nom: 'DIGITAL CI 4044/2000', cout_total: 5611.60, duree_mois: 240 },
  { id: '7', compagnie: 'CNP', nom: 'A215W', cout_total: 10291.60, duree_mois: 240 },
  { id: '8', compagnie: 'GENERALI', nom: '7301 CRD', cout_total: 6251.45, duree_mois: 240 },
  { id: '9', compagnie: 'HARMONIE', nom: 'OPEN EMPRUNTEUR CRD', cout_total: 4679.61, duree_mois: 240 },
  { id: '10', compagnie: 'MAIF', nom: 'AVANTAGE EMPRUNTEUR CI', cout_total: 7268.97, duree_mois: 240 },
  { id: '12', compagnie: 'GROUPAMA GAN', nom: 'PERFORMANCE 6092', cout_total: 6014.80, duree_mois: 240 },
  { id: '13', compagnie: 'SWISS LIFE', nom: 'ASSUREA PREMIUM CI', cout_total: 6060.40, duree_mois: 240 },
  { id: '14', compagnie: 'HARMONIE', nom: 'OPEN EMPRUNTEUR CI', cout_total: 6520.10, duree_mois: 240 },
  { id: '17', compagnie: 'MAIF', nom: 'AVANTAGE EMPRUNTEUR CRD', cout_total: 6117.88, duree_mois: 240 },
  { id: '18', compagnie: 'SURAVENIR', nom: 'PLATINUM', cout_total: 6622.00, duree_mois: 240 },
  { id: '19', compagnie: 'PREVOIR', nom: 'SERENITE CRD', cout_total: 4630.60, duree_mois: 240 },
  { id: '20', compagnie: 'PREVOIR', nom: 'SERENITE CI', cout_total: 6048.40, duree_mois: 240 },
  { id: '23', compagnie: 'GROUPAMA GAN', nom: 'PERFORMANCE CRD', cout_total: 5087.33, duree_mois: 240 },
  { id: '25', compagnie: 'HARMONIE', nom: 'OPEN PLUS CRD', cout_total: 4950.16, duree_mois: 240 },
  { id: '26', compagnie: 'HARMONIE', nom: 'OPEN PLUS CI', cout_total: 6858.54, duree_mois: 240 },
  { id: '29', compagnie: 'MALAKOFF', nom: 'LATITUDE CI', cout_total: 5219.20, duree_mois: 240 },
  { id: '30', compagnie: 'MALAKOFF', nom: 'LATITUDE CRD', cout_total: 4285.40, duree_mois: 240 },
  { id: '31', compagnie: 'ORADEA', nom: 'ESSENTIEL CRD', cout_total: 7835.44, duree_mois: 240 },
];

// ============================================================================
// CODES DE COMMISSION (Section III.7 de la doc)
// ============================================================================

interface CommissionCode {
  code: string;
  label: string;
  type: 'lineaire' | 'degressif';
  taux_annee1: number; // en %
  taux_suivantes: number; // en %
}

// Codes génériques (même structure pour tous les tarifs)
const COMMISSION_CODES: CommissionCode[] = [
  { code: 'T1', label: 'Palier 1 (0%)', type: 'lineaire', taux_annee1: 0, taux_suivantes: 0 },
  { code: 'T2', label: 'Palier 2 (5%)', type: 'lineaire', taux_annee1: 5, taux_suivantes: 5 },
  { code: 'T3', label: 'Palier 3 (10%)', type: 'lineaire', taux_annee1: 10, taux_suivantes: 10 },
  { code: 'T4', label: 'Palier 4 (30%/10%) - DÉFAUT', type: 'degressif', taux_annee1: 30, taux_suivantes: 10 },
  { code: 'T5', label: 'Palier 5 (15%)', type: 'lineaire', taux_annee1: 15, taux_suivantes: 15 },
  { code: 'T6', label: 'Palier 6 (20%)', type: 'lineaire', taux_annee1: 20, taux_suivantes: 20 },
  { code: 'T7', label: 'Palier 7 (25%)', type: 'lineaire', taux_annee1: 25, taux_suivantes: 25 },
  { code: 'T8', label: 'Palier 8 (30%)', type: 'lineaire', taux_annee1: 30, taux_suivantes: 30 },
  { code: 'T9', label: 'Palier 9 (35%)', type: 'lineaire', taux_annee1: 35, taux_suivantes: 35 },
  { code: 'T10', label: 'Palier 10 (40%)', type: 'lineaire', taux_annee1: 40, taux_suivantes: 40 },
];

// ============================================================================
// CALCUL DES COMMISSIONS
// ============================================================================

interface CommissionResult {
  tarif: TarifInfo;
  code: CommissionCode;
  prime_mensuelle: number;
  commission_annee1: number;
  commission_annees_suivantes: number;
  commission_totale: number;
}

function calculerCommission(tarif: TarifInfo, code: CommissionCode): CommissionResult {
  const duree_annees = tarif.duree_mois / 12;
  const prime_mensuelle = tarif.cout_total / tarif.duree_mois;
  const prime_annuelle = prime_mensuelle * 12;
  
  // Calcul commission année 1
  const commission_annee1 = (code.taux_annee1 / 100) * prime_annuelle;
  
  // Calcul commissions années suivantes
  const annees_suivantes = duree_annees - 1;
  const commission_annees_suivantes = (code.taux_suivantes / 100) * prime_annuelle * annees_suivantes;
  
  // Total
  const commission_totale = commission_annee1 + commission_annees_suivantes;
  
  return {
    tarif,
    code,
    prime_mensuelle,
    commission_annee1,
    commission_annees_suivantes,
    commission_totale,
  };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('═'.repeat(100));
  console.log('💰 CALCUL DES COMMISSIONS EXADE - ANALYSE DÉTAILLÉE');
  console.log('═'.repeat(100));
  console.log('\n📊 Base de calcul : Prêt de 200 000€ sur 20 ans\n');

  // -------------------------------------------------------------------------
  // 1. Tableau comparatif des commissions par tarif (code T4 par défaut)
  // -------------------------------------------------------------------------
  
  console.log('═'.repeat(100));
  console.log('📈 COMMISSIONS PAR TARIF (Code T4 = 30% 1ère année / 10% suivantes)');
  console.log('═'.repeat(100));
  
  const codeT4 = COMMISSION_CODES.find(c => c.code === 'T4')!;
  
  console.log('\n┌──────────────────────────────────────────────┬───────────────┬───────────────┬───────────────┬───────────────┐');
  console.log('│ Tarif                                        │ Coût total    │ Prime/mois    │ Comm. année 1 │ Comm. TOTALE  │');
  console.log('├──────────────────────────────────────────────┼───────────────┼───────────────┼───────────────┼───────────────┤');
  
  const resultsT4: CommissionResult[] = [];
  
  for (const tarif of TARIFS.sort((a, b) => b.cout_total - a.cout_total)) {
    const result = calculerCommission(tarif, codeT4);
    resultsT4.push(result);
    
    const tarifLabel = `${tarif.compagnie} ${tarif.nom}`.substring(0, 44).padEnd(44);
    const coutTotal = `${tarif.cout_total.toFixed(0)}€`.padStart(12);
    const primeMensuelle = `${result.prime_mensuelle.toFixed(2)}€`.padStart(12);
    const commAnnee1 = `${result.commission_annee1.toFixed(0)}€`.padStart(12);
    const commTotale = `${result.commission_totale.toFixed(0)}€`.padStart(12);
    
    console.log(`│ ${tarifLabel} │ ${coutTotal} │ ${primeMensuelle} │ ${commAnnee1} │ ${commTotale} │`);
  }
  
  console.log('└──────────────────────────────────────────────┴───────────────┴───────────────┴───────────────┴───────────────┘');
  
  // Stats
  const moyenneCommTotale = resultsT4.reduce((sum, r) => sum + r.commission_totale, 0) / resultsT4.length;
  const moyenneCommAnnee1 = resultsT4.reduce((sum, r) => sum + r.commission_annee1, 0) / resultsT4.length;
  const maxCommTotale = Math.max(...resultsT4.map(r => r.commission_totale));
  const minCommTotale = Math.min(...resultsT4.map(r => r.commission_totale));
  
  console.log(`\n📊 STATISTIQUES (Code T4) :`);
  console.log(`   Commission année 1 moyenne : ${moyenneCommAnnee1.toFixed(0)}€`);
  console.log(`   Commission totale moyenne  : ${moyenneCommTotale.toFixed(0)}€`);
  console.log(`   Commission totale min      : ${minCommTotale.toFixed(0)}€`);
  console.log(`   Commission totale max      : ${maxCommTotale.toFixed(0)}€`);

  // -------------------------------------------------------------------------
  // 2. Comparaison des codes de commission pour un tarif exemple
  // -------------------------------------------------------------------------
  
  console.log('\n' + '═'.repeat(100));
  console.log('📈 IMPACT DU CODE COMMISSION SUR UN TARIF (GENERALI 7301 CI)');
  console.log('═'.repeat(100));
  
  const tarifExemple = TARIFS.find(t => t.id === '1')!;
  
  console.log(`\n🎯 Tarif : ${tarifExemple.compagnie} ${tarifExemple.nom}`);
  console.log(`   Coût total : ${tarifExemple.cout_total.toFixed(2)}€`);
  console.log(`   Prime mensuelle : ${(tarifExemple.cout_total / tarifExemple.duree_mois).toFixed(2)}€\n`);
  
  console.log('┌──────────────────────────────────────────┬───────────────┬───────────────┬───────────────┐');
  console.log('│ Code commission                          │ Comm. année 1 │ Comm. an 2-20 │ Comm. TOTALE  │');
  console.log('├──────────────────────────────────────────┼───────────────┼───────────────┼───────────────┤');
  
  for (const code of COMMISSION_CODES) {
    const result = calculerCommission(tarifExemple, code);
    
    const codeLabel = `${code.code} - ${code.label}`.substring(0, 40).padEnd(40);
    const commAnnee1 = `${result.commission_annee1.toFixed(0)}€`.padStart(12);
    const commSuiv = `${result.commission_annees_suivantes.toFixed(0)}€`.padStart(12);
    const commTotale = `${result.commission_totale.toFixed(0)}€`.padStart(12);
    
    console.log(`│ ${codeLabel} │ ${commAnnee1} │ ${commSuiv} │ ${commTotale} │`);
  }
  
  console.log('└──────────────────────────────────────────┴───────────────┴───────────────┴───────────────┘');

  // -------------------------------------------------------------------------
  // 3. Simulation revenus courtier avec plateforme
  // -------------------------------------------------------------------------
  
  console.log('\n' + '═'.repeat(100));
  console.log('💼 SIMULATION REVENUS COURTIER + PLATEFORME GMB');
  console.log('═'.repeat(100));
  
  const fraisCourtage = 200; // € facturés au client
  const tauxPlateforme = 5; // % prélevé par GMB
  
  // Exemple avec SWISS LIFE (moins cher) et code T4
  const tarifSwiss = TARIFS.find(t => t.id === '2')!;
  const commSwiss = calculerCommission(tarifSwiss, codeT4);
  
  console.log(`\n📋 Exemple : ${tarifSwiss.compagnie} ${tarifSwiss.nom}`);
  console.log('─'.repeat(60));
  
  const revenuBrutCourtier = fraisCourtage + commSwiss.commission_totale;
  const revenuAnnee1 = fraisCourtage + commSwiss.commission_annee1;
  const commissionPlateforme = revenuBrutCourtier * (tauxPlateforme / 100);
  const revenuNetCourtier = revenuBrutCourtier - commissionPlateforme;
  
  console.log(`\n💰 REVENUS COURTIER (sur toute la durée du prêt) :`);
  console.log(`   Frais de courtage (client)     : ${fraisCourtage.toFixed(0)}€`);
  console.log(`   Commission Exade année 1       : ${commSwiss.commission_annee1.toFixed(0)}€`);
  console.log(`   Commission Exade années 2-20   : ${commSwiss.commission_annees_suivantes.toFixed(0)}€`);
  console.log(`   ─────────────────────────────────────────`);
  console.log(`   TOTAL BRUT                     : ${revenuBrutCourtier.toFixed(0)}€`);
  
  console.log(`\n📊 PRÉLÈVEMENT PLATEFORME GMB (${tauxPlateforme}%) :`);
  console.log(`   Sur frais courtage             : ${(fraisCourtage * tauxPlateforme / 100).toFixed(0)}€`);
  console.log(`   Sur commission année 1         : ${(commSwiss.commission_annee1 * tauxPlateforme / 100).toFixed(0)}€`);
  console.log(`   (Années 2+ : pas de prélèvement ou à définir)`);
  console.log(`   ─────────────────────────────────────────`);
  console.log(`   TOTAL PRÉLEVÉ (année 1)        : ${((fraisCourtage + commSwiss.commission_annee1) * tauxPlateforme / 100).toFixed(0)}€`);
  
  console.log(`\n✅ REVENU NET COURTIER ANNÉE 1   : ${(revenuAnnee1 * (1 - tauxPlateforme/100)).toFixed(0)}€`);

  // -------------------------------------------------------------------------
  // 4. Tableau comparatif par dossier
  // -------------------------------------------------------------------------
  
  console.log('\n' + '═'.repeat(100));
  console.log('📊 REVENUS ESTIMÉS PAR DOSSIER (avec frais courtage 200€)');
  console.log('═'.repeat(100));
  
  console.log('\n┌──────────────────────────────────────────────┬───────────────┬───────────────┬───────────────┐');
  console.log('│ Tarif                                        │ Frais + Comm  │ Part GMB (5%) │ Net Courtier  │');
  console.log('│                                              │ ANNÉE 1       │ ANNÉE 1       │ ANNÉE 1       │');
  console.log('├──────────────────────────────────────────────┼───────────────┼───────────────┼───────────────┤');
  
  for (const tarif of TARIFS.sort((a, b) => b.cout_total - a.cout_total).slice(0, 10)) {
    const result = calculerCommission(tarif, codeT4);
    const revenuAn1 = fraisCourtage + result.commission_annee1;
    const partGMB = revenuAn1 * (tauxPlateforme / 100);
    const netCourtier = revenuAn1 - partGMB;
    
    const tarifLabel = `${tarif.compagnie} ${tarif.nom}`.substring(0, 44).padEnd(44);
    const revenu = `${revenuAn1.toFixed(0)}€`.padStart(12);
    const gmb = `${partGMB.toFixed(0)}€`.padStart(12);
    const net = `${netCourtier.toFixed(0)}€`.padStart(12);
    
    console.log(`│ ${tarifLabel} │ ${revenu} │ ${gmb} │ ${net} │`);
  }
  
  console.log('└──────────────────────────────────────────────┴───────────────┴───────────────┴───────────────┘');

  // -------------------------------------------------------------------------
  // 5. Conclusions
  // -------------------------------------------------------------------------
  
  console.log('\n' + '═'.repeat(100));
  console.log('🎯 CONCLUSIONS IMPORTANTES');
  console.log('═'.repeat(100));
  
  console.log(`
📌 CE QUE LE COURTIER GAGNE PAR DOSSIER (prêt 200k€ sur 20 ans) :

   1. FRAIS DE COURTAGE : ~200€ (facturé au client, immédiat)
   2. COMMISSION EXADE ANNÉE 1 : ~90-130€ (versé mensuellement par Exade)
   3. COMMISSION EXADE ANNÉES 2-20 : ~570-820€ (versé sur 19 ans)
   
   ➜ TOTAL ANNÉE 1 : ~290-330€ par dossier
   ➜ TOTAL SUR 20 ANS : ~860-1150€ par dossier

📌 CE QUE GMB PRÉLÈVE (5%) :

   ➜ Sur les frais courtage : ~10€
   ➜ Sur la commission année 1 : ~4.5-6.5€
   ➜ TOTAL GMB ANNÉE 1 : ~14.5-16.5€ par dossier
   
📌 POURQUOI LE CODE COMMISSION EST IMPORTANT :

   Le courtier peut choisir :
   - T1 (0%) : Ne touche rien d'Exade → JAMAIS utilisé sauf cas spécial
   - T4 (30%/10%) : Standard, bon équilibre
   - T10 (40%) : Maximum, mais peut nécessiter un accord avec Exade
   
   La différence entre T4 et T10 sur GENERALI :
   - T4 : ${calculerCommission(tarifExemple, codeT4).commission_totale.toFixed(0)}€ total
   - T10 : ${calculerCommission(tarifExemple, COMMISSION_CODES.find(c => c.code === 'T10')!).commission_totale.toFixed(0)}€ total
   ➜ Différence : ${(calculerCommission(tarifExemple, COMMISSION_CODES.find(c => c.code === 'T10')!).commission_totale - calculerCommission(tarifExemple, codeT4).commission_totale).toFixed(0)}€ de plus !

📌 RECOMMANDATION POUR GMB :

   1. Prélever 5% sur : frais courtage + commission Exade ANNÉE 1
   2. Les années suivantes : soit ne rien prélever (complexe à suivre), 
      soit négocier un forfait annuel avec les gros courtiers
`);
}

main();





