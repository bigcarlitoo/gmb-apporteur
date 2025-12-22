import { supabase } from '@/lib/supabase';

export interface ClientLockResult {
  is_locked: boolean;
  apporteur_id: string | null;
  apporteur_nom: string | null;
  apporteur_prenom: string | null;
  locked_at: string | null;
  dossier_id: string | null;
}

export class ClientLockService {
  /**
   * Vérifie si un client est déjà verrouillé pour un autre apporteur
   * @param brokerId ID du courtier
   * @param nom Nom du client
   * @param prenom Prénom du client
   * @param dateNaissance Date de naissance au format YYYY-MM-DD
   */
  static async checkClientLock(
    brokerId: string,
    nom: string,
    prenom: string,
    dateNaissance: string
  ): Promise<ClientLockResult> {
    try {
      const { data, error } = await supabase.rpc('check_client_lock', {
        p_broker_id: brokerId,
        p_nom: nom,
        p_prenom: prenom,
        p_date_naissance: dateNaissance
      });

      if (error) throw error;

      // La fonction retourne un tableau, on prend le premier résultat
      const result = Array.isArray(data) ? data[0] : data;

      return {
        is_locked: result?.is_locked ?? false,
        apporteur_id: result?.apporteur_id ?? null,
        apporteur_nom: result?.apporteur_nom ?? null,
        apporteur_prenom: result?.apporteur_prenom ?? null,
        locked_at: result?.locked_at ?? null,
        dossier_id: result?.dossier_id ?? null
      };
    } catch (err) {
      console.error('[ClientLockService.checkClientLock] Erreur:', err);
      // En cas d'erreur, on considère que ce n'est pas verrouillé pour ne pas bloquer
      return {
        is_locked: false,
        apporteur_id: null,
        apporteur_nom: null,
        apporteur_prenom: null,
        locked_at: null,
        dossier_id: null
      };
    }
  }

  /**
   * Crée un verrou pour un client
   * @param brokerId ID du courtier
   * @param apporteurId ID de l'apporteur
   * @param dossierId ID du dossier
   * @param nom Nom du client
   * @param prenom Prénom du client
   * @param dateNaissance Date de naissance
   */
  static async createClientLock(
    brokerId: string,
    apporteurId: string,
    dossierId: string,
    nom: string,
    prenom: string,
    dateNaissance: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_client_lock', {
        p_broker_id: brokerId,
        p_apporteur_id: apporteurId,
        p_dossier_id: dossierId,
        p_nom: nom,
        p_prenom: prenom,
        p_date_naissance: dateNaissance
      });

      if (error) throw error;
      return data as string;
    } catch (err) {
      console.error('[ClientLockService.createClientLock] Erreur:', err);
      return null;
    }
  }

  /**
   * Nettoie les verrous expirés (normalement appelé par un cron)
   */
  static async cleanupExpiredLocks(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_client_locks');
      if (error) throw error;
      return data as number;
    } catch (err) {
      console.error('[ClientLockService.cleanupExpiredLocks] Erreur:', err);
      return 0;
    }
  }
}




