import { GoogleGenAI, createPartFromUri } from "@google/genai";
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Service d'extraction de documents utilisant Google Gemini 3 Flash
 * Modèle principal pour l'extraction de documents (PDF, images)
 * Mis à jour le 17/12/2025 pour utiliser Gemini 3 Flash
 */
export class GeminiExtractionService {
  private static ai: GoogleGenAI | null = null;

  /**
   * Initialise le client Gemini
   */
  private static getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY non configurée. Vérifiez votre fichier .env');
      }

      this.ai = new GoogleGenAI({ apiKey });
    }

    return this.ai;
  }

  /**
   * Upload un fichier vers l'API Gemini et retourne son URI
   */
  private static async uploadFile(fileBuffer: ArrayBuffer, fileName: string, mimeType: string): Promise<{ uri: string, name: string }> {
    console.log(`[GeminiExtraction] Upload fichier: ${fileName} (${fileBuffer.byteLength} bytes, type: ${mimeType})`);
    
    try {
      const ai = this.getClient();
      
      // Convertir ArrayBuffer en Buffer Node.js
      const buffer = Buffer.from(fileBuffer);
      
      // Créer un Blob compatible avec l'API Gemini
      const fileBlob = new Blob([buffer], { type: mimeType });

      console.log(`[GeminiExtraction] Tentative d'upload vers Gemini...`);
      
      const file = await ai.files.upload({
        file: fileBlob,
        config: {
          displayName: fileName,
        },
      });
      
      console.log(`[GeminiExtraction] Upload réussi: ${file.name}`);
      
      if (!file.name) {
        throw new Error('Nom du fichier manquant après l\'upload');
      }

      // Attendre que le fichier soit traité
      let getFile = await ai.files.get({ name: file.name });
      let attempts = 0;
      const maxAttempts = 20;

      while (getFile.state === 'PROCESSING' && attempts < maxAttempts) {
        console.log(`[GeminiExtraction] Fichier en cours de traitement... (${attempts + 1}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Attendre 2 secondes
        getFile = await ai.files.get({ name: file.name });
        attempts++;
      }

      if (getFile.state === 'FAILED') {
        throw new Error('Le traitement du fichier a échoué');
      }

      if (getFile.state === 'PROCESSING') {
        throw new Error('Le traitement du fichier prend trop de temps');
      }

      if (!file.uri) {
        throw new Error('URI du fichier manquant après l\'upload');
      }

      return {
        uri: file.uri,
        name: file.name
      };
      
    } catch (uploadError: any) {
      console.error(`[GeminiExtraction] Erreur upload:`, {
        message: uploadError.message,
        stack: uploadError.stack,
        fileName,
        mimeType
      });
      throw new Error(`Échec upload fichier ${fileName}: ${uploadError.message}`);
    }
  }

  /**
   * Télécharge un document depuis Supabase Storage
   * Utilise le service role client pour bypasser les RLS
   */
  private static async downloadDocument(storagePath: string): Promise<ArrayBuffer> {
    console.log(`[GeminiExtraction] Téléchargement: ${storagePath}`);
    
    // Utiliser le service role client pour avoir accès aux fichiers
    const serviceClient = createServiceRoleClient();
    
    const { data, error } = await serviceClient.storage
      .from('documents')
      .download(storagePath);

    if (error) {
      throw new Error(`Erreur téléchargement: ${error.message}`);
    }

    return await data.arrayBuffer();
  }

  /**
   * Extrait les informations des documents en utilisant Gemini
   */
  static async extractFromDocuments(
    documents: Array<{ id: string; storage_path: string; document_name: string; mime_type: string }>,
    systemPrompt: string,
    userPrompt: string
  ): Promise<any> {
    try {
      console.log(`[GeminiExtraction] Extraction de ${documents.length} document(s)`);
      
      const ai = this.getClient();
      const content: any[] = [userPrompt];

      // Upload tous les documents vers Gemini
      for (const doc of documents) {
        console.log(`[GeminiExtraction] Traitement: ${doc.document_name}`);
        
        // Télécharger le fichier depuis Supabase
        const fileBuffer = await this.downloadDocument(doc.storage_path);
        
        // Upload vers Gemini
        const { uri } = await this.uploadFile(fileBuffer, doc.document_name, doc.mime_type);
        
        // Ajouter à la requête
        const filePart = createPartFromUri(uri, doc.mime_type);
        content.push(filePart);
      }

      console.log(`[GeminiExtraction] Envoi de la requête à Gemini 3 Flash`);
      
      // Préparer les parts avec le system prompt intégré dans le message user
      const userParts = [
        { text: `${systemPrompt}\n\n${userPrompt}` }
      ];

      // Ajouter les fichiers
      for (let i = 1; i < content.length; i++) {
        userParts.push(content[i]);
      }
      
      // Générer le contenu avec Gemini 2.0 Flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: userParts
          }
        ],
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error('Réponse vide de Gemini');
      }
      
      console.log(`[GeminiExtraction] Réponse reçue (${responseText.length} caractères)`);
      console.log(`[GeminiExtraction] Aperçu: ${responseText.substring(0, 200)}...`);

      // Parser la réponse JSON de manière robuste
      let extractedData: any;
      
      try {
        // Méthode 1: Nettoyer les backticks markdown
        let cleaned = responseText.trim();
        
        // Retirer les backticks markdown au début et à la fin
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        }
        
        // Méthode 2: Extraire le JSON avec regex
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
          console.error('[GeminiExtraction] Réponse complète:', responseText);
          throw new Error('Aucun objet JSON trouvé dans la réponse');
        }
        
        // Parser le JSON
        extractedData = JSON.parse(jsonMatch[0]);
        
        // Validation basique de la structure
        if (!extractedData.emprunteurs || !extractedData.pret) {
          console.warn('[GeminiExtraction] Structure JSON incomplète, tentative de correction...');
          console.log('[GeminiExtraction] Données extraites:', JSON.stringify(extractedData, null, 2));
        }
        
        console.log('[GeminiExtraction] JSON parsé avec succès');
        return extractedData;
        
      } catch (parseError: any) {
        console.error('[GeminiExtraction] Erreur parsing JSON:', parseError.message);
        console.error('[GeminiExtraction] Réponse brute:', responseText);
        throw new Error(`Impossible de parser la réponse JSON: ${parseError.message}`);
      }

    } catch (error: any) {
      console.error('[GeminiExtraction] Erreur:', error);
      throw new Error(`Erreur Gemini: ${error.message}`);
    }
  }
}

