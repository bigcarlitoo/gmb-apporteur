'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, FileText, User, Euro, Calendar } from 'lucide-react'

interface ExtractionResultProps {
  extractionData: {
    success: boolean
    error?: string
    message: string
    confidence?: number
    warnings?: string[]
    sourcesUtilisees?: string[]
  }
}

export function ExtractionResult({ extractionData }: ExtractionResultProps) {
  if (!extractionData.success && !extractionData.error) {
    return null // Pas d'extraction tentée
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {extractionData.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          Extraction Automatique des Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statut principal */}
          <div className="flex items-center gap-2">
            <Badge variant={extractionData.success ? "default" : "destructive"}>
              {extractionData.success ? "Réussie" : "Échouée"}
            </Badge>
            {extractionData.confidence && (
              <Badge variant="outline">
                Confiance: {Math.round(extractionData.confidence * 100)}%
              </Badge>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-muted-foreground">
            {extractionData.message}
          </p>

          {/* Sources utilisées */}
          {extractionData.sourcesUtilisees && extractionData.sourcesUtilisees.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Sources utilisées:
              </h4>
              <div className="flex flex-wrap gap-1">
                {extractionData.sourcesUtilisees.map((source, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {extractionData.warnings && extractionData.warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                Avertissements:
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {extractionData.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Erreur détaillée */}
          {extractionData.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-1">
                Détails de l'erreur:
              </h4>
              <p className="text-sm text-red-700">
                {extractionData.error}
              </p>
            </div>
          )}

          {/* Actions suggérées */}
          {!extractionData.success && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                Prochaines étapes:
              </h4>
              <p className="text-sm text-blue-700">
                Les données du prêt devront être saisies manuellement dans l'onglet "Infos du prêt".
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Composant pour afficher les données extraites dans l'interface admin
interface ExtractedDataDisplayProps {
  extractedData: {
    emprunteurs: {
      principal: any
      conjoint: any
    }
    pret: any
    calculs: any
    metadata: any
  }
}

export function ExtractedDataDisplay({ extractedData }: ExtractedDataDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Emprunteurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Emprunteurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Emprunteur principal */}
            <div>
              <h4 className="font-medium mb-2">Emprunteur principal</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Nom:</strong> {extractedData.emprunteurs.principal?.nom || 'Non trouvé'}</p>
                <p><strong>Prénom:</strong> {extractedData.emprunteurs.principal?.prenom || 'Non trouvé'}</p>
                <p><strong>Date de naissance:</strong> {extractedData.emprunteurs.principal?.dateNaissance || 'Non trouvée'}</p>
              </div>
            </div>

            {/* Conjoint */}
            {extractedData.emprunteurs.conjoint && (
              <div>
                <h4 className="font-medium mb-2">Conjoint</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Nom:</strong> {extractedData.emprunteurs.conjoint.nom || 'Non trouvé'}</p>
                  <p><strong>Prénom:</strong> {extractedData.emprunteurs.conjoint.prenom || 'Non trouvé'}</p>
                  <p><strong>Date de naissance:</strong> {extractedData.emprunteurs.conjoint.dateNaissance || 'Non trouvée'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prêt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Informations du Prêt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 text-sm">
              <p><strong>Montant:</strong> {extractedData.pret?.montantInitial?.toLocaleString() || 'Non trouvé'} €</p>
              <p><strong>Durée initiale:</strong> {extractedData.pret?.dureeInitialeMois || 'Non trouvée'} mois</p>
              <p><strong>Taux nominal:</strong> {extractedData.pret?.tauxNominal || 'Non trouvé'} %</p>
            </div>
            <div className="space-y-1 text-sm">
              <p><strong>Banque:</strong> {extractedData.pret?.banquePreteuse || 'Non trouvée'}</p>
              <p><strong>Type:</strong> {extractedData.pret?.typePret || 'Non trouvé'}</p>
              <p><strong>Date début:</strong> {extractedData.pret?.dateDebut || 'Non trouvée'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculs métier */}
      {extractedData.calculs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calculs Métier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Date de début effective</p>
                <p className="text-lg font-bold text-blue-800">{extractedData.calculs.dateDebutEffective}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Durée restante</p>
                <p className="text-lg font-bold text-green-800">{extractedData.calculs.dureeRestanteMois} mois</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Capital restant dû</p>
                <p className="text-lg font-bold text-purple-800">{extractedData.calculs.capitalRestantDu?.toLocaleString()} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Métadonnées d'Extraction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Confiance:</strong> {Math.round((extractedData.metadata?.confidence || 0) * 100)}%</p>
            {extractedData.metadata?.warnings && extractedData.metadata.warnings.length > 0 && (
              <div>
                <p><strong>Avertissements:</strong></p>
                <ul className="list-disc list-inside text-yellow-700">
                  {extractedData.metadata.warnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



