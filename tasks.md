# 📋 ROADMAP GMB APPORTEUR - TÂCHES À RÉALISER

> **Document créé le 20/12/2024** **Dernière mise à jour : 21/12/2024**
>
> Ce document liste toutes les modifications, corrections et améliorations à
> apporter à l'application GMB Apporteur. Chaque section est organisée par thème
> avec le contexte et la justification de chaque changement.

---

## 📊 SUIVI DE L'AVANCEMENT

> **→ Voir [`tasks_recap.md`](./tasks_recap.md) pour le suivi détaillé des
> tâches réalisées**
>
> | Phase                                  | Statut                   |
> | -------------------------------------- | ------------------------ |
> | Phase 1 : Corrections critiques        | ✅ **Terminée** (7/7)    |
> | Phase 2 : Améliorations fonctionnelles | ✅ **Terminée** (2/2)    |
> | Phase 3 : Intégrations externes        | ⏸️ En attente (clés API) |
> | Phase 4 : Workflow avancé              | ✅ **Terminée** (2/3)    |

---

## 🧪 RÉSULTATS DES TESTS API EXADE (21/12/2024)

> Ces tests ont été exécutés avec le script `scripts/test-exade-complete.ts`
> Résultats complets dans `exade_complete_tests_results.json`

### ✅ Ce qui fonctionne

| Test                                    | Résultat        | Ce que ça signifie                                                                                                               |
| --------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Tarification SANS code_courtier**     | ✅ Fonctionne ! | On peut tarifer en "brouillon" sans polluer le compte Exade du courtier. Une simulation est créée mais pas associée au courtier. |
| **frais_adhesion_apporteur retourné**   | ✅ Oui          | Les frais courtier qu'on envoie sont bien retournés dans la réponse → on peut les lire pour calculer la commission plateforme    |
| **cout_premieres_annees_tarif présent** | ✅ Oui          | On peut approximer la commission 1ère année en divisant par 8 (coût 8 premières années)                                          |
| **id_tarif spécifique**                 | ✅ Fonctionne   | On peut demander un seul tarif pour optimiser les appels                                                                         |

### 🔴 DÉCOUVERTE CRITIQUE : La commission change le prix client !

**Les tests montrent que le code commission impacte directement le prix payé par
le client :**

| Code   | Description              | Prix total (GENERALI) |
| ------ | ------------------------ | --------------------- |
| `1T1`  | ~0% commission courtier  | **5 768,85 €**        |
| `1T10` | ~40% commission courtier | **11 846,13 €**       |

**→ Différence : 6 077,28 € (+105%) !**

**Ce que ça implique pour l'app :**

1. ✅ **Anti-contournement naturel** : Si le courtier change sa commission sur
   Exade après coup, le prix client change → le client verra la différence
2. ⚠️ **Transparence importante** : L'apporteur voit le prix final, donc peut
   déduire le niveau de commission
3. ℹ️ **Le fractionnement (mensuel vs annuel) n'a quasi aucun impact** :
   seulement 0,01% de différence

### ✅ CALCUL DE LA COMMISSION 1ÈRE ANNÉE (Validé 21/12/2024)

> Script : `scripts/test-exade-commission-calculation.ts`

**L'API retourne les coûts ANNÉE PAR ANNÉE dans le XML !**

On peut donc :

1. Extraire le coût exact de l'année 1
2. Appliquer le pourcentage du code de commission choisi
3. Calculer précisément la commission plateforme

**Formule validée :**

```
Commission An1 = coût_année_1 × pourcentage_code
Total revenus = frais_courtier + commission_an1
Commission plateforme = total × 6%
```

### 📋 Tests à ne PAS refaire

Ces tests sont résolus et n'ont plus besoin d'être revérifiés :

- ~~TEST 1 : Tarification sans code_courtier~~ → ✅ Ça marche
- ~~TEST 2 : frais_adhesion_apporteur retourné~~ → ✅ Oui
- ~~TEST 3 : cout_premieres_annees présent~~ → ✅ Oui
- ~~TEST 4 : Fractionnement mensuel vs annuel~~ → ✅ Négligeable
- ~~TEST 5 : Impact des codes commission~~ → ✅ Le prix change
- ~~TEST 6 : id_tarif spécifique~~ → ✅ Fonctionne
- ~~TEST 7 : Extraction coût année 1~~ → ✅ Possible via `<garantie_pret>`
- ~~TEST 8 : Calcul commission avec différents codes~~ → ✅ Formule validée

---

## 📊 SOMMAIRE

