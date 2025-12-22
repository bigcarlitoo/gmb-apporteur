import {
  DiffReport,
  FieldDifference,
  ExtractedClientData,
  CurrentClientData
} from '@/types/data-comparison'
import { formatDate } from '@/lib/utils/formatters'

export class DataComparisonService {
  /**
   * Labels français pour les champs
   */
  private static FIELD_LABELS: Record<string, string> = {
    civilite: 'Civilité',
    nom: 'Nom',
    prenom: 'Prénom',
    nomNaissance: 'Nom de naissance',
    dateNaissance: 'Date de naissance',
    fumeur: 'Statut fumeur',
    categorieProfessionnelle: 'Catégorie professionnelle',
    email: 'Email',
    telephone: 'Téléphone',
  }

  /**
   * Détecte le type de dossier depuis les données extraites
   */
  static detectDossierType(extractedData: ExtractedClientData): 'seul' | 'couple' {
    // Si nombreAssures est explicitement fourni
    if (extractedData.nombreAssures === 2) {
      return 'couple'
    }
    if (extractedData.nombreAssures === 1) {
      return 'seul'
    }

    // Sinon, vérifier si des données conjoint existent
    const hasConjoint = extractedData.conjoint && (
      extractedData.conjoint.nom ||
      extractedData.conjoint.prenom ||
      extractedData.conjoint.dateNaissance
    )

    return hasConjoint ? 'couple' : 'seul'
  }

  /**
   * Compare une valeur actuelle avec une valeur extraite
   */
  private static compareValue(current: any, extracted: any): boolean {
    // Si les deux sont null/undefined, pas de différence
    if (!current && !extracted) return false
    
    // Si l'un est null et l'autre non, c'est différent
    if (!current || !extracted) return true
    
    // Comparaison de dates
    if (typeof current === 'string' && typeof extracted === 'string') {
      // Normaliser les dates pour comparaison
      if (current.match(/^\d{4}-\d{2}-\d{2}/) && extracted.match(/^\d{4}-\d{2}-\d{2}/)) {
        return current.slice(0, 10) !== extracted.slice(0, 10)
      }
    }
    
    // Comparaison booléenne
    if (typeof current === 'boolean' && typeof extracted === 'boolean') {
      return current !== extracted
    }
    
    // Comparaison standard (case-insensitive pour strings)
    const currentStr = String(current).toLowerCase().trim()
    const extractedStr = String(extracted).toLowerCase().trim()
    
    return currentStr !== extractedStr
  }

  /**
   * Crée un objet FieldDifference pour un champ
   */
  private static createFieldDiff(
    field: string,
    currentValue: any,
    extractedValue: any,
    category: 'principal' | 'conjoint' | 'pret'
  ): FieldDifference | null {
    // Ne pas créer de différence si la valeur extraite est null/undefined
    // (cela signifie que l'IA n'a pas trouvé ce champ)
    if (extractedValue === null || extractedValue === undefined || extractedValue === '') {
      return null
    }

    const isDifferent = this.compareValue(currentValue, extractedValue)
    const isNew = !currentValue && !!extractedValue

    return {
      field,
      label: this.FIELD_LABELS[field] || field,
      currentValue: currentValue || null,
      extractedValue: extractedValue || null,
      isDifferent,
      isNew,
      category
    }
  }

  /**
   * Compare les données de l'emprunteur principal
   */
  private static comparePrincipal(
    current: CurrentClientData,
    extracted: ExtractedClientData
  ): FieldDifference[] {
    const diffs: FieldDifference[] = []

    if (!extracted.principal) return diffs

    const fields = [
      { current: current.civilite, extracted: extracted.principal.civilite, field: 'civilite' },
      { current: current.client_nom, extracted: extracted.principal.nom, field: 'nom' },
      { current: current.client_prenom, extracted: extracted.principal.prenom, field: 'prenom' },
      { current: current.nom_naissance, extracted: extracted.principal.nomNaissance, field: 'nomNaissance' },
      { current: current.client_date_naissance, extracted: extracted.principal.dateNaissance, field: 'dateNaissance' },
      { current: current.client_fumeur, extracted: extracted.principal.fumeur, field: 'fumeur' },
      { current: current.categorie_professionnelle, extracted: extracted.principal.categorieProfessionnelle, field: 'categorieProfessionnelle' },
      { current: current.client_email, extracted: extracted.principal.email, field: 'email' },
      { current: current.client_telephone, extracted: extracted.principal.telephone, field: 'telephone' },
    ]

    for (const { current, extracted, field } of fields) {
      const diff = this.createFieldDiff(field, current, extracted, 'principal')
      // Filtrer les null (champs non extraits) ET ne garder que les différences/nouveautés
      if (diff && (diff.isDifferent || diff.isNew)) {
        diffs.push(diff)
      }
    }

    return diffs
  }

