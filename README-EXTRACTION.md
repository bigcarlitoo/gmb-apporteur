# 🚀 Service d'Extraction Intelligente - Guide de Démarrage

## 🎯 Installation Rapide

### 1. Configuration OpenRouter

1. Créez un compte sur [OpenRouter](https://openrouter.ai/)
2. Générez une clé API
3. Ajoutez-la à votre `.env` :

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=openai/gpt-4o
```

### 2. Test de l'installation

```bash
npm run test:extraction
```

## 🔧 Utilisation

### Flux automatique

Le service s'active automatiquement lors de la création d'un dossier :

1. **Apporteur** upload les documents
2. **API** déclenche l'extraction automatiquement
3. **Données** sont sauvegardées dans `pret_data`
4. **Admin** voit le dossier pré-rempli

### Test manuel

```typescript
import { DocumentExtractionService } from "@/lib/services/document-extraction";

const result = await DocumentExtractionService.extractFromDossier("dossier-id");
console.log("Résultat:", result);
```

## 📊 Données extraites

### ✅ Données principales

- **Emprunteurs** : nom, prénom, date de naissance
- **Prêt** : montant, durée, taux, banque
- **Tableau d'amortissement** : échéances complètes

### 🧮 Calculs automatiques

- **Date de début effective** : demande + 3 mois
- **Durée restante** : calculée à partir de la date effective
- **Capital restant dû** : interpolation linéaire précise

## 🛡️ Gestion d'erreurs

### Statuts de dossier

- `en_attente` : Extraction réussie
- `en_attente_extraction_manuelle` : Extraction échouée

### Activités créées

- `extraction_automatique` : Succès
- `extraction_echouee` : Échec

## 🎨 Interface

### Composants disponibles

```tsx
import {
    ExtractedDataDisplay,
    ExtractionResult,
} from "@/components/ExtractionResult";

// Afficher le statut
<ExtractionResult extractionData={result} />;

// Afficher les données extraites
<ExtractedDataDisplay extractedData={data} />;
```

## 🔍 Débogage

### Logs utiles

```bash
[DocumentExtractionService] Début extraction pour dossier {id}
[DocumentExtractionService] Extraction réussie avec confidence {confidence}
```

### Vérifications

1. **Variables d'environnement** : `OPENROUTER_API_KEY` définie
2. **Documents** : Présents dans Supabase Storage
3. **Base de données** : Table `pret_data` mise à jour

## 🚀 Modèles recommandés

| Modèle                        | Usage      | Coût   | Performance |
| ----------------------------- | ---------- | ------ | ----------- |
| `openai/gpt-4o`               | Production | Élevé  | Excellent   |
| `anthropic/claude-3.5-sonnet` | Production | Moyen  | Très bon    |
| `openai/gpt-4o-mini`          | Tests      | Faible | Bon         |

## 📝 Exemples de documents

### Formats supportés

- **PDF** : Offres de prêt, tableaux d'amortissement
- **Images** : Documents scannés (JPEG, PNG)
- **Excel** : Tableaux d'amortissement

### Structure attendue

```
Document 1: offrePret.pdf
- Informations emprunteur
- Conditions du prêt
- Montant et durée

Document 2: tableauAmortissement.pdf
- Échéances détaillées
- Capital restant dû
- Intérêts et assurance
```

## 🆘 Résolution de problèmes

### Erreur : "OPENROUTER_API_KEY non configurée"

```bash
# Vérifiez votre .env
echo $OPENROUTER_API_KEY
```

### Erreur : "Aucun document pertinent trouvé"

- Vérifiez que les documents sont uploadés
- Vérifiez les types : `offrePret`, `tableauAmortissement`

### Erreur : "Impossible de parser la réponse JSON"

- Le modèle IA a retourné un format invalide
- Essayez un autre modèle ou ajustez le prompt

## 🔄 Mise à jour

### Ajouter un nouveau modèle

```bash
# Dans .env
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

## 🔄 Mise à jour

### Ajouter un nouveau modèle

```bash
# Dans .env
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Modifier le prompt

Le prompt système optimisé pour extraction ciblée :

```
Tu es un expert en analyse de documents bancaires français.

CONTEXTE : Tu vas recevoir un ou plusieurs fichiers de prêt et une date clé appelée "date_effective".

MISSION : Ta mission est double :
1. Analyse l'ensemble des documents pour extraire les informations générales sur les emprunteurs et le prêt.
2. Localise le tableau d'amortissement et extrais UNIQUEMENT les deux lignes qui encadrent la "date_effective" fournie.

FORMAT DE SORTIE JSON STRICT :
Tu dois retourner UNIQUEMENT un objet JSON valide, sans aucun texte explicatif avant ou après.
Retourne directement l'objet JSON suivant :

{
  "emprunteurs": {
    "principal": {
      "nom": "string | null",
      "prenom": "string | null", 
      "dateNaissance": "YYYY-MM-DD | null"
    },
    "conjoint": null | {
      "nom": "string | null",
      "prenom": "string | null",
      "dateNaissance": "YYYY-MM-DD | null"
    }
  },
  "pret": {
    "montantInitial": number | null,
    "dureeInitialeMois": number | null,
    "dateDebut": "YYYY-MM-DD | null",
    "dateFin": "YYYY-MM-DD | null", 
    "tauxNominal": number | null,
    "banquePreteuse": "string | null",
    "typePret": "string | null"
  },
  "lignesAmortissementCibles": {
    "echeanceAvant": {
      "date": "YYYY-MM-DD",
      "capitalRestantDu": number
    } | null,
    "echeanceApres": {
      "date": "YYYY-MM-DD",
      "capitalRestantDu": number
    } | null
  },
  "metadata": {
    "confidence": number,
    "warnings": ["string"]
  }
}

RÈGLES D'EXTRACTION STRICTES :
- L'utilisateur te fournira la "date_effective". Trouve l'échéance la plus proche AVANT cette date et l'échéance la plus proche APRÈS cette date.
- Si la "date_effective" tombe exactement sur une échéance, retourne cette même échéance pour "echeanceAvant" ET "echeanceApres".
- Si tu ne trouves pas de tableau d'amortissement, retourne null pour "echeanceAvant" et "echeanceApres" et ajoute un warning.
- Si une autre donnée n'est pas trouvée, utilise null.
- Dates : Convertis-les TOUJOURS au format YYYY-MM-DD.
- Montants : Retourne des nombres.

DÉTECTION DU TABLEAU D'AMORTISSEMENT :
- Le tableau d'amortissement peut être dans N'IMPORTE QUEL document
- Cherche des patterns comme : "Tableau d'amortissement", "Échéances", "Plan de remboursement", "Amortissement"
- Les colonnes peuvent être nommées différemment : "CRD", "Capital Restant Dû", "Reste à payer", "Capital dû"
- Si tu vois des lignes avec des dates et des montants, c'est probablement le tableau d'amortissement
- Même si le tableau semble incomplet, extrais les deux lignes qui encadrent la date_effective
- Si aucun tableau n'est trouvé après analyse exhaustive, retourne null pour les échéances mais ajoute un warning explicite

GESTION DU CONJOINT :
- Si les documents ne mentionnent qu'un seul emprunteur, retourne null pour le champ "conjoint"
- Si les documents mentionnent un co-emprunteur/conjoint, remplis ses informations
- En cas de doute, privilégie null pour éviter les erreurs

CONSOLIDATION DES DONNÉES :
- Si une même information apparaît dans plusieurs documents avec des valeurs différentes, privilégie la source la plus récente ou la plus détaillée
- Ajoute un warning dans metadata.warnings pour signaler les incohérences détectées
```

**Localisation** : `lib/services/document-extraction.ts` - Variable
`SYSTEM_PROMPT`

## 📞 Support

- **Documentation** : `documents/architecture/document-extraction-service.md`
- **Tests** : `npm run test:extraction`
- **Logs** : Console du navigateur et logs serveur