1. [🔴 CORRECTIONS CRITIQUES](#1--corrections-critiques)
2. [💰 SYSTÈME DE TARIFICATION ET COMMISSIONS](#2--système-de-tarification-et-commissions)
3. [📡 INTÉGRATION EXADE - WORKFLOW DE PUSH](#3--intégration-exade---workflow-de-push)
4. [🔒 SYSTÈME ANTI-CONTOURNEMENT](#4--système-anti-contournement)
5. [💳 SYSTÈME DE PAIEMENT STRIPE](#5--système-de-paiement-stripe)
6. [🏷️ UNIFICATION DES STATUTS](#6-️-unification-des-statuts)
7. [🔐 SYSTÈME CLIENT LOCK](#7--système-client-lock)
8. [📊 TRACKING ET ANALYTICS](#8--tracking-et-analytics)
9. [🔔 NOTIFICATIONS](#9--notifications)
10. [🎨 AMÉLIORATIONS UI/UX](#10--améliorations-uiux)
11. [📄 RELEVÉ MENSUEL EXADE](#11--relevé-mensuel-exade) ⚠️ EN ATTENTE D'INFOS
12. [✅ VÉRIFICATION DU SYSTÈME](#12--vérification-du-système-21122024)
13. [🎨 AMÉLIORATIONS UI SUPPLÉMENTAIRES](#13--améliorations-ui-supplémentaires)
14. [🐛 CORRECTIONS UI SUPPLÉMENTAIRES](#14--corrections-ui-supplémentaires)
15. [🔌 INTÉGRATIONS OBLIGATOIRES](#15--intégrations-obligatoires-must-have)
16. [📅 ORDRE DE RÉALISATION](#-ordre-de-réalisation-recommandé)
17. [✅ VÉRIFICATION ÉCRANS APPORTEUR](#17--vérification-écrans-apporteur-21122024)

---

## 1. 🔴 CORRECTIONS CRITIQUES

### 1.1 Corriger la valeur de statut invalide

**Fichier :** `app/api/devis/manage/route.ts` ligne 61

**Problème :** Le code utilise `statut_canon: 'valide'` qui n'existe pas dans
l'enum `dossier_statut`.

**Correction :** Remplacer par `statut_canon: 'devis_accepte'`

**Contexte :** L'enum `dossier_statut` contient uniquement : `en_attente`,
`devis_disponible`, `devis_accepte`, `refuse`, `finalise`. La valeur `'valide'`
provoque une erreur silencieuse ou un rejet de la mise à jour.

```typescript
// AVANT (incorrect)
statut_canon: "valide";

// APRÈS (correct)
statut_canon: "devis_accepte";
```

---

### 1.2 Corriger `frac_assurance` hardcodé

**Fichier :** `app/api/exade/tarifs/route.ts` ligne 124

**Problème :** La valeur `frac_assurance` est hardcodée à `12` (mensuel) au lieu
d'utiliser la valeur dynamique.

**Correction :** Utiliser `pretData.frac_assurance || 12`

**Contexte :** L'API Exade accepte plusieurs modes de fractionnement :

- `10` = Prime unique (paiement one-shot)
- `12` = Mensuel (lissé sur la durée)

Le courtier doit pouvoir proposer les deux options au client. La valeur doit
donc être lue depuis `pretData`.

```typescript
// AVANT (incorrect)
<frac_assurance>12</frac_assurance>

// APRÈS (correct)
<frac_assurance>${pretData.frac_assurance || 12}</frac_assurance>
```

---

### 1.3 Migrer les données de statut incohérentes

**Action :** Script SQL de migration pour corriger les incohérences entre
`statut_canon` et `statut`.

**Problème constaté en DB :**

- 5 dossiers avec `statut_canon = 'finalise'` mais `statut = 'en_attente'`
- 1 dossier avec `statut_canon = 'devis_accepte'` mais `statut = 'devis_envoye'`

**Contexte :** Le trigger `sync_statut_from_statut_canon` synchronise
normalement ces valeurs, mais des données legacy existent.

```sql
-- Script de correction
UPDATE dossiers 
SET statut = CASE statut_canon
    WHEN 'en_attente' THEN 'en_attente'
    WHEN 'devis_disponible' THEN 'devis_envoye'
    WHEN 'devis_accepte' THEN 'valide'
    WHEN 'refuse' THEN 'refusé'
    WHEN 'finalise' THEN 'finalisé'
    WHEN 'annule' THEN 'annulé'
END
WHERE statut != CASE statut_canon ... END;
```

---

### 1.4 Brancher correctement la configuration Exade du broker

**Problème critique :** L'API `/api/exade/tarifs` utilise un **fallback vers les
variables d'environnement** au lieu d'exiger la config du broker.

**Fichier principal :** `app/api/exade/tarifs/route.ts` lignes 48-51

**Problème constaté :**

```typescript
// ❌ PROBLÈME : Fallback vers les variables d'environnement
const licenceKey = exadeConfig?.licence_key || process.env.EXADE_LICENCE_KEY;
const codeCourtier = exadeConfig?.code_courtier ||
    process.env.EXADE_PARTNER_CODE;
const soapUrl = exadeConfig?.endpoint_url || process.env.EXADE_SOAP_URL;
```

**Appels qui ne passent pas `broker_id` :**

| Fichier                         | Ligne | Corps de la requête                                        |
| ------------------------------- | ----- | ---------------------------------------------------------- |
| `AdminDossierDetailContent.tsx` | 521   | `{ clientInfo, pretData }` ❌                              |
| `AdminDossierDetailContent.tsx` | 1498  | `{ clientInfo: dossier, pretData: dossier.infos_pret }` ❌ |
| `AdminDossierDetailContent.tsx` | 4046  | `{ clientInfo, pretData, idTarif, commission }` ❌         |
| `nouveau-dossier/page.tsx`      | 394   | `{ client, pret, conjoint }` ❌                            |

**Conséquence :** Les variables d'environnement seront supprimées en prod. Sans
`broker_id`, l'API échouera.

**Corrections à apporter :**

1. **Modifier l'API pour exiger `broker_id`** :

```typescript
// app/api/exade/tarifs/route.ts
if (!broker_id) {
    return NextResponse.json(
        { error: "broker_id est obligatoire" },
        { status: 400 },
    );
}

// Récupérer la config du broker
const { data: exadeConfig, error } = await supabase
    .from("broker_exade_configs")
    .select("code_courtier, licence_key, endpoint_url, is_enabled")
    .eq("broker_id", broker_id)
    .eq("is_enabled", true)
    .single();

if (error || !exadeConfig) {
    return NextResponse.json(
        { error: "Configuration Exade non trouvée pour ce courtier" },
        { status: 400 },
    );
}

// Plus de fallback vers les variables d'env
const licenceKey = exadeConfig.licence_key;
const codeCourtier = exadeConfig.code_courtier;
const soapUrl = exadeConfig.endpoint_url || "https://www.exade.fr/4DSOAP";
```

2. **Modifier tous les appels pour passer `broker_id`** :

```typescript
// AdminDossierDetailContent.tsx
const response = await fetch("/api/exade/tarifs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        broker_id: dossier.broker_id, // ← AJOUTER
        clientInfo: dossier,
        pretData: dossier.infos_pret,
    }),
});
```

3. **Supprimer les variables d'environnement du `.env`** :

- `EXADE_LICENCE_KEY`
- `EXADE_PARTNER_CODE`
- `EXADE_SOAP_URL`

---

## 2. 💰 SYSTÈME DE TARIFICATION ET COMMISSIONS

### 2.1 Passer la commission plateforme à 6%

**Fichiers à modifier :**

1. Fonction SQL `get_platform_fee_pct`
2. `components/features/commission/BrokerCommissionSettings.tsx` (constante
   `PLATFORM_FEE_PCT`)
3. `documents/tarification_et_avantages.md`

**Changement :**

- Ancien taux : 5% (document) / 7.5%-4% (code)
- Nouveau taux : **6% uniforme**

**Contexte :** On simplifie avec un taux unique de 6% prélevé sur le total des
revenus du courtier (frais courtier + commissions Exade 1ère année). Ce modèle
"tu paies quand tu gagnes" est plus simple à comprendre et à vendre.

#### ✅ MÉTHODE DE CALCUL VALIDÉE (Tests du 21/12/2024)

> Script de test : `scripts/test-exade-commission-calculation.ts` Résultats :
> `exade_commission_calculation_results.json`

**L'API Exade retourne les COÛTS DÉTAILLÉS PAR ANNÉE dans le XML !**

```xml
<garantie_pret>
  <periode>20260321</periode>  <!-- Année 1 -->
  <cout>15643</cout>           <!-- 156.43€ -->
</garantie_pret>
<garantie_pret>
  <periode>20270321</periode>  <!-- Année 2 -->
  <cout>20052</cout>           <!-- 200.52€ -->
</garantie_pret>
```

**Ce qu'on peut extraire :**

- ✅ `frais_adhesion_apporteur` : Frais courtier retournés directement
- ✅ **Coût année 1** : Extrait depuis `<garantie_pret>` avec la première
  `<periode>`
- ✅ **Code commission** : Choisi par le courtier, stocké dans notre table

**FORMULE DE CALCUL :**

```
Commission courtier An1 = coût_année_1 × pourcentage_code_commission
Total revenus courtier = frais_courtier + commission_année_1
Commission plateforme = total_revenus × 6%
```

**Résultats des tests (prêt 200 000€, 20 ans) :**

| Code | % An 1 | Coût An 1 | Commission An 1 | Frais Court. | **Plateforme 6%** |
| ---- | ------ | --------- | --------------- | ------------ | ----------------- |
| 1T1  | 0%     | 129.19€   | 0.00€           | 200€         | **12.00€**        |
| 1T4  | 30%    | 156.43€   | 46.93€          | 200€         | **14.82€**        |
| 1T10 | 40%    | 270.18€   | 108.07€         | 200€         | **18.48€**        |
| 2T2  | 40%    | 145.08€   | 58.03€          | 200€         | **15.48€**        |

**Implémentation nécessaire :**

1. **Table `COMMISSION_RATES`** : Stocker tous les codes → pourcentages (voir
   `scripts/test-exade-commission-calculation.ts`)
2. **Parser le XML Exade** : Extraire les `<garantie_pret>` pour obtenir le coût
   année 1
3. **Appliquer la formule** au moment où on crée le devis

**Calcul de la commission plateforme (6%) :**

```
Commission plateforme = 6% × (frais_courtier + commission_exade_1ere_annee)

Où :
- frais_courtier = frais_adhesion_apporteur (retourné par l'API)
- commission_exade_1ere_annee = cout_total × taux_1ere_annee (selon le code commission)

Exemple avec code 1T4 (30% 1ère année) :
- frais_courtier = 200€
- cout_total = 5000€
- commission_exade_1ere_annee = 5000€ × 30% = 1500€
- Base de calcul = 200€ + 1500€ = 1700€
- Commission plateforme = 1700€ × 6% = 102€
```

**🧪 TEST API EXADE RECOMMANDÉ :**

- Faire un appel test pour vérifier que tous ces champs sont bien retournés
- Vérifier la formule de calcul avec des cas réels

**Fonction SQL à modifier :**

```sql
CREATE OR REPLACE FUNCTION public.get_platform_fee_pct(
  p_broker_id uuid, 
  p_has_apporteur boolean DEFAULT true
)
RETURNS numeric AS $$
DECLARE
  v_subscription_plan VARCHAR(20);
BEGIN
  SELECT subscription_plan INTO v_subscription_plan
  FROM public.broker_commission_settings
  WHERE broker_id = p_broker_id;
  
  IF v_subscription_plan IS NULL THEN
    v_subscription_plan := 'free';
  END IF;
  
  -- Nouveau tarif simplifié
  CASE v_subscription_plan
    WHEN 'free' THEN RETURN 6;      -- 6% pour le plan standard
    WHEN 'unlimited' THEN RETURN 0; -- 0% pour l'abonnement (349€/mois)
    ELSE RETURN 6;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2.2 Mettre à jour le document tarification

**Fichier :** `documents/tarification_et_avantages.md`

**Modifications :**

- Remplacer tous les "5%" par "6%"
- Recalculer tous les exemples de montants
- Mettre à jour les tableaux de simulation

---

### 2.3 Ajouter le sélecteur Prime unique / Mensuel

**Contexte :** Le courtier doit pouvoir proposer les deux modes de paiement de
l'assurance au client :

- **Prime unique** (`frac_assurance = 10`) : Le client paie tout d'un coup, le
  courtier touche ses commissions plus vite
- **Mensuel** (`frac_assurance = 12`) : Prime étalée, commissions étalées

**Fichiers à modifier :**

1. `pret_data` table : vérifier que `frac_assurance` existe (✅ déjà fait)
2. UI de création/édition de dossier : ajouter un sélecteur
3. UI de génération de devis : permettre de choisir le mode

**Composant à créer :**

```tsx
// Sélecteur de mode de fractionnement
<RadioGroup value={fracAssurance} onChange={setFracAssurance}>
    <RadioGroup.Option value={12}>
        <div>
            <span className="font-medium">Mensuel (recommandé)</span>
            <span className="text-sm text-gray-500">
                Prime étalée sur la durée du prêt
            </span>
        </div>
    </RadioGroup.Option>
    <RadioGroup.Option value={10}>
        <div>
            <span className="font-medium">Prime unique</span>
            <span className="text-sm text-gray-500">
                Paiement en une fois par le client
            </span>
        </div>
    </RadioGroup.Option>
</RadioGroup>;
```

---

## 3. 📡 INTÉGRATION EXADE - WORKFLOW DE PUSH

### 3.1 Contexte et fonctionnement de l'API Exade

**Ce que l'API Exade permet :**

- `type_operation = 1` : Créer une simulation (juste l'ID)
- `type_operation = 2` : Créer une simulation + calculer tous les tarifs
- `type_operation = 3` : Mettre à jour une simulation existante
- `type_operation = 4` : Mettre à jour + recalculer

**Ce que l'API NE permet PAS :**

- Émettre un contrat directement
- Faire signer le client
- Finaliser la vente

**⚠️ Important :** Quand on envoie `code_courtier` dans la requête, la
simulation est créée sur le Dashboard Exade du courtier (www.exade.fr). Il peut
alors la retrouver et la modifier.

---

### 3.2 Workflow actuel vs workflow souhaité

**Workflow ACTUEL (problématique) :**

```
Tarification → Appel API avec code_courtier → Simulation créée sur Exade
                                              ↓
                                  Le courtier peut modifier la commission
                                  sur Exade avant même l'acceptation
```

**Workflow SOUHAITÉ :**

```
┌─────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 1 : TARIFICATION                                             │
│  • Appel API Exade SANS code_courtier (si possible)                 │
│  • OU avec code_courtier mais en "mode test"                        │
│  • Objectif : obtenir les tarifs sans créer de simulation prod      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 2 : CHOIX ET ENVOI DU DEVIS                                  │
│  • Le courtier sélectionne un tarif                                 │
│  • Le devis est envoyé à l'apporteur                                │
│  • Statut : devis_disponible                                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 3 : ACCEPTATION PAR L'APPORTEUR                              │
│  • L'apporteur accepte le devis                                     │
│  • Statut : devis_accepte                                           │
│  • MAINTENANT on peut "pusher" vers Exade                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 4 : PUSH VERS EXADE PRODUCTION                               │
│  • Appel API Exade AVEC code_courtier                               │
│  • La simulation apparaît sur le Dashboard du courtier              │
│  • On stocke l'id_simulation pour traçabilité                       │
│  • Le courtier reçoit une notification avec lien vers Exade         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 5 : FINALISATION SUR EXADE (hors app)                        │
│  • Le courtier va sur www.exade.fr                                  │
│  • Il retrouve la simulation                                        │
│  • Il complète les formalités médicales si nécessaire               │
│  • Il émet le contrat et fait signer le client                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  ÉTAPE 6 : CONFIRMATION SUR L'APP                                   │
│  • Le courtier revient sur l'app                                    │
│  • Il clique "Finaliser" pour confirmer                             │
│  • Statut : finalise                                                │
│  • Les commissions sont versées                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Tâches à réaliser

**3.3.1 🧪 TEST API EXADE RECOMMANDÉ : Vérifier si l'API fonctionne sans
`code_courtier`**

- Tester un appel avec `code_courtier` vide ou absent
- Si ça marche : modifier le flux de tarification pour ne pas l'envoyer
- Si ça ne marche pas : accepter que les simulations soient créées dès la
  tarification
- **⚠️ Ce test permettrait de clarifier si on peut tarifier sans créer de
  simulation sur Exade**

**3.3.2 Créer une fonction de "push" vers Exade**

```typescript
// lib/services/exade-push.ts
export async function pushDevisToExade(
    devisId: string,
    brokerId: string,
): Promise<string> {
    // 1. Récupérer les données du devis et du dossier
    // 2. Récupérer la config Exade du broker (code_courtier)
    // 3. Appeler l'API Exade avec type_operation = 2
    // 4. Stocker l'id_simulation retourné
    // 5. Retourner l'id_simulation
}
```

**3.3.3 Ajouter une colonne `exade_simulation_id` sur la table `devis`**

```sql
ALTER TABLE devis ADD COLUMN exade_simulation_id VARCHAR(50);
ALTER TABLE devis ADD COLUMN exade_pushed_at TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN exade_locked BOOLEAN DEFAULT FALSE; -- Devis verrouillé après push
```

**3.3.4 Bouton "Confirmer la création du devis" dans l'UI**

**Comportement :**

- Le bouton apparaît **uniquement** quand le statut = `devis_accepte` (après
  acceptation par l'apporteur/client)
- Le courtier clique → le devis est "pushé" vers son compte Exade
- **⚠️ IMPORTANT : Une fois pushé, le devis est VERROUILLÉ et ne peut plus être
  modifié**
- Afficher un message clair : "Attention : cette action est définitive. Le devis
  sera créé sur votre compte Exade et ne pourra plus être modifié."

**UI à créer :**

```tsx
// Dans AdminDossierDetailContent.tsx, onglet Devis
{
    dossier.statut_canon === "devis_accepte" && !selectedDevis.exade_locked && (
        <Button
            variant="primary"
            onClick={handlePushToExade}
            icon={<CheckCircle />}
        >
            Confirmer la création du devis
        </Button>
    );
}

{
    selectedDevis.exade_locked && (
        <Badge variant="success">
            ✓ Devis créé sur Exade (ID: {selectedDevis.exade_simulation_id})
        </Badge>
    );
}
```

**Après le push :**

- `devis.exade_locked = true`
- `devis.exade_simulation_id = [ID retourné]`
- `devis.exade_pushed_at = NOW()`
- Notification au courtier : "Le devis a été créé sur votre compte Exade.
  Rendez-vous sur www.exade.fr pour finaliser."
- Afficher un lien vers le Dashboard Exade

---

### 3.4 Gestion du risque de contournement via Exade

**Risque identifié :** Le courtier peut aller sur son Dashboard Exade et
modifier le code commission de la simulation pour toucher plus de commissions
Exade.

**Contre-mesures :**

1. **Logger le tarif envoyé** : Stocker le `id_tarif`, le
   `commission_exade_code`, et le `cout_total` qu'on a calculé
2. **Comparer à la finalisation** : Quand le courtier finalise, optionnellement
   vérifier que le prix final correspond
3. **Ratio suspect** : Tracker les courtiers qui ont beaucoup de divergences

**Pourquoi ce n'est pas critique :**

- Si le courtier change la commission, le prix du devis change aussi
- Le client pourrait remarquer la différence
- L'apporteur a vu un certain prix, pas un autre

---

## 4. 🔒 SYSTÈME ANTI-CONTOURNEMENT

### 4.1 Masquage des données sensibles

**Principe :** Limiter les informations visibles au courtier pour éviter qu'il
contacte le client en off.

**Règles de masquage par étape :**

| Donnée              | Avant acceptation | Après acceptation | Après finalisation |
| ------------------- | ----------------- | ----------------- | ------------------ |
| Nom client          | ✅ Visible        | ✅ Visible        | ✅ Visible         |
| Prénom client       | ✅ Visible        | ✅ Visible        | ✅ Visible         |
| Email client        | ❌ Masqué         | ✅ Visible        | ✅ Visible         |
| Téléphone           | ❌ Masqué         | ✅ Visible        | ✅ Visible         |
| Adresse             | ❌ Masqué         | ❌ Masqué         | ✅ Visible         |
| Date naissance      | ✅ Visible        | ✅ Visible        | ✅ Visible         |
| ID simulation Exade | ❌ Masqué         | ❌ Masqué         | ✅ Visible         |

**Justification :**

- Nom/prénom/date naissance : nécessaires pour identifier le client
- Email/téléphone : masqués avant acceptation pour éviter contact direct
- ID simulation : masqué pour éviter recréation sur Exade

---

### 4.2 Détection des patterns suspects

**Métriques à surveiller :**

- Ratio refus/acceptation anormalement élevé
- Dossiers annulés juste après acceptation
- Temps entre acceptation et finalisation anormalement court

**Actions :**

- Flag automatique si ratio suspect > seuil
- Notification à la plateforme (toi) pour investigation

---

## 5. 💳 SYSTÈME DE PAIEMENT STRIPE

### 5.1 Architecture choisie : Courtier → Plateforme → Apporteur

**Flux financier :**

```
┌─────────────────────────────────────────────────────────────────────┐
│  FLUX FINANCIER                                                     │
│                                                                     │
│  Courtier                                                           │
│     │                                                               │
│     │ Paiement mensuel (frais Stripe : ~1.4% + 0.25€)               │
│     ▼                                                               │
│  Compte Stripe Plateforme                                           │
│     │                                                               │
│     ├──→ Commission plateforme (6%) → Notre compte                  │
│     │                                                               │
│     └──→ Part apporteur → Compte Stripe Connect de l'apporteur      │
│            │                        (transfert gratuit)             │
│            ▼                                                        │
│         Retrait vers compte bancaire apporteur (gratuit)            │
└─────────────────────────────────────────────────────────────────────┘
```

**Pourquoi ce choix :**

1. **Un seul paiement** du courtier → moins de frais Stripe
2. **Transfert interne gratuit** entre comptes Stripe
3. **Contrôle total** sur la répartition des fonds
4. **Portefeuille visible** pour l'apporteur dans l'app

---

### 5.2 Système de paiement batch mensuel

**Concept :** Tous les paiements sont groupés et traités à une **date mensuelle
choisie par le courtier**.

#### Date de paiement configurable

**Règles :**

- Chaque courtier peut choisir sa date de prélèvement mensuel (1-28)
- **⚠️ La date ne peut être modifiée qu'une fois tous les 6 mois** (sécurité
  anti-abus)
- Lors du premier dépôt du relevé Exade, on peut proposer d'ajuster la date
  automatiquement en fonction des dates du relevé (avec marge de quelques jours)

**Stockage en DB :**

```sql
-- Dans broker_commission_settings ou nouvelle table broker_payment_settings
ALTER TABLE broker_commission_settings ADD COLUMN payment_day_of_month INTEGER DEFAULT 24;
ALTER TABLE broker_commission_settings ADD COLUMN payment_day_last_changed_at TIMESTAMPTZ;

-- Contrainte : changement max 1 fois tous les 6 mois
-- Vérifier que NOW() - payment_day_last_changed_at > 6 mois avant d'autoriser le changement
```

**UI dans les réglages courtier :**

```tsx
// Sélecteur de jour de prélèvement
<Select 
  label="Jour de prélèvement mensuel"
  value={paymentDay}
  onChange={handleChangePaymentDay}
  disabled={!canChangePaymentDay} // Grisé si changé il y a moins de 6 mois
>
  {[1..28].map(day => <Option value={day}>Le {day} de chaque mois</Option>)}
</Select>

{!canChangePaymentDay && (
  <p className="text-sm text-gray-500">
    Vous pourrez modifier cette date à partir du {nextChangeDate}
  </p>
)}
```

**Workflow :**

```
J-3 (3 jours avant la date choisie)
└── Email récapitulatif envoyé au courtier
    "5 dossiers à payer ce mois-ci, total: 340€"

J (date choisie par le courtier) = JOUR DE PAIEMENT
└── Stripe prélève le courtier
└── Montants versés aux apporteurs (Stripe Connect)
└── Part plateforme prélevée
└── Facture PDF générée

Dossiers finalisés après la date → reportés au mois suivant
```

**Exemple (si courtier a choisi le 15) :**

- Dossier finalisé le 10/12 → inclus dans le batch du 15/12
- Dossier finalisé le 18/12 → inclus dans le batch du 15/01

---

### 5.3 Commission plateforme prélevée mensuellement

**Principe :** La part plateforme (6%) est prélevée au fur et à mesure des
encaissements.

**Sur les frais courtier :**

- Prélevés immédiatement à la finalisation
- 6% × frais courtier = part plateforme

**Sur les commissions Exade :**

- Prélevées mensuellement (quand Exade verse)
- 6% × commission mensuelle Exade = part plateforme mensuelle

**Exemple :**

- Frais courtier : 200€ → Part plateforme : 12€ (immédiat)
- Commission Exade : 30€/mois → Part plateforme : 1,80€/mois

---

### 5.4 Système de paiement lissé (Option B)

**Contexte :** Quand le client paie en mensuel (`frac_assurance = 12`), les
commissions Exade sont versées mensuellement. On doit répercuter ce lissage.

**Implémentation choisie : Option B (1 droit progressif)**

- On crée **1 seule entrée** `wallet_transaction` avec le montant total
- Une colonne `monthly_release` indique le montant libéré chaque mois
- Un batch job mensuel "libère" les montants progressivement

```sql
-- Structure wallet_transactions pour le lissage
wallet_transactions:
  - type: commission_exade
  - total_amount: 360€       -- Total sur 12 mois
  - available_amount: 0€     -- Disponible maintenant
  - monthly_release: 30€     -- Libéré chaque mois
  - next_release_at: NULL    -- Date du prochain versement
```

---

### 5.5 Retraits apporteurs

**Principe :** L'apporteur peut demander un retrait dès qu'il a de l'argent
disponible.

**Implémentation avec Stripe Connect :**

1. Chaque apporteur a un compte Stripe Connect
2. Le solde est affiché dans l'app
3. Bouton "Retirer" pour transférer vers son compte bancaire
4. Retrait gratuit (pas de frais supplémentaires)

---

## 6. 🏷️ UNIFICATION DES STATUTS

### 6.1 Nomenclature finale

**Statuts DB (`statut_canon` - enum `dossier_statut`) :**

| Statut             | Signification              | Qui déclenche         | Transitions possibles              |
| ------------------ | -------------------------- | --------------------- | ---------------------------------- |
| `en_attente`       | Dossier créé, pas de devis | Création dossier      | → devis_disponible                 |
| `devis_disponible` | Devis généré et envoyé     | Courtier envoie devis | → devis_accepte, refuse            |
| `devis_accepte`    | Apporteur a validé         | Apporteur valide      | → finalise, annule                 |
| `refuse`           | Dernier devis refusé       | Apporteur refuse      | → devis_disponible (nouveau devis) |
| `finalise`         | Contrat signé              | Courtier finalise     | (état final)                       |
| `annule`           | Abandonné définitivement   | Courtier annule       | (état final)                       |

---

### 6.2 Ajouter le statut `annule`

**Contexte :**

- Un dossier peut être abandonné sans être finalisé (client ne veut plus, etc.)
- Différent de `refuse` qui est juste un refus de devis (on peut en renvoyer un
  autre)
- `annule` = fin définitive, pas de commission

**Modifications :**

1. **Ajouter à l'enum DB :**

```sql
ALTER TYPE dossier_statut ADD VALUE 'annule';
```

2. **Mettre à jour le trigger de sync :**

```sql
WHEN 'annule' THEN 'annulé'
```

3. **Mettre à jour `lib/utils/statut-mapping.ts` :**

```typescript
export type StatutCanonique =
    | "en_attente"
    | "devis_disponible"
    | "devis_accepte"
    | "refuse"
    | "finalise"
    | "annule"; // NOUVEAU
```

4. **Ajouter un bouton "Annuler le dossier" dans l'UI admin :**

- Visible uniquement si statut = `devis_accepte` ou `refuse`
- Demande une confirmation
- Optionnel : demander une raison

---

### 6.3 Règles de transition

**Transitions autorisées :**

```
en_attente → devis_disponible (courtier envoie devis)
devis_disponible → devis_accepte (apporteur accepte)
devis_disponible → refuse (apporteur refuse)
refuse → devis_disponible (courtier renvoie un devis)
devis_accepte → finalise (courtier confirme signature)
devis_accepte → annule (courtier abandonne)
refuse → annule (courtier abandonne)
```

**Transitions interdites :**

- `finalise` → * (état final, pas de retour)
- `annule` → * (état final, pas de retour)
- `en_attente` → `finalise` (doit passer par devis_accepte)

---

## 7. 🔐 SYSTÈME CLIENT LOCK

### 7.1 Paramètres du client lock

| Paramètre    | Valeur                               | Justification                                                      |
| ------------ | ------------------------------------ | ------------------------------------------------------------------ |
| **Durée**    | 6 mois                               | Assez long pour le cycle vente, pas trop pour bloquer indéfiniment |
| **Portée**   | Par broker                           | Chaque courtier a son propre réseau d'apporteurs                   |
| **Matching** | Hash (nom + prénom + date naissance) | Déjà implémenté avec normalisation                                 |

---

### 7.2 Comportement si client déjà locké

**Scénario :** Un deuxième dossier est créé pour un client déjà locké par un
autre apporteur.

**Comportement actuel :** Le trigger `process_dossier_client_lock` modifie
`apporteur_id` pour l'attribuer à l'apporteur d'origine. MAIS il crée quand même
un nouveau dossier.

**Comportement souhaité :**

1. Vérifier si un dossier **actif** existe pour ce client
2. SI oui → **Rediriger** vers ce dossier existant (pas de création)
3. SI non → Créer le dossier mais l'attribuer à l'apporteur d'origine

**Implémentation :**

- Check côté API AVANT l'insert dans `dossiers`
- Si client locké ET dossier actif existe → retourner erreur avec `dossier_id`
- UI affiche : "Ce client a déjà un dossier en cours. [Voir le dossier]"

---

### 7.3 Tâches à réaliser

1. **Modifier l'API de création de dossier** pour vérifier le lock avant insert
2. **Retourner le `dossier_id` existant** dans la réponse d'erreur
3. **Afficher un message clair** dans l'UI avec lien vers le dossier

---

## 8. 📊 TRACKING ET ANALYTICS

### 8.1 Events à tracker

**Onboarding :**

- `user_signup` : inscription (type, source)
- `broker_keys_entered` : config Exade complétée (temps depuis inscription)
- `broker_first_apporteur_invited` : premier apporteur invité
- `apporteur_first_dossier_created` : premier dossier créé
- `apporteur_linked_to_broker` : liaison broker-apporteur (invitation vs auto)

**Dossiers :**

- `dossier_created` : création (broker_id, apporteur_id, source)
- `devis_generated` : génération (durée, nb tarifs)
- `devis_sent_to_apporteur` : envoi (temps depuis création)
- `devis_viewed_by_apporteur` : consultation (temps depuis envoi)
- `devis_accepted` : acceptation (temps depuis envoi)
- `devis_refused` : refus (temps depuis envoi, motif)
- `dossier_finalized` : finalisation (temps depuis acceptation)
- `dossier_cancelled` : annulation (raison)

**Temps de réponse :**

- `time_to_first_devis` : création → premier devis envoyé
- `apporteur_response_time` : devis envoyé → accepté/refusé
- `broker_finalization_time` : devis accepté → finalisé
- `broker_reaction_to_refusal` : devis refusé → action suivante

**Anti-contournement :**

- `client_lock_triggered` : client existant détecté
- `client_auto_linked` : apporteur d'origine
- `suspicious_refusal_pattern` : trop de refus + finalisations rapides

**Revenus :**

- `commission_earned` : commission gagnée (montant, source)
- `payment_processed` : paiement traité (montant total, nb dossiers)
- `withdrawal_requested` : retrait demandé (montant, apporteur)

---

### 8.2 Niveau de détail (RGPD)

**Choix : Option B - PII hashée**

**Ce qu'on hashe :**

- Email → `sha256(email)` pour tracking cross-dossier
- Téléphone → `sha256(tel)` pour détecter duplicatas

**Ce qu'on garde en clair :**

- Dates (création, actions)
- IDs anonymes (UUID)
- Métriques agrégées

**Justification :**

- Zéro PII empêcherait certaines analyses (cohortes, matching)
- Hash permet de suivre les parcours sans exposer les données
- Conforme RGPD (données pseudonymisées)

---

## 9. 🔔 NOTIFICATIONS

### 9.1 Corriger la notification de devis accepté

**Fichier :** `app/api/devis/manage/route.ts`

**Problème :** La notification est créée pour `user.id` (l'utilisateur connecté
qui accepte) au lieu de l'apporteur.

**Correction :** Utiliser `dossier.apporteur_id`

```typescript
// AVANT (incorrect)
await supabase.from('notifications').insert({
  user_id: user.id,  // ← Mauvais : c'est l'apporteur qui accepte
  ...
})

// APRÈS (correct)
await supabase.from('notifications').insert({
  user_id: dossier.apporteur_id,  // ← Correct : notifier l'apporteur
  ...
})
```

---

### 9.2 Notifications spécifiques apporteur

**Contexte :** L'apporteur est "la victime" dans certains cas et doit être
notifié différemment du courtier.

**Notifications apporteur :**

| Event              | Message                                                              | Priorité |
| ------------------ | -------------------------------------------------------------------- | -------- |
| Nouveau devis reçu | "Un nouveau devis est disponible pour [Client]"                      | Haute    |
| Dossier finalisé   | "Bonne nouvelle ! Le dossier [Client] est finalisé. Commission : X€" | Haute    |
| Dossier annulé     | "Le dossier [Client] a été annulé par le courtier"                   | Moyenne  |
| Client auto-lié    | "Votre client [Client] a été détecté dans un autre dossier"          | Moyenne  |

---

## 10. 🎨 AMÉLIORATIONS UI/UX

### 10.1 Système de blocage J+21

**Contexte :** Si un courtier ne finalise pas un dossier dans les 21 jours après
acceptation, il est bloqué.

**Implémentation :**

- Compteur visible sur le dossier : "J+X depuis acceptation"
- Alerte à J+14 : "Ce dossier doit être finalisé sous 7 jours"
- Blocage à J+21 : Le courtier ne peut plus créer de nouveaux dossiers

**Fichiers existants :**

- `components/features/blocking/BrokerBlockingBanner.tsx`
- `components/features/blocking/BrokerBlockingModal.tsx`
- `hooks/useBrokerBlocking.ts`

---

### 10.2 Widget ROI sur le dashboard courtier

**Concept :** Afficher le retour sur investissement pour le courtier.

```
┌─────────────────────────────────────────────────┐
│  📊 Ce mois-ci                                  │
│  ├── Revenus générés via GMB : 5 600€          │
│  ├── Temps économisé : ~18h (≈ 540€)           │
│  ├── Commission plateforme : 336€              │
│  └── 📈 ROI : +204€ (vous gagnez plus que      │
│           vous ne payez en utilisant GMB)      │
└─────────────────────────────────────────────────┘
```

---

### 10.3 Détail des prélèvements

**Principe :** Chaque prélèvement doit être contextualisé.

**❌ Ne pas faire :**

> "Prélèvement : 47€"

**✅ Faire :**

> "Commission sur dossier DUPONT (finalisé le 12/12) Vous avez gagné 560€ →
> Notre part : 33,60€"

---

## 📅 PRIORITÉS

### 🔴 CRITIQUE (à faire immédiatement)

1. Corriger `'valide'` → `'devis_accepte'`
2. Corriger `frac_assurance` hardcodé
3. Mettre à jour la commission à 6%

### 🟡 IMPORTANT (cette semaine)

4. Ajouter le statut `annule`
5. Unifier les statuts en DB
6. Implémenter la redirection si client locké
7. Corriger la notification de devis accepté

### 🟢 À PLANIFIER (prochaines semaines)

8. Workflow de push vers Exade
9. Système de paiement batch
10. Setup Stripe Connect
11. Tracking analytics

---

## 11. 📄 RELEVÉ MENSUEL EXADE

> ⚠️ **SECTION EN ATTENTE D'INFORMATIONS**
>
> Les tâches de cette section ne doivent PAS être commencées avant d'avoir reçu
> les réponses aux questions ci-dessous. **Demander confirmation au responsable
> avant de commencer.**

---

### 11.1 Contexte et importance

Le **relevé mensuel** est un document qu'Exade envoie chaque mois à chaque
courtier. Il récapitule :

- Quels clients ont effectivement payé
- Combien le courtier va toucher en commissions
- L'état réel des contrats

**Pourquoi c'est crucial :**

- L'API Exade ne permet PAS de savoir si un client a payé
- C'est la **seule source de vérité** sur les paiements réels
- Sans ce document, tout repose sur la bonne foi du courtier
- C'est une **arme anti-contournement majeure**

---

### 11.2 Fonctionnement prévu

#### Upload obligatoire

- Le courtier DOIT uploader son relevé mensuel chaque mois
- C'est une **obligation contractuelle** pour utiliser la plateforme
- Format : PDF ou Excel (à confirmer)

#### Analyse automatique par l'IA

- Le système analyse le document (comme pour les autres documents)
- Match automatique avec les dossiers de l'app
- Compare ce que le courtier a déclaré VS ce que le relevé prouve

#### Déclenchement des paiements

- Le relevé sert à **débloquer l'argent** dans le wallet
- Tant que le relevé n'est pas fourni et validé → l'argent reste bloqué

#### Détection des fraudes

- Si les montants ne correspondent pas → flag
- Si des contrats apparaissent sur Exade mais pas dans l'app → flag
- Permet de détecter les signatures "en off"

---

### 11.3 ⚠️ QUESTIONS À POSER AVANT DE COMMENCER

**Ces questions doivent être posées au responsable. Ne pas commencer les
développements avant d'avoir les réponses.**

#### Format du relevé

1. **Quel format exactement ?** PDF, Excel, CSV ?
2. **Est-ce standardisé ?** Tous les courtiers reçoivent-ils le même format ?
3. **Peut-on avoir un exemple ?** Pour analyser la structure des données

#### Contenu du relevé

4. **Quelles colonnes/informations sont présentes ?**
   - Numéro de contrat / ID simulation Exade ?
   - Nom et prénom du client ?
   - Montant de l'échéance payée ?
   - Montant de la commission courtier ?
   - Date du paiement ?
   - Autre chose ?

5. **Le relevé contient-il l'`id_simulation` Exade ?**
   - Si oui → on peut matcher automatiquement avec nos dossiers
   - Si non → on devra matcher par nom/prénom/date naissance (moins fiable)

#### Timing

6. **À quelle date du mois le courtier reçoit-il ce relevé ?**
   - Important pour caler la date de paiement batch

#### Cas particuliers

7. **Prime unique VS Mensuel : quelle différence dans le relevé ?**
   - Prime unique : tout le montant apparaît sur un seul relevé ?
   - Mensuel : une ligne par mois pendant X années ?

8. **Que se passe-t-il pour les contrats résiliés ou impayés ?**
   - Comment le relevé indique-t-il ces cas ?

---

### 11.4 Tâches à réaliser (APRÈS réception des réponses)

#### Base de données

```sql
-- Table pour stocker les relevés
CREATE TABLE broker_exade_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id),
  month DATE NOT NULL,  -- Premier jour du mois concerné
  file_path TEXT NOT NULL,
  file_type VARCHAR(10),  -- 'pdf', 'xlsx', 'csv'
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  analysis_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'error'
  analysis_result JSONB,  -- Résultat de l'analyse IA
  validated_at TIMESTAMPTZ,
  validated_by UUID,  -- NULL = auto, sinon = admin
  UNIQUE(broker_id, month)
);

-- Table pour les lignes extraites du relevé
CREATE TABLE broker_exade_report_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES broker_exade_reports(id),
  exade_simulation_id VARCHAR(50),
  client_name TEXT,
  amount_cents INTEGER,
  commission_cents INTEGER,
  payment_date DATE,
  matched_devis_id UUID REFERENCES devis(id),
  match_status VARCHAR(20),  -- 'auto_matched', 'manual_matched', 'unmatched', 'mismatch'
  mismatch_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### UI courtier - Upload du relevé

- Page dédiée dans les réglages ou le dashboard
- Liste des mois avec statut (uploadé, en attente, validé)
- Bouton "Uploader le relevé du mois de [X]"
- Notification si relevé non fourni après X jours

#### Système d'analyse IA

- Adapter le système existant d'analyse de documents
- Créer un prompt spécifique pour extraire les données du relevé
- Matcher automatiquement avec les dossiers de l'app

#### Gestion des écarts

- Si écart détecté → flag automatique
- Si écart non traitable automatiquement → notification au responsable (toi)
- **La seule personne à contacter en cas de différence non traitable = le
  responsable de l'app**

#### Impact sur les dossiers finalisés

- Le relevé peut modifier des dossiers marqués comme `finalise` :
  - Si le relevé montre un montant différent
  - Si le relevé montre un contrat non payé
- L'analyse du relevé est la **seule exception** qui permet de modifier un
  dossier finalisé

---

### 11.5 Workflow si relevé manquant

**À définir avec le responsable :**

| Jour | Action suggérée                                                                      |
| ---- | ------------------------------------------------------------------------------------ |
| J+0  | Date limite de dépôt du relevé                                                       |
| J+3  | Relance email automatique                                                            |
| J+7  | Alerte dans l'app + 2ème relance                                                     |
| J+14 | **Blocage partiel** : le courtier peut consulter mais pas créer de nouveaux dossiers |
| J+21 | **Blocage total** : accès restreint jusqu'à régularisation                           |

**Le responsable doit confirmer ces délais.**

---

## 📅 PRIORITÉS

### 🔴 CRITIQUE (à faire immédiatement)

1. Corriger `'valide'` → `'devis_accepte'` (section 1.1)
2. Corriger `frac_assurance` hardcodé (section 1.2)
3. Mettre à jour la commission à 6% (section 2.1)
4. Brancher correctement la config Exade du broker (section 1.4)

### 🟡 IMPORTANT (cette semaine)

5. Ajouter le statut `annule` (section 6.2)
6. Unifier les statuts en DB (section 1.3)
7. Implémenter la redirection si client locké (section 7.2)
8. Corriger la notification de devis accepté (section 9.1)
9. Feedback visuel "Copié !" sur le bouton de copie (section 13.1)

### 🟢 À PLANIFIER (prochaines semaines)

10. Workflow de push vers Exade + bouton "Confirmer" (section 3.3)
11. Système de paiement batch avec date configurable (section 5.2)
12. Setup Stripe Connect (section 5.5)
13. Tracking analytics (section 8)

### ⏸️ EN ATTENTE D'INFOS

14. Relevé mensuel Exade (attendre les réponses aux questions, section 11)

---

## 14. 🐛 CORRECTIONS UI SUPPLÉMENTAIRES

### 14.1 Corriger l'affichage des offres d'abonnement

**Fichier :** `components/features/commission/BrokerCommissionSettings.tsx`

**Problème :**

1. La constante `PLATFORM_FEE_PCT` est à **5%** (ligne 42) au lieu de **6%**
2. Le type `subscription_plan` contient 3 valeurs
   (`'free' | 'pro' | 'unlimited'`) alors qu'il n'y a que **2 offres** :
   - **Plan gratuit** : 6% de commission sur les revenus
   - **Abonnement 349€/mois** : 0% de commission

**Corrections à apporter :**

1. **Mettre à jour `PLATFORM_FEE_PCT`** :

```typescript
// AVANT
const PLATFORM_FEE_PCT = 5;

// APRÈS
const PLATFORM_FEE_PCT = 6;
```

2. **Mettre à jour le type `subscription_plan`** :

```typescript
// AVANT
subscription_plan: "free" | "pro" | "unlimited";

// APRÈS
subscription_plan: "free" | "unlimited";
```

3. **Fichiers à vérifier et mettre à jour** :

- `types/supabase.ts` : enum `subscription_plan`
- `components/features/commission/BrokerCommissionSettings.tsx` : constante +
  type
- `db.md` : documentation du type
- Base de données : ALTER TYPE si nécessaire

4. **Mettre à jour la fonction SQL `get_platform_fee_pct`** :

```sql
CASE v_subscription_plan
  WHEN 'free' THEN RETURN 6;      -- 6% pour le plan gratuit
  WHEN 'unlimited' THEN RETURN 0; -- 0% pour l'abonnement 349€/mois
  ELSE RETURN 6;
END CASE;
```

---

## 15. 🔌 INTÉGRATIONS OBLIGATOIRES (MUST-HAVE)

### 15.1 Resend pour l'envoi d'emails

**Contexte :** Les notifications email sont essentielles pour informer les
utilisateurs.

**À configurer :**

1. Créer un compte Resend et obtenir une API key
2. Configurer le domaine d'envoi (ex: `noreply@gmb-courtage.com`)
3. Créer les templates d'email :
   - Invitation apporteur
   - Nouveau dossier créé
   - Devis disponible
   - Dossier finalisé
   - Relance relevé mensuel
4. Intégrer l'envoi dans les hooks existants

**Variables d'environnement :**

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=GMB Courtage <noreply@gmb-courtage.com>
```

---

### 15.2 Stripe pour les paiements

**Contexte :** Nécessaire pour :

- Prélever la commission plateforme aux courtiers
- Verser les commissions aux apporteurs (Stripe Connect)
- Gérer l'abonnement 349€/mois (si choisi)

**À configurer :**

1. **Compte Stripe principal** :
   - API keys (publishable + secret)
   - Webhook endpoint pour les events

2. **Stripe Connect (pour les apporteurs)** :
   - Activer Connect
   - Configurer le flux d'onboarding Connect Express
   - Chaque apporteur devra créer son compte Connect

3. **Stripe Billing (pour l'abonnement)** :
   - Créer le produit "Abonnement illimité"
   - Créer le prix 349€/mois
   - Gérer le cycle de facturation

**Variables d'environnement :**

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

**Tables à ajouter/modifier :**

```sql
-- Lien apporteur → compte Stripe Connect
ALTER TABLE apporteur_profiles ADD COLUMN stripe_connect_account_id VARCHAR(50);
ALTER TABLE apporteur_profiles ADD COLUMN stripe_connect_onboarded_at TIMESTAMPTZ;

-- Lien broker → client Stripe (pour prélèvements)
ALTER TABLE brokers ADD COLUMN stripe_customer_id VARCHAR(50);
ALTER TABLE brokers ADD COLUMN stripe_payment_method_id VARCHAR(50);
```

---

## 📅 ORDRE DE RÉALISATION RECOMMANDÉ

> Cette section définit l'ordre logique pour implémenter les modifications tout
> en conservant le contexte.

### 🔴 PHASE 1 : Corrections critiques et fondations (Jour 1-2)

**Ordre :**

1. **Corriger `'valide'` → `'devis_accepte'`** (section 1.1)
   - Dépendance : Aucune
   - Impact : API devis

2. **Corriger `frac_assurance` hardcodé** (section 1.2)
   - Dépendance : Aucune
   - Impact : API Exade tarifs

3. **Mettre à jour la commission 5% → 6%** (section 2.1 + 14.1)
   - Modifier `PLATFORM_FEE_PCT` dans le composant
   - Modifier la fonction SQL `get_platform_fee_pct`
   - Mettre à jour le type `subscription_plan` (supprimer 'pro')
   - Impact : Tout le système de commissions

4. **Brancher la config Exade du broker** (section 1.4)
   - Supprimer les fallback vers `process.env.*`
   - Ajouter `broker_id` obligatoire dans l'API
   - Mettre à jour tous les appels frontend
   - Impact : API Exade tarifs + tous les composants qui appellent l'API

5. **Migrer les données de statut incohérentes** (section 1.3)
   - Script SQL de correction
   - Impact : Dossiers existants

---

### 🟡 PHASE 2 : Améliorations fonctionnelles (Jour 3-4)

**Ordre :** 6. **Ajouter le statut `annule`** (section 6.2)

- ALTER TYPE en DB
- Mettre à jour `statut-mapping.ts`
- Ajouter le bouton dans l'UI admin
- Impact : Gestion des dossiers

7. **Feedback visuel "Copié !"** (section 13.1)
   - Modification simple du composant InviteModal
   - Impact : UX

8. **Corriger la notification de devis accepté** (section 9.1)
   - Modifier `app/api/devis/manage/route.ts`
   - Impact : Notifications apporteurs

9. **Implémenter la redirection si client locké** (section 7.2)
   - Modifier l'API de création de dossier
   - Retourner le `dossier_id` existant
   - Impact : Anti-contournement

---

### 🟢 PHASE 3 : Intégrations externes (Jour 5-7)

**Ordre :** 10. **Configurer Resend** (section 15.1) - Créer compte + domaine -
Créer templates email - Intégrer dans les hooks - Impact : Notifications email

11. **Configurer Stripe (base)** (section 15.2)
    - Account principal
    - Webhooks
    - Customer pour les brokers
    - Impact : Paiements

12. **Configurer Stripe Connect** (section 15.2)
    - Onboarding Express pour apporteurs
    - Transferts automatiques
    - Impact : Versement commissions apporteurs

---

### 🔵 PHASE 4 : Workflow avancé (Semaine 2)

**Ordre :** 13. **Workflow push Exade** (section 3.3) - Ajouter colonnes
`exade_simulation_id`, `exade_pushed_at`, `exade_locked` - Créer le bouton
"Confirmer la création du devis" - Implémenter le verrouillage post-push -
Impact : Intégration Exade

14. **Système de paiement batch** (section 5.2)
    - Date configurable par courtier (1-28)
    - Règle des 6 mois pour changement
    - Email récapitulatif J-3
    - Impact : Flux financier

15. **Tracking analytics** (section 8)
    - Events à tracker
    - Hash des PII
    - Impact : Analytics

---

### ⏸️ PHASE 5 : À planifier après infos (Plus tard)

16. **Relevé mensuel Exade** (section 11)
    - **⚠️ ATTENDRE les réponses aux questions**
    - Upload obligatoire
    - Analyse automatique
    - Matching avec dossiers

---

### 📋 CHECKLIST PRÉ-PRODUCTION

Avant mise en production, vérifier :

- [ ] Variables d'environnement configurées
  - [ ] `RESEND_API_KEY`
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_PUBLISHABLE_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] ~~`EXADE_LICENCE_KEY`~~ (supprimé, utiliser config broker)
  - [ ] ~~`EXADE_PARTNER_CODE`~~ (supprimé, utiliser config broker)

- [ ] Base de données migrée
  - [ ] Statuts incohérents corrigés
  - [ ] Type `subscription_plan` mis à jour
  - [ ] Colonnes Stripe ajoutées

- [ ] Intégrations testées
  - [ ] Resend : envoi d'email de test
  - [ ] Stripe : paiement de test
  - [ ] Stripe Connect : onboarding apporteur de test

- [ ] Sécurité
  - [ ] RLS vérifiées
  - [ ] API routes sécurisées
  - [ ] Webhooks signés vérifiés

---

## 🧪 TESTS API EXADE RECOMMANDÉS

Plusieurs points de ce document bénéficieraient d'un test avec l'API Exade :

| Test                          | Objectif                                                                               | Section |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------- |
| Appel sans `code_courtier`    | Vérifier si on peut tarifier sans créer de simulation sur Exade                        | 3.3.1   |
| Vérifier les champs retournés | Confirmer que `frais_adhesion_apporteur`, `cout_total_tarif`, etc. sont bien retournés | 2.1     |
| Calcul de commission          | Tester la formule de calcul avec des cas réels                                         | 2.1     |

**Procédure :** Utiliser les credentials de test sans `code_courtier` pour ne
pas polluer le compte Exade du courtier partenaire.

---

## 12. ✅ VÉRIFICATION DU SYSTÈME (21/12/2024)

> Rapport de vérification complète du système actuel.

### ✅ CE QUI FONCTIONNE CORRECTEMENT

#### Création de dossier apporteur (`/nouveau-dossier`)

- ✅ Workflow en 3 étapes fonctionnel (type → infos client → documents)
- ✅ Upload de documents via FormData
- ✅ Création de `dossiers`, `client_infos`, `documents` en base
- ✅ Notifications créées correctement

#### Configuration Exade (`ExadeConfiguration.tsx`)

- ✅ UI complète pour configurer `code_courtier`, `licence_key`, `sso_key`,
  `endpoint_url`
- ✅ Test de connexion disponible
- ✅ Sauvegarde dans `broker_exade_configs`
- ✅ 1 courtier configuré : "Cabinet Test Dupont" (code: 815178)

#### API Exade Tarifs (`/api/exade/tarifs`)

- ✅ Construction XML correcte avec tous les codes Exade
- ✅ Parsing des réponses fonctionnel
- ✅ Extraction des garanties et tarifs
- ✅ Support du `commissionnement` dans les appels

#### Système d'invitation apporteur

- ✅ Génération de liens via `create_broker_invite` RPC
- ✅ Validation des tokens via `validate_broker_invite` RPC
- ✅ Consommation des invites via `consume_broker_invite` RPC
- ✅ Liaison apporteur-broker dans `broker_apporteurs`
- ✅ 5 invitations existantes en base (dont 1 utilisée)

#### Profils apporteurs

- ✅ 6 profils existants en base
- ✅ Lien broker-apporteur fonctionnel via `broker_apporteurs`
- ✅ CGU acceptées pour la plupart (5/6)

#### Onboarding

- ✅ Onboarding apporteur (`/onboarding`) : acceptation CGU
- ✅ Onboarding courtier (`/admin/onboarding`) : welcome → exade → invite →
  complete
- ✅ Configuration Exade intégrée dans l'onboarding

#### Wallets

- ✅ 3 wallet_accounts existants (2 brokers, 1 apporteur)
- ✅ Soldes à 0 (normal, pas encore de transactions)
- ✅ Fonctions wallet : `get_wallet_summary`, `recompute_wallet_balances`,
  `update_wallet_balance_on_transaction`

#### Système de commissions

- ✅ Table `devis` avec colonnes financières : `frais_courtier`,
  `commission_exade_code`, `apporteur_share_pct`, etc.
- ✅ Fonction `get_platform_fee_pct(broker_id, has_apporteur)` en place
- ✅ Fonction `get_applicable_commission_rule` pour récupérer les règles
- ✅ Triggers wallet fonctionnels :
  `create_wallet_transaction_on_devis_accepte`,
  `move_wallet_pending_to_available_on_finalise`
- ✅ Composant `CommissionRecommendationCard` pour l'analyse des codes
  commission

#### Devis existants

- ✅ 10 devis en base (dates d'octobre 2025, données de test)
- ⚠️ Aucun devis avec `frais_courtier`, `commission_exade_code` rempli (données
  de test basiques)

#### Pages Admin

- ✅ `/admin` : Dashboard principal
- ✅ `/admin/dossiers` : Liste des dossiers
- ✅ `/admin/dossiers/[id]` : Détail d'un dossier (très complet : 4400+ lignes)
- ✅ `/admin/apporteurs` : Liste des apporteurs + modale invitation
- ✅ `/admin/apporteurs/[id]` : Détail apporteur
- ✅ `/admin/statistiques` : KPIs, analyse de l'activité, évolution temporelle
- ✅ `/admin/billing` : Validation des commissions, résumé financier
- ✅ `/admin/profil` : Profil admin + notifications
- ✅ `/admin/nouveau-dossier` : Création de dossier côté admin
- ✅ `/admin/onboarding` : Processus d'onboarding courtier
- ✅ `/admin/activites` : Journal des activités

#### Pages Apporteur

- ✅ `/` : Dashboard apporteur avec stats et activités
- ✅ `/nouveau-dossier` : Création de dossier apporteur (workflow 3 étapes)
- ✅ `/mes-dossiers` : Liste des dossiers de l'apporteur
- ✅ `/dossier/[id]` : Détail d'un dossier (vue apporteur)
- ✅ `/dossier-confirme/[id]` : Page de confirmation après création
- ✅ `/profil` : Profil apporteur avec sections :
  - ProfileInfo (infos personnelles)
  - WalletSection (portefeuille)
  - CabinetSection (cabinet lié)
  - NotificationSettings (préférences)
  - ResourcesSection (ressources)
- ✅ `/onboarding` : Acceptation CGU
- ✅ `/activites` : Journal des activités

#### Pages Publiques

- ✅ `/connexion` : Login/Signup différencié courtier/apporteur
- ✅ `/invite/[token]` : Page de validation d'invitation
- ✅ `/reset-password` : Réinitialisation mot de passe

#### Client Lock

- ✅ Trigger `trigger_process_client_lock` actif sur `dossiers`
- ✅ Fonctions `check_client_lock`, `create_client_lock`,
  `cleanup_expired_client_locks` présentes
- ✅ Service JS `lib/services/client-lock.ts` fonctionnel

#### Triggers statuts

- ✅ `set_date_finalisation` : met à jour la date quand finalisé
- ✅ `sync_statut_from_statut_canon` : synchronise statut legacy
- ✅ `trigger_dossier_finalise_wallet` : crée transaction wallet

---

### 🔴 PROBLÈMES IDENTIFIÉS

#### 1. Config Exade : Fallback vers variables d'environnement

**Voir section 1.4** - L'API `/api/exade/tarifs` utilise un fallback vers
`process.env.*` au lieu d'exiger `broker_id`.

#### 2. Données de statut incohérentes

**Voir section 1.3** - 5 dossiers ont `statut_canon` ≠ `statut` (pas critique,
trigger de sync existe).

#### 3. Valeur de statut invalide

**Voir section 1.1** - `statut_canon: 'valide'` utilisé au lieu de
`'devis_accepte'`.

---

## 13. 🎨 AMÉLIORATIONS UI SUPPLÉMENTAIRES

### 13.1 Feedback visuel sur le bouton "Copier" du lien d'invitation

**Fichier :** `components/features/invites/InviteModal.tsx` ligne 129-134

**Problème actuel :** Quand on clique sur "Copier", il n'y a aucun feedback
visuel.

**Amélioration demandée :**

- Le bouton doit afficher "Copié !" après le clic
- Revenir à "Copier" après 2 secondes

**Code à modifier :**

```tsx
// Ajouter un état pour le feedback
const [copied, setCopied] = useState(false);

// Modifier le handler
const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
};

// Modifier le bouton
<button
    onClick={handleCopy}
    className={`px-3 py-1 rounded text-xs transition-colors ${
        copied
            ? "bg-green-500 text-white"
            : "bg-green-600 text-white hover:bg-green-700"
    }`}
>
    {copied ? "Copié !" : "Copier"}
</button>;
```

---

## 17. ✅ VÉRIFICATION ÉCRANS APPORTEUR (21/12/2024)

> Rapport de vérification complète de tous les écrans côté apporteur.

### ✅ CE QUI FONCTIONNE PARFAITEMENT

#### Dashboard Apporteur (`/page.tsx`)

- ✅ Salutation personnalisée selon l'heure
- ✅ Affichage des stats : dossiers envoyés, économies générées
- ✅ Bouton "Nouveau Dossier" fonctionnel
- ✅ Composants `ApporteurHeader`, `ApporteurStatsCards`, `ApporteurActivity`
- ✅ Dark mode avec hook centralisé `useTheme`
- ✅ Récupération profil via `api.getCurrentApporteurProfile()`
- ✅ Gestion erreurs et état de chargement

#### Liste des dossiers (`/mes-dossiers`)

- ✅ Pagination fonctionnelle (6 dossiers/page)
- ✅ Filtres par statut (tous, en_attente, en_cours, finalise, refuse)
- ✅ Tri par date, statut, client, numéro
- ✅ Recherche textuelle
- ✅ Badge cliquables pour filtrage rapide
- ✅ Utilisation de `getStatutBadgeConfig` centralisé
- ✅ Mapping `computed_statut` depuis la DB
- ✅ `EmptyState` pour les cas sans résultats

#### Détail dossier (`/dossier/[id]`)

- ✅ Suivi du dossier en 6 étapes visuelles
- ✅ Section devis avec acceptation/refus
- ✅ Affichage de la commission apporteur (% ou fixe)
- ✅ Documents joints avec téléchargement
- ✅ Historique des devis (`devisHistory`)
- ✅ Modal de refus avec motifs prédéfinis
- ✅ Informations client complètes
- ✅ Support conjoint pour dossiers couple
- ✅ Validation/Refus via `DevisService`

#### Création de dossier (`/nouveau-dossier`)

- ✅ Workflow 3 étapes (type → infos → docs)
- ✅ Validation complète des champs
- ✅ Avertissement dossier incomplet
- ✅ Upload documents via FormData
- ✅ Redirection vers `/dossier-confirme/[id]`
- ✅ Support dossiers couple

#### Profil Apporteur (`/profil`)

- ✅ 5 sections : Profil, Wallet, Cabinet, Notifications, Ressources
- ✅ `WalletSection` : soldes disponible/en attente/versé
- ✅ `CabinetSection` : infos du cabinet + quitter
- ✅ Modification email/téléphone
- ✅ Changement de mot de passe

#### Onboarding (`/onboarding`)

- ✅ Acceptation CGU complète
- ✅ 10 sections détaillées
- ✅ Checkbox d'acceptation obligatoire
- ✅ Mise à jour `cgu_accepted_at`
- ✅ Redirection après acceptation

#### Activités (`/activites`)

- ✅ Filtres par type (success, info, warning, error)
- ✅ Option "non lus uniquement"
- ✅ Tri par date ou type
- ✅ Pagination complète
- ✅ Cache local pour statut lecture
- ✅ Clic sur activité → navigation dossier

#### Header Apporteur (`ApporteurHeader.tsx`)

- ✅ Logo GMB avec adaptation dark mode
- ✅ Navigation desktop et mobile
- ✅ Notifications avec compteur non lus
- ✅ Menu profil avec déconnexion
- ✅ Toggle dark mode
- ✅ Cache de lecture notifications optimiste

---

### ⚠️ Points d'attention identifiés

#### Sécurité RLS

- ⚠️ Policies `_dev_all` présentes sur `activities`, `devis`, `notifications` (à
  supprimer en prod)
- ✅ Policies correctes sur `dossiers`, `apporteur_profiles`,
  `broker_apporteurs`

#### Données de test

- 6 apporteurs en base (4 actifs, 1 inactif, 1 sans CGU)
- Marie Dubois : 15 dossiers, 3 finalisés
- Jean Leclerc : 3 dossiers, 1 finalisé
- 10 devis existants (données de test octobre 2025)

#### Fonctionnalités à finaliser

- ❌ Bouton "Demander un retrait" désactivé (WalletSection)
- ❌ Lien "Mes Gains" désactivé dans le header
- ❌ Envoi email non fonctionnel (attente Resend)

---

### ✅ Architecture et qualité du code

| Élément                        | Statut | Note                                        |
| ------------------------------ | ------ | ------------------------------------------- |
| Hook `useTheme`                | ✅     | Centralisé pour dark mode                   |
| `getStatutBadgeConfig`         | ✅     | Affichage uniforme des statuts              |
| `formatDate`, `formatCurrency` | ✅     | Dans `lib/utils/formatters`                 |
| `EmptyState`                   | ✅     | Composant réutilisable                      |
| Cache notifications            | ✅     | Optimiste pour UX fluide                    |
| Services API                   | ✅     | `api.ts`, `DossiersService`, `DevisService` |

---

_Document à usage interne - GMB Apporteur_
