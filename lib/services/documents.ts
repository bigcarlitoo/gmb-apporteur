import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type DocumentRow = Database['public']['Tables']['documents']['Row']
type DocumentInsert = Database['public']['Tables']['documents']['Insert']

export class DocumentsService {
  /**
   * Liste tous les documents d'un dossier
   */
  static async listByDossierId(dossierId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DocumentsService.listByDossierId] error', error)
      throw error
    }
    return (data || []) as DocumentRow[]
  }

  /**
   * Upload un document vers Supabase Storage
   */
  static async uploadDocument(file: File, dossierId: string, documentType: string): Promise<string> {
    try {
      // Créer un nom de fichier unique
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${dossierId}/${documentType}_${timestamp}.${fileExtension}`

      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('[DocumentsService.uploadDocument] upload error', uploadError)
        throw uploadError
      }

      // Retourner le chemin de stockage (storage_path) au lieu de l'URL publique
      return uploadData.path
    } catch (error) {
      console.error('[DocumentsService.uploadDocument] error', error)
      throw error
    }
  }

  /**
   * Enregistre un document dans la base de données
   */
  static async createDocument(documentData: DocumentInsert): Promise<DocumentRow> {
    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (error) {
      console.error('[DocumentsService.createDocument] error', error)
      throw error
    }

    return data as DocumentRow
  }

  /**
   * Upload et enregistre un document complet
   */
  static async uploadAndCreateDocument(
    file: File,
    dossierId: string,
    documentType: string,
    _metadata?: Record<string, any> // Note: metadata not stored in documents table
  ): Promise<DocumentRow> {
    try {
      // Upload le fichier
      const fileUrl = await this.uploadDocument(file, dossierId, documentType)

      // Enregistrer en base
      const documentData: DocumentInsert = {
        dossier_id: dossierId,
        document_type: documentType,
        document_name: file.name,
        file_size: file.size,
        storage_path: fileUrl, // fileUrl est maintenant le chemin stocké
        mime_type: file.type || null,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id || null
      }

      return await this.createDocument(documentData)
    } catch (error) {
      console.error('[DocumentsService.uploadAndCreateDocument] error', error)
      throw error
    }
  }

  /**
   * Upload multiple documents pour un dossier
   */
  static async uploadMultipleDocuments(
    documents: Record<string, File>,
    dossierId: string
  ): Promise<DocumentRow[]> {
    const uploadPromises = Object.entries(documents)
      .filter(([_, file]) => file !== null)
      .map(([documentType, file]) =>
        this.uploadAndCreateDocument(file, dossierId, documentType)
      )

    try {
      const results = await Promise.all(uploadPromises)
      console.log(`[DocumentsService.uploadMultipleDocuments] uploaded ${results.length} documents`)
      return results
    } catch (error) {
      console.error('[DocumentsService.uploadMultipleDocuments] error', error)
      throw error
    }
  }

  /**
   * Supprime un document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    // Récupérer les infos du document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      console.error('[DocumentsService.deleteDocument] fetch error', fetchError)
      throw fetchError
    }

    // Supprimer le fichier du storage
    if (document.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path])

      if (storageError) {
        console.error('[DocumentsService.deleteDocument] storage error', storageError)
        // Continue même si le storage échoue
      }
    }

    // Supprimer l'enregistrement de la base
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('[DocumentsService.deleteDocument] delete error', deleteError)
      throw deleteError
    }
  }
}