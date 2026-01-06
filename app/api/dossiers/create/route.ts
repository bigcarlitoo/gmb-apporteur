/**
 * API Route: Création de dossier
 * 
 * Cette route gère la création de dossiers pour :
 * - Les apporteurs (via le formulaire nouveau-dossier)
 * - Les admins (via le formulaire admin/nouveau-dossier)
 * 
 * Authentification: Requise (via cookies ou Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createApiRouteClient, 
  createServiceRoleClient,
  getAuthenticatedUser,
  type AuthenticatedUser 
} from '@/lib/supabase/server'
import { AnalyticsService } from '@/lib/services/analytics'

export const runtime = 'nodejs'

// Helper pour valider les UUID
const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

export async function POST(request: NextRequest) {
  console.log('[API Dossiers Create] Début de la requête')
  
  try {
    // ========================================
    // 1. AUTHENTIFICATION
    // ========================================
    const supabase = await createApiRouteClient(request)
    const authUser = await getAuthenticatedUser(supabase)
    
    if (!authUser) {
      console.log('[API Dossiers Create] Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    console.log('[API Dossiers Create] Utilisateur authentifié:', {
      id: authUser.id,
      role: authUser.role,
      brokerId: authUser.brokerId,
      apporteurId: authUser.apporteurId
    })
    
    // ========================================
    // 2. PARSING DES DONNÉES
    // ========================================
    const formData = await request.formData()
    
    const dossierData = {
      type: formData.get('type') as string,
      clientInfo: JSON.parse(formData.get('clientInfo') as string || '{}'),
      commentaire: formData.get('commentaire') as string || '',
      isComplete: formData.get('isComplete') === 'true',
      createdByAdmin: formData.get('createdByAdmin') === 'true',
      apporteurId: formData.get('apporteur_id') as string | null,
      documents: {
        offrePret: formData.get('documents.offrePret') as File | null,
        tableauAmortissement: formData.get('documents.tableauAmortissement') as File | null,
        carteIdentite: formData.get('documents.carteIdentite') as File | null,
        carteIdentiteConjoint: formData.get('documents.carteIdentiteConjoint') as File | null
      }
    }
    
    // Le broker_id peut être passé explicitement ou déduit de l'utilisateur
    let brokerId = formData.get('broker_id') as string | null || authUser.brokerId
    
    console.log('[API Dossiers Create] Données reçues:', {
      type: dossierData.type,
      createdByAdmin: dossierData.createdByAdmin,
      brokerId,
      clientNom: dossierData.clientInfo?.nom,
      documentsCount: Object.values(dossierData.documents).filter(Boolean).length
    })
    
    // ========================================
    // 3. VALIDATION
    // ========================================
    if (!dossierData.clientInfo?.nom || !dossierData.clientInfo?.prenom || !dossierData.clientInfo?.email) {
      return NextResponse.json(
        { error: 'Nom, prénom et email sont obligatoires', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    
    // ========================================
    // 4. DÉTERMINATION DES IDS (apporteur, broker)
    // ========================================
    let apporteurId: string | null = null
    
    // Si c'est un admin qui crée le dossier
    if (dossierData.createdByAdmin && (authUser.role === 'admin' || authUser.role === 'broker_user')) {
      // L'apporteur peut être spécifié explicitement
      apporteurId = dossierData.apporteurId || null
      
      // Si pas de broker_id explicite, utiliser celui du contexte admin
      if (!brokerId && authUser.brokerId) {
        brokerId = authUser.brokerId
      }
    } else {
      // C'est un apporteur qui crée son propre dossier
      apporteurId = authUser.apporteurId
      
      // Le broker_id vient du contexte de l'apporteur
      if (!brokerId && authUser.brokerId) {
        brokerId = authUser.brokerId
      }
    }
    
    console.log('[API Dossiers Create] IDs déterminés:', { apporteurId, brokerId })
    
    // ========================================
    // 5. VÉRIFICATION CLIENT LOCK (anti-contournement)
    // ========================================
    if (brokerId && dossierData.clientInfo?.dateNaissance) {
      try {
        const { data: lockResult } = await supabase.rpc('check_client_lock', {
          p_broker_id: brokerId,
          p_nom: dossierData.clientInfo.nom,
          p_prenom: dossierData.clientInfo.prenom,
          p_date_naissance: dossierData.clientInfo.dateNaissance
        })
        
        const result = Array.isArray(lockResult) ? lockResult[0] : lockResult
        if (result?.is_locked && result?.dossier_id) {
          console.log('[API Dossiers Create] Client déjà locké:', result.dossier_id)
          return NextResponse.json({
            error: 'client_locked',
            message: 'Ce client est déjà associé à un dossier existant.',
            existing_dossier_id: result.dossier_id,
            code: 'CLIENT_LOCKED'
          }, { status: 409 })
        }
      } catch (error) {
        console.warn('[API Dossiers Create] Erreur vérification client lock (non bloquant):', error)
      }
    }
    
    // ========================================
    // 6. CRÉATION DU DOSSIER
    // ========================================
    // Utiliser le service role client pour bypasser les RLS
    const serviceClient = createServiceRoleClient()
    
    const typeDossierMapping: Record<string, string> = {
      'seul': 'pret_immobilier',
      'couple': 'pret_immobilier'
    }
    
    const numeroDossier = `DOS-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // Récupérer le produit d'assurance par défaut (Assurance Emprunteur)
    const { data: defaultProduct } = await serviceClient
      .from('insurance_products')
      .select('id')
      .eq('code', 'loan_insurance')
      .eq('is_enabled', true)
      .single()
    
    const insuranceProductId = defaultProduct?.id || '7dd78abe-2447-4706-b23e-79674fb29be8'
    
    const { data: createdDossier, error: dossierError } = await serviceClient
      .from('dossiers')
      .insert({
        numero_dossier: numeroDossier,
        type_dossier: typeDossierMapping[dossierData.type] || 'pret_immobilier',
        commentaire: dossierData.commentaire || null,
        statut_canon: 'en_attente',
        is_couple: dossierData.type === 'couple',
        apporteur_id: apporteurId,
        broker_id: brokerId,
        insurance_product_id: insuranceProductId,
        // admin_id stocke l'utilisateur qui a créé le dossier (si admin/broker)
        admin_id: dossierData.createdByAdmin ? authUser.id : null
      })
      .select()
      .single()
    
    if (dossierError) {
      console.error('[API Dossiers Create] Erreur création dossier:', dossierError)
      return NextResponse.json(
        { error: 'Erreur lors de la création du dossier', details: dossierError.message },
        { status: 500 }
      )
    }
    
    const dossierId = createdDossier.id
    console.log('[API Dossiers Create] Dossier créé:', dossierId)
    
    // ========================================
    // 7. CRÉATION DES INFORMATIONS CLIENT
    // ========================================
    const { error: clientError } = await serviceClient
      .from('client_infos')
      .insert({
        dossier_id: dossierId,
        // Identité principal
        client_civilite: dossierData.clientInfo?.civilite || null,
        client_nom: dossierData.clientInfo?.nom,
        client_prenom: dossierData.clientInfo?.prenom,
        client_nom_naissance: dossierData.clientInfo?.nom_naissance || dossierData.clientInfo?.nom || null,
        client_date_naissance: dossierData.clientInfo?.dateNaissance,
        client_lieu_naissance: dossierData.clientInfo?.lieu_naissance || null,
        // Adresse
        client_adresse: dossierData.clientInfo?.adresse || null,
        client_complement_adresse: dossierData.clientInfo?.complement_adresse || null,
        client_code_postal: dossierData.clientInfo?.code_postal || null,
        client_ville: dossierData.clientInfo?.ville || null,
        // Contact
        client_email: dossierData.clientInfo?.email,
        client_telephone: dossierData.clientInfo?.telephone || null,
        // Professionnel - codes Exade
        client_profession: dossierData.clientInfo?.profession || null,
        categorie_professionnelle: dossierData.clientInfo?.categorie_professionnelle ?? null,
        // Santé/Risques - codes Exade (utiliser ?? pour préserver les valeurs 0)
        client_fumeur: dossierData.clientInfo?.fumeur ?? false,
        client_deplacement_pro: dossierData.clientInfo?.deplacement_pro ?? 1,
        client_travaux_manuels: dossierData.clientInfo?.travaux_manuels ?? 0,
        // Conjoint si couple
        conjoint_civilite: dossierData.clientInfo?.conjoint?.civilite || null,
        conjoint_nom: dossierData.clientInfo?.conjoint?.nom || null,
        conjoint_prenom: dossierData.clientInfo?.conjoint?.prenom || null,
        conjoint_nom_naissance: dossierData.clientInfo?.conjoint?.nom_naissance || dossierData.clientInfo?.conjoint?.nom || null,
        conjoint_date_naissance: dossierData.clientInfo?.conjoint?.dateNaissance || null,
        conjoint_lieu_naissance: dossierData.clientInfo?.conjoint?.lieu_naissance || null,
        conjoint_profession: dossierData.clientInfo?.conjoint?.profession || null,
        conjoint_categorie_professionnelle: dossierData.clientInfo?.conjoint?.categorie_professionnelle ?? null,
        conjoint_fumeur: dossierData.clientInfo?.conjoint?.fumeur ?? null,
        conjoint_deplacement_pro: dossierData.clientInfo?.conjoint?.deplacement_pro ?? null,
        conjoint_travaux_manuels: dossierData.clientInfo?.conjoint?.travaux_manuels ?? null
      })
    
    if (clientError) {
      console.error('[API Dossiers Create] Erreur création client_infos:', clientError)
      // Rollback du dossier
      await serviceClient.from('dossiers').delete().eq('id', dossierId)
      return NextResponse.json(
        { error: 'Erreur lors de la création des informations client', details: clientError.message },
        { status: 500 }
      )
    }
    
    // ========================================
    // 8. UPLOAD DES DOCUMENTS
    // ========================================
    const uploadedFiles: string[] = []
    let uploadFailed = false
    let uploadFailureReason: string | null = null
    
    for (const [docType, file] of Object.entries(dossierData.documents)) {
      if (!file || !(file instanceof File) || file.size <= 0) continue
      
      try {
        console.log(`[API Dossiers Create] Upload document ${docType}:`, file.name)
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(new Uint8Array(arrayBuffer))
        const fileExtension = file.name.split('.').pop() || 'pdf'
        const fileName = `${dossierId}/${docType}_${Date.now()}.${fileExtension}`
        
        const { error: uploadError } = await serviceClient.storage
          .from('documents')
          .upload(fileName, buffer, {
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          console.error(`[API Dossiers Create] Erreur upload ${docType}:`, uploadError)
          uploadFailed = true
          uploadFailureReason = `upload_failed_${docType}`
          break
        }
        
        uploadedFiles.push(fileName)
        
        // Enregistrer le document en base
        const uploadedBy = isUuid(authUser.id) ? authUser.id : null
        const { error: insertError } = await serviceClient
          .from('documents')
          .insert({
            dossier_id: dossierId,
            document_name: file.name,
            document_type: docType,
            file_size: file.size,
            mime_type: file.type,
            storage_path: fileName,
            storage_bucket: 'documents',
            uploaded_by: uploadedBy
          })
        
        if (insertError) {
          console.error(`[API Dossiers Create] Erreur insertion document ${docType}:`, insertError)
          uploadFailed = true
          uploadFailureReason = `db_insert_failed_${docType}`
          break
        }
        
      } catch (error) {
        console.error(`[API Dossiers Create] Exception upload ${docType}:`, error)
        uploadFailed = true
        uploadFailureReason = `exception_${docType}`
        break
      }
    }
    
    // Rollback si upload échoué
    if (uploadFailed) {
      console.warn('[API Dossiers Create] Rollback suite à échec upload')
      
      // Supprimer les fichiers déjà uploadés
      if (uploadedFiles.length > 0) {
        await serviceClient.storage.from('documents').remove(uploadedFiles)
      }
      
      // Cleanup DB
      await serviceClient.from('documents').delete().eq('dossier_id', dossierId)
      await serviceClient.from('client_infos').delete().eq('dossier_id', dossierId)
      await serviceClient.from('dossiers').delete().eq('id', dossierId)
      
      return NextResponse.json(
        { error: 'Upload des documents incomplet', reason: uploadFailureReason },
        { status: 400 }
      )
    }
    
    // ========================================
    // 9. ACTIVITÉS ET NOTIFICATIONS
    // ========================================
    
    // Activité spéciale si admin attribue à un apporteur
    if (dossierData.createdByAdmin && apporteurId) {
      try {
        const clientNom = dossierData.clientInfo?.prenom && dossierData.clientInfo?.nom
          ? `${dossierData.clientInfo.prenom} ${dossierData.clientInfo.nom}`
          : null
        
        await serviceClient
          .from('activities')
          .insert({
            user_id: apporteurId,
            dossier_id: dossierId,
            broker_id: brokerId,
            activity_type: 'dossier_attribue',
            activity_title: 'Nouveau dossier attribué',
            activity_description: clientNom
              ? `Un nouveau dossier pour ${clientNom} vous a été attribué.`
              : `Un nouveau dossier ${numeroDossier} vous a été attribué.`,
            activity_data: {
              dossier_numero: numeroDossier,
              dossier_type: dossierData.type,
              client_nom: clientNom,
              created_by_admin: true,
              admin_id: authUser.id
            }
          })
      } catch (error) {
        console.warn('[API Dossiers Create] Erreur création activité (non bloquant):', error)
      }
    }
    
    // Notification
    try {
      const notificationUserId = dossierData.createdByAdmin && apporteurId ? apporteurId : authUser.id
      
      await serviceClient
        .from('notifications')
        .insert({
          title: dossierData.createdByAdmin ? 'Nouveau dossier assigné' : 'Nouveau dossier créé',
          message: dossierData.createdByAdmin
            ? `Un nouveau dossier ${numeroDossier} vous a été assigné.`
            : `Votre dossier ${numeroDossier} a été créé avec succès.`,
          type: 'info',
          user_id: notificationUserId,
          data: { dossier_id: dossierId }
        })
    } catch (error) {
      console.warn('[API Dossiers Create] Erreur création notification (non bloquant):', error)
    }
    
    // Analytics
    try {
      await AnalyticsService.trackDossierCreated(
        dossierId,
        brokerId || undefined,
        apporteurId || undefined,
        dossierData.createdByAdmin ? 'admin' : 'apporteur'
      )
    } catch (error) {
      console.warn('[API Dossiers Create] Erreur analytics (non bloquant):', error)
    }
    
    // ========================================
    // 10. RÉPONSE SUCCÈS
    // ========================================
    console.log('[API Dossiers Create] Succès:', dossierId)
    
    return NextResponse.json({
      success: true,
      dossier: {
        id: dossierId,
        numeroDossier,
        statut: 'en_attente',
        brokerId,
        apporteurId
      }
    })
    
  } catch (error) {
    console.error('[API Dossiers Create] Erreur inattendue:', error)
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur', 
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
}
