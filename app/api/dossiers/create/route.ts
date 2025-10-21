import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/dossiers/create - Début')
  console.log('[API] NODE_ENV:', process.env.NODE_ENV)
  console.log('[API] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Défini' : 'Non défini')
  console.log('[API] SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Défini' : 'Non défini')
  console.log('[API] SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Défini' : 'Non défini')
  try {
    const isUuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
    // Initialize Supabase client avec l'auth du client
    console.log('[API] Initialisation du client Supabase...')
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Client Supabase avec service role pour l'upload de fichiers
    const supabaseServiceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
          }
        }
      }
    )
    console.log('[API] Client Supabase initialisé')

    // Vérifier l'authentification
    console.log('[API] Vérification de l\'authentification...')
    const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser()
    let user = authUser
    
    if (userError || !user) {
      console.log('[API] Erreur auth ou pas d\'utilisateur:', userError)
      
      // En développement, permettre la création sans authentification
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Mode développement - création utilisateur fictif')
        user = { 
          id: 'dev-user-123', 
          email: 'dev@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as any;
      } else {
        console.log('[API] Pas d\'utilisateur - retour 401')
        return NextResponse.json(
          { error: 'Non authentifié' },
          { status: 401 }
        )
      }
    }
    
    console.log('[API] Authentification OK, utilisateur:', user?.id)

    console.log('[API] Parsing du FormData...')
    const formData = await request.formData()
    
    // Extraire les données de base
    const dossierData = {
      type: formData.get('type') as string,
      clientInfo: JSON.parse(formData.get('clientInfo') as string),
      commentaire: formData.get('commentaire') as string,
      isComplete: formData.get('isComplete') === 'true',
      createdByAdmin: formData.get('createdByAdmin') === 'true',
      documents: {
        offrePret: formData.get('documents.offrePret') as File | null,
        tableauAmortissement: formData.get('documents.tableauAmortissement') as File | null,
        carteIdentite: formData.get('documents.carteIdentite') as File | null,
        carteIdentiteConjoint: formData.get('documents.carteIdentiteConjoint') as File | null
      }
    }
    
    console.log('[API] Dossier data reçu:', {
      type: dossierData.type,
      clientInfo: dossierData.clientInfo,
      commentaire: dossierData.commentaire,
      isComplete: dossierData.isComplete,
      createdByAdmin: dossierData.createdByAdmin,
      documents: {
        offrePret: dossierData.documents.offrePret?.name,
        tableauAmortissement: dossierData.documents.tableauAmortissement?.name,
        carteIdentite: dossierData.documents.carteIdentite?.name,
        carteIdentiteConjoint: dossierData.documents.carteIdentiteConjoint?.name
      }
    })
    
    // Validation des données obligatoires
    console.log('[API] Validation des données...')
    if (!dossierData.clientInfo) {
      console.error('[API] clientInfo manquant')
      return NextResponse.json({ error: 'Informations client manquantes' }, { status: 400 })
    }
    
    if (!dossierData.clientInfo.nom || !dossierData.clientInfo.prenom || !dossierData.clientInfo.email) {
      console.error('[API] Champs obligatoires manquants dans clientInfo')
      return NextResponse.json({ error: 'Nom, prénom et email sont obligatoires' }, { status: 400 })
    }
    
    console.log('[API] Validation OK')

    // TODO: Gérer les brouillons si nécessaire
    // if (dossierData.isDraft && dossierData.draftId) {
    //   await supabaseClient
    //     .from('dossiers')
    //     .delete()
    //     .eq('id', dossierData.draftId)
    // }

    // Création manuelle du dossier (sans RPC pour debug)
    console.log('[API] Création manuelle du dossier...')
    
    // Mapper le type de dossier frontend vers les types DB valides
    const typeDossierMapping: { [key: string]: string } = {
      'seul': 'pret_immobilier', // Par défaut pour les dossiers individuels
      'couple': 'pret_immobilier' // Par défaut pour les dossiers de couple
    }
    
    const mappedTypeDossier = typeDossierMapping[dossierData.type] || 'pret_immobilier'
    console.log('[API] Type dossier mappé:', mappedTypeDossier)
    
    // Générer un numéro de dossier simple
    const numeroDossier = `DOS-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    console.log('[API] Numéro de dossier généré:', numeroDossier)
    
    // Créer le dossier principal
    console.log('[API] Création du dossier principal...')
    
    // En développement, utiliser un apporteur fictif
    let apporteurId = null
    if (process.env.NODE_ENV === 'development') {
      // Récupérer le premier apporteur ou créer un fictif
      const { data: apporteurs } = await supabaseClient
        .from('apporteur_profiles')
        .select('id')
        .limit(1)
      
      if (apporteurs && apporteurs.length > 0) {
        apporteurId = apporteurs[0].id
      } else {
        // Créer un apporteur fictif pour les tests
        const { data: fictifApporteur } = await supabaseClient
          .from('apporteur_profiles')
          .insert({
            user_id: user?.id || 'dev-user-123',
            nom: 'Dev',
            prenom: 'Apporteur',
            email: 'dev@apporteur.com'
          })
          .select('id')
          .single()
        apporteurId = fictifApporteur?.id
      }
    }
    
    const { data: createdDossier, error: dossierError } = await supabaseClient
      .from('dossiers')
      .insert({
        numero_dossier: numeroDossier,
        type_dossier: mappedTypeDossier,
        commentaire: dossierData.commentaire || null,
        statut_canon: 'en_attente',
        // Ajouter un champ pour distinguer couple/seul
        is_couple: dossierData.type === 'couple',
        // Ajouter apporteur_id pour les permissions
        apporteur_id: apporteurId
      })
      .select()
      .single()

    if (dossierError) {
      console.error('[API] Erreur création dossier:', dossierError)
      throw dossierError
    }
    
    const dossierId = createdDossier.id
    console.log('[API] Dossier créé avec ID:', dossierId)
    
    // Créer les informations client
    console.log('[API] Création des informations client...')
    const { error: clientError } = await supabaseClient
      .from('client_infos')
      .insert({
        dossier_id: dossierId,
        client_nom: dossierData.clientInfo?.nom,
        client_prenom: dossierData.clientInfo?.prenom,
        client_date_naissance: dossierData.clientInfo?.dateNaissance,
        client_profession: dossierData.clientInfo?.profession || null,
        client_fumeur: dossierData.clientInfo?.fumeur ?? false,
        client_email: dossierData.clientInfo?.email,
        client_telephone: dossierData.clientInfo?.telephone || null,
        client_adresse: dossierData.clientInfo?.adresse || null,
        conjoint_nom: dossierData.clientInfo?.conjoint?.nom || null,
        conjoint_prenom: dossierData.clientInfo?.conjoint?.prenom || null,
        conjoint_date_naissance: dossierData.clientInfo?.conjoint?.dateNaissance || null,
        conjoint_profession: dossierData.clientInfo?.conjoint?.profession || null,
        conjoint_fumeur: dossierData.clientInfo?.conjoint?.fumeur ?? null
      })

    if (clientError) {
      console.error('[API] Erreur création client info:', clientError)
      // Nettoyer le dossier créé
      await supabaseClient.from('dossiers').delete().eq('id', dossierId)
      throw clientError
    }
    
    console.log('[API] Informations client créées avec succès')

    // Upload des documents si fournis (all-or-nothing)
    console.log('[API] Documents à uploader:', dossierData.documents)
    const uploadedFiles: string[] = []
    let documentUploadFailed = false
    let documentFailureReason: string | null = null
    if (dossierData.documents) {
      for (const [documentType, file] of Object.entries(dossierData.documents)) {
        if (!file) {
          console.log(`[API] Document ${documentType} non fourni`)
          continue
        }
        if (!(file instanceof File)) {
          console.warn(`[API] Document ${documentType} non valide (pas un File)`)
          continue
        }
        if (file.size <= 0) {
          console.log(`[API] Document ${documentType} ignoré (fichier vide)`)
          continue
        }
        try {
          console.log(`[API] Upload du document ${documentType}:`, file.name, `(${file.size} bytes)`)
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(new Uint8Array(arrayBuffer))
          const fileExtension = file.name.split('.').pop() || 'pdf'
          const fileName = `${dossierId}/${documentType}_${Date.now()}.${fileExtension}`
          const { error: uploadError } = await supabaseServiceClient.storage
            .from('documents')
            .upload(fileName, buffer, {
              contentType: file.type || 'application/octet-stream',
              cacheControl: '3600',
              upsert: false
            })
          if (uploadError) {
            console.error(`[API] Erreur upload document ${documentType}:`, uploadError)
            documentUploadFailed = true
            documentFailureReason = `upload_failed_${documentType}`
            break
          }
          uploadedFiles.push(fileName)
          console.log(`[API] Document ${documentType} uploadé avec succès:`, fileName)

          const uploadedBy = isUuid(user?.id) ? (user?.id as string) : null
          console.log(`[API] Insertion document ${documentType} en base avec uploaded_by:`, uploadedBy ? 'UUID valide' : 'NULL')
          const { error: insertError } = await supabaseServiceClient
            .from('documents')
            .insert({
              dossier_id: dossierId,
              document_name: file.name,
              document_type: documentType,
              file_size: file.size,
              mime_type: file.type,
              storage_path: fileName,
              storage_bucket: 'documents',
              uploaded_by: uploadedBy
            })
          if (insertError) {
            console.error(`[API] Erreur insertion document ${documentType} en base:`, insertError)
            documentUploadFailed = true
            documentFailureReason = `db_insert_failed_${documentType}`
            break
          }

          // Activité document uploaded
          const targetUserId = dossierData.createdByAdmin ? (dossierData as any).apporteurId || user?.id : user?.id
          await supabaseServiceClient
            .from('activities')
            .insert({
              user_id: targetUserId,
              dossier_id: dossierId,
              activity_type: 'document_uploaded',
              activity_title: 'Document uploadé',
              activity_description: `Le document ${documentType} a été uploadé pour le dossier ${numeroDossier}.`,
              activity_data: {
                dossier_numero: numeroDossier,
                document_type: documentType,
                document_name: file.name,
                file_size: file.size,
                action: 'document_uploaded'
              }
            })
        } catch (error) {
          console.error(`[API] Erreur upload ${documentType}:`, error)
          documentUploadFailed = true
          documentFailureReason = `exception_${documentType}`
          break
        }
      }
    }

    if (documentUploadFailed) {
      console.warn('[API] Échec d\'upload de documents — rollback du dossier')
      // Supprimer fichiers déjà uploadés
      if (uploadedFiles.length > 0) {
        try {
          const { error: rmErr } = await supabaseServiceClient.storage
            .from('documents')
            .remove(uploadedFiles)
          if (rmErr) console.warn('[API] Erreur lors du cleanup Storage:', rmErr)
        } catch (e) {
          console.warn('[API] Exception cleanup Storage:', e)
        }
      }
      // Cleanup DB: documents, client_infos, dossier
      try { await supabaseServiceClient.from('documents').delete().eq('dossier_id', dossierId) } catch {}
      try { await supabaseServiceClient.from('client_infos').delete().eq('dossier_id', dossierId) } catch {}
      try { await supabaseServiceClient.from('dossiers').delete().eq('id', dossierId) } catch {}
      return NextResponse.json({ error: 'Upload des documents incomplet', reason: documentFailureReason }, { status: 400 })
    }

    // Si un devis est sélectionné (admin), l'enregistrer
    if ((dossierData as any).devisSelectionne && dossierData.createdByAdmin) {
      // TODO: Créer le devis sélectionné en base
      // Pour l'instant, on peut juste marquer qu'un devis est sélectionné
    }

    // Créer une activité
    try {
      console.log('[API] Création de l\'activité...')
      const targetUserId = dossierData.createdByAdmin ? (dossierData as any).apporteurId || user?.id : user?.id
      
      await supabaseClient
        .from('activities')
        .insert({
          user_id: targetUserId,
          dossier_id: dossierId,
          activity_type: 'dossier_created',
          activity_title: dossierData.createdByAdmin ? 'Dossier assigné' : 'Nouveau dossier créé',
          activity_description: dossierData.createdByAdmin 
            ? `Un nouveau dossier ${numeroDossier} vous a été assigné par l'administrateur.`
            : `Vous avez créé un nouveau dossier ${numeroDossier}.`,
          activity_data: {
            dossier_numero: numeroDossier,
            dossier_type: dossierData.type,
            created_by_admin: dossierData.createdByAdmin || false,
            action: 'dossier_created'
          }
        })
      console.log('[API] Activité créée avec succès')
    } catch (error) {
      console.warn('[API] Erreur non critique avec activité:', error)
    }

    // Créer une notification
    try {
      console.log('[API] Création de la notification...')
      await supabaseClient
        .from('notifications')
        .insert({
          title: dossierData.createdByAdmin ? 'Nouveau dossier assigné' : 'Nouveau dossier créé',
          message: dossierData.createdByAdmin 
            ? `Un nouveau dossier ${numeroDossier} vous a été assigné.`
            : `Votre dossier ${numeroDossier} a été créé avec succès et est en cours de traitement.`,
          type: 'info',
          user_id: dossierData.createdByAdmin ? (dossierData as any).apporteurId || user?.id : user?.id,
          data: { dossier_id: dossierId }
        })
      console.log('[API] Notification créée avec succès')
    } catch (error) {
      console.warn('[API] Erreur non critique avec notification:', error)
    }

    return NextResponse.json({
      success: true,
      dossier: {
        id: dossierId,
        numeroDossier: numeroDossier,
        statut: dossierData.createdByAdmin ? 'nouveau' : 'en_attente',
        commentaire: dossierData.commentaire
      }
    })

  } catch (error) {
    console.error('[API] Erreur création dossier:', error)
    console.error('[API] Stack trace:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur interne',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 400 }
    )
  }
}
