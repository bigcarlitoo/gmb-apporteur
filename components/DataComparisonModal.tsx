'use client'

import { useState, useMemo } from 'react'
import { DiffReport, FieldDifference } from '@/types/data-comparison'
import { DataComparisonService } from '@/lib/services/data-comparison'

interface DataComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  diffReport: DiffReport
  onApplyChanges: (selectedFields: string[], updateType: boolean) => Promise<void>
}

export default function DataComparisonModal({
  isOpen,
  onClose,
  diffReport,
  onApplyChanges
}: DataComparisonModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [updateType, setUpdateType] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Calcul : tous les champs sélectionnables
  const allFields = useMemo(() => {
    return [
      ...diffReport.principalDiffs.map(d => `principal.${d.field}`),
      ...diffReport.conjointDiffs.map(d => `conjoint.${d.field}`)
    ]
  }, [diffReport])

  // Toggle un champ individuel
  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey)
      } else {
        newSet.add(fieldKey)
      }
      return newSet
    })
  }

  // Tout sélectionner / Tout désélectionner
  const toggleSelectAll = () => {
    if (selectedFields.size === allFields.length) {
      setSelectedFields(new Set())
    } else {
      setSelectedFields(new Set(allFields))
    }
  }

  // Appliquer les changements
  const handleApply = async () => {
    try {
      setIsApplying(true)
      await onApplyChanges(Array.from(selectedFields), updateType)
      onClose()
    } catch (error) {
      console.error('Erreur lors de l\'application des changements:', error)
      alert('Une erreur est survenue lors de l\'application des changements')
    } finally {
      setIsApplying(false)
    }
  }

  // Rendu d'une différence individuelle
  const renderDifference = (diff: FieldDifference, category: 'principal' | 'conjoint') => {
    const fieldKey = `${category}.${diff.field}`
    const isSelected = selectedFields.has(fieldKey)

    return (
      <div
        key={fieldKey}
        className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleField(fieldKey)}
          className="mt-1 w-4 h-4 text-[#335FAD] rounded focus:ring-[#335FAD]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white">
              {diff.label}
            </h5>
            {diff.isNew && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
                Nouveau
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <p className="text-gray-500 dark:text-gray-400 font-medium">Actuel :</p>
              <p className="text-gray-700 dark:text-gray-300 break-words">
                {DataComparisonService.formatValue(diff.currentValue, diff.field)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[#335FAD] dark:text-[#335FAD]/90 font-medium">Extrait :</p>
              <p className="text-gray-900 dark:text-white font-medium break-words">
                {DataComparisonService.formatValue(diff.extractedValue, diff.field)}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-light text-gray-900 dark:text-white">
              Différences détectées
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {diffReport.totalDifferences} différence{diffReport.totalDifferences > 1 ? 's' : ''} trouvée{diffReport.totalDifferences > 1 ? 's' : ''} dans les données extraites
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Contrôles de sélection */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <button
              onClick={toggleSelectAll}
              className="text-sm font-medium text-[#335FAD] hover:text-[#335FAD]/80 transition-colors flex items-center gap-2"
            >
              <i className={`ri-${selectedFields.size === allFields.length ? 'checkbox' : 'checkbox-blank'}-line`}></i>
              {selectedFields.size === allFields.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedFields.size} / {allFields.length} sélectionné{selectedFields.size > 1 ? 's' : ''}
            </p>
          </div>

          {/* Conflit de type de dossier */}
          {diffReport.hasTypeMismatch && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-start gap-3">
                <i className="ri-alert-line text-orange-600 dark:text-orange-400 text-xl mt-0.5"></i>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-2">
                    Conflit de type de dossier détecté
                  </h4>
                  <p className="text-sm text-orange-800 dark:text-orange-400 mb-3">
                    Le type actuel est <strong>{diffReport.currentType === 'seul' ? 'Emprunteur seul' : 'Couple'}</strong>, 
                    mais l'extraction détecte <strong>{diffReport.detectedType === 'seul' ? 'Emprunteur seul' : 'Couple'}</strong>.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateType}
                      onChange={(e) => setUpdateType(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                      Mettre à jour le type de dossier vers "{diffReport.detectedType === 'seul' ? 'Emprunteur seul' : 'Couple'}"
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Emprunteur principal */}
          {diffReport.principalDiffs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <i className="ri-user-line text-[#335FAD]"></i>
                Emprunteur principal ({diffReport.principalDiffs.length})
              </h3>
              {diffReport.principalDiffs.map(diff => renderDifference(diff, 'principal'))}
            </div>
          )}

          {/* Conjoint */}
          {diffReport.conjointDiffs.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <i className="ri-user-heart-line text-[#335FAD]"></i>
                Conjoint ({diffReport.conjointDiffs.length})
              </h3>
              {diffReport.conjointDiffs.map(diff => renderDifference(diff, 'conjoint'))}
            </div>
          )}

          {/* Champs manquants (non bloquant) */}
          {diffReport.champsManquants.length > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <i className="ri-information-line text-blue-600 dark:text-blue-400 text-xl mt-0.5"></i>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Informations non trouvées
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                    Les champs suivants n'ont pas pu être extraits des documents :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {diffReport.champsManquants.map(champ => (
                      <span
                        key={champ}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded"
                      >
                        {champ}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            disabled={isApplying}
          >
            Annuler
          </button>
          <button
            onClick={handleApply}
            disabled={selectedFields.size === 0 && !updateType || isApplying}
            className="px-6 py-2 bg-[#335FAD] text-white rounded-lg hover:bg-[#2a4d8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Application...
              </>
            ) : (
              <>
                <i className="ri-check-line"></i>
                Appliquer les changements ({selectedFields.size + (updateType ? 1 : 0)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