  /**
   * Compare les données du conjoint
   */
  private static compareConjoint(
    current: CurrentClientData,
    extracted: ExtractedClientData
  ): FieldDifference[] {
    const diffs: FieldDifference[] = []

    if (!extracted.conjoint) return diffs

    const fields = [
      { current: current.conjoint_civilite, extracted: extracted.conjoint.civilite, field: 'civilite' },
      { current: current.conjoint_nom, extracted: extracted.conjoint.nom, field: 'nom' },
      { current: current.conjoint_prenom, extracted: extracted.conjoint.prenom, field: 'prenom' },
      { current: current.conjoint_nom_naissance, extracted: extracted.conjoint.nomNaissance, field: 'nomNaissance' },
      { current: current.conjoint_date_naissance, extracted: extracted.conjoint.dateNaissance, field: 'dateNaissance' },
      { current: current.conjoint_fumeur, extracted: extracted.conjoint.fumeur, field: 'fumeur' },
      { current: current.conjoint_categorie_professionnelle, extracted: extracted.conjoint.categorieProfessionnelle, field: 'categorieProfessionnelle' },
      { current: current.conjoint_email, extracted: extracted.conjoint.email, field: 'email' },
      { current: current.conjoint_telephone, extracted: extracted.conjoint.telephone, field: 'telephone' },
    ]

    for (const { current, extracted, field } of fields) {
      const diff = this.createFieldDiff(field, current, extracted, 'conjoint')
      // Filtrer les null (champs non extraits) ET ne garder que les différences/nouveautés
      if (diff && (diff.isDifferent || diff.isNew)) {
        diffs.push(diff)
      }
    }

    return diffs
  }

  /**
   * Génère un rapport complet de comparaison
   */
  static generateDiffReport(
    current: CurrentClientData,
    extracted: ExtractedClientData,
    currentIsCouple: boolean
  ): DiffReport {
    // Déterminer le type détecté
    const detectedType = this.detectDossierType(extracted)
    const currentType: 'seul' | 'couple' = currentIsCouple ? 'couple' : 'seul'

    // Comparer les données
    const principalDiffs = this.comparePrincipal(current, extracted)
    const conjointDiffs = this.compareConjoint(current, extracted)

    // Calculer le total de différences
    const totalDifferences = principalDiffs.length + conjointDiffs.length

    // Vérifier s'il y a un conflit de type
    const hasTypeMismatch = currentType !== detectedType

    // Rapport final
    const report: DiffReport = {
      hasClientDifferences: totalDifferences > 0,
      hasTypeMismatch,
      principalDiffs,
      conjointDiffs,
      currentType,
      detectedType,
      champsManquants: extracted.champsManquants || [],
      totalDifferences,
      confidence: 0.9 // Confidence par défaut, peut être surchargée
    }

    return report
  }

  /**
   * Formatte une valeur pour l'affichage
   * ✅ Utilise le formatter centralisé pour les dates
   */
  static formatValue(value: any, field: string): string {
    if (value === null || value === undefined || value === '') {
      return '-'
    }

    // Formatage spécifique par type de champ
    if (field === 'dateNaissance' && typeof value === 'string') {
      try {
        return formatDate(value) // ✅ Utilisation du formatter centralisé
      } catch {
        return value
      }
    }

    if (field === 'fumeur') {
      return value ? 'Fumeur' : 'Non-fumeur'
    }

    if (field === 'civilite') {
      return value
    }

    return String(value)
  }

  /**
   * Applique les changements sélectionnés
   */
  static buildUpdatePayload(
    selectedFields: string[],
    extracted: ExtractedClientData,
    dossierId: string
  ): any {
    const payload: any = {
      dossier_id: dossierId
    }

    // Mapper les champs sélectionnés vers les colonnes DB
    for (const field of selectedFields) {
      const [category, fieldName] = field.split('.')
      
      if (category === 'principal') {
        switch (fieldName) {
          case 'civilite':
            payload.client_civilite = extracted.principal?.civilite
            break
          case 'nom':
            payload.client_nom = extracted.principal?.nom
            break
          case 'prenom':
            payload.client_prenom = extracted.principal?.prenom
            break
          case 'nomNaissance':
            payload.nom_naissance = extracted.principal?.nomNaissance
            break
          case 'dateNaissance':
            payload.client_date_naissance = extracted.principal?.dateNaissance
            break
          case 'fumeur':
            payload.client_fumeur = extracted.principal?.fumeur
            break
          case 'categorieProfessionnelle':
            payload.categorie_professionnelle = extracted.principal?.categorieProfessionnelle
            break
          case 'email':
            payload.client_email = extracted.principal?.email
            break
          case 'telephone':
            payload.client_telephone = extracted.principal?.telephone
            break
        }
      } else if (category === 'conjoint') {
        switch (fieldName) {
          case 'civilite':
            payload.conjoint_civilite = extracted.conjoint?.civilite
            break
          case 'nom':
            payload.conjoint_nom = extracted.conjoint?.nom
            break
          case 'prenom':
            payload.conjoint_prenom = extracted.conjoint?.prenom
            break
          case 'nomNaissance':
            payload.conjoint_nom_naissance = extracted.conjoint?.nomNaissance
            break
          case 'dateNaissance':
            payload.conjoint_date_naissance = extracted.conjoint?.dateNaissance
            break
          case 'fumeur':
            payload.conjoint_fumeur = extracted.conjoint?.fumeur
            break
          case 'categorieProfessionnelle':
            payload.conjoint_categorie_professionnelle = extracted.conjoint?.categorieProfessionnelle
            break
          case 'email':
            payload.conjoint_email = extracted.conjoint?.email
            break
          case 'telephone':
            payload.conjoint_telephone = extracted.conjoint?.telephone
            break
        }
      }
    }

    return payload
  }
}

