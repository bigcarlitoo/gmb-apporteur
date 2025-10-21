
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// INTERFACES POUR L'INTÉGRATION SUPABASE
// ============================================================================

// Interface pour les données d'un apporteur - Table 'apporteur_profiles'
interface ApporteurProfile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_naissance: string;
  adresse: string;
  code_postal: string;
  ville: string;
  // Informations professionnelles
  entreprise: string;
  siret: string;
  forme_juridique: string;
  secteur_activite: string;
  specialites: string[];
  zone_geographique: string[];
  // Inscription et statut
  date_inscription: string;
  statut: 'en_attente' | 'approuve' | 'suspendu' | 'refuse';
  commentaire_motivation: string;
  // Données calculées (via des requêtes SQL)
  nb_dossiers_traites: number;
  nb_dossiers_en_cours: number;
  nb_dossiers_valides: number;
  economies_generees: number;
  ca_total_gmb: number;
  taux_conversion: number;
  position_classement: number;
  // Métadonnées
  created_at: string;
  updated_at: string;
  last_login: string;
}

// Interface pour les statistiques détaillées d'un apporteur
interface ApporteurStatistics {
  // Performance mensuelle
  performance_mensuelle: {
    mois: string;
    dossiers_traites: number;
    dossiers_valides: number;
    economies_generees: number;
    ca_gmb: number;
  }[];
  // Répartition par type de dossier
  repartition_types: {
    type: string;
    nombre: number;
    pourcentage: number;
  }[];
  // Évolution du classement
  evolution_classement: {
    periode: string;
    position: number;
  }[];
  // Clients récents
  clients_recents: {
    id: string;
    nom: string;
    prenom: string;
    date_soumission: string;
    statut: string;
    economie: number;
  }[];
}

// Interface pour un dossier dans la modale mensuelle
interface DossierMensuel {
  id: string;
  numero: string;
  client_nom: string;
  client_prenom: string;
  date_soumission: string;
  statut: 'nouveau' | 'devis_envoye' | 'valide' | 'refuse' | 'finalise';
  montant_capital: number;
  economie_generee: number;
  ca_gmb: number;
  type_assurance: string;
}

interface ApporteurDetailContentProps {
  apporteurId: string;
}

export default function ApporteurDetailContent({ apporteurId }: ApporteurDetailContentProps) {
  const router = useRouter();
  const [apporteur, setApporteur] = useState<ApporteurProfile | null>(null);
  const [statistics, setStatistics] = useState<ApporteurStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubject, setContactSubject] = useState(''); // NOUVEAU: Champ objet du contact

  // Nouveaux états pour les filtres de performance
  const [performancePeriod, setPerformancePeriod] = useState<'6mois' | '12mois' | '24mois' | 'tout'>('12mois');
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthlyDossiers, setMonthlyDossiers] = useState<DossierMensuel[]>([]);
  const [loadingMonthlyData, setLoadingMonthlyData] = useState(false);

  // Données mock pour les statistiques étendues
  const mockPerformanceDataExtended = useMemo(() => [
    { month: 'Jan 2024', dossiers_traites: 3, dossiers_valides: 3, economies_generees: 8400, ca_gmb: 1800 },
    { month: 'Déc 2023', dossiers_traites: 4, dossiers_valides: 3, economies_generees: 12200, ca_gmb: 2100 },
    { month: 'Nov 2023', dossiers_traites: 2, dossiers_valides: 2, economies_generees: 6800, ca_gmb: 1200 },
    { month: 'Oct 2023', dossiers_traites: 3, dossiers_valides: 3, economies_generees: 9600, ca_gmb: 1900 },
    { month: 'Sep 2023', dossiers_traites: 5, dossiers_valides: 4, economies_generees: 15200, ca_gmb: 2800 },
    { month: 'Aoû 2023', dossiers_traites: 4, dossiers_valides: 4, economies_generees: 11400, ca_gmb: 2400 },
    { month: 'Jul 2023', dossiers_traites: 2, dossiers_valides: 1, economies_generees: 4200, ca_gmb: 600 },
    { month: 'Jun 2023', dossiers_traites: 6, dossiers_valides: 5, economies_generees: 18500, ca_gmb: 3200 },
    { month: 'Mai 2023', dossiers_traites: 3, dossiers_valides: 2, economies_generees: 7800, ca_gmb: 1400 },
    { month: 'Avr 2023', dossiers_traites: 4, dossiers_valides: 4, economies_generees: 12600, ca_gmb: 2300 },
    { month: 'Mar 2023', dossiers_traites: 5, dossiers_valides: 3, economies_generees: 11100, ca_gmb: 1800 },
    { month: 'Fév 2023', dossiers_traites: 2, dossiers_valides: 2, economies_generees: 6200, ca_gmb: 1100 },
    { month: 'Jan 2023', dossiers_traites: 3, dossiers_valides: 2, economies_generees: 7400, ca_gmb: 1300 },
    { month: 'Déc 2022', dossiers_traites: 4, dossiers_valides: 3, economies_generees: 10800, ca_gmb: 1900 },
    { month: 'Nov 2022', dossiers_traites: 1, dossiers_valides: 1, economies_generees: 3200, ca_gmb: 600 },
    { month: 'Oct 2022', dossiers_traites: 3, dossiers_valides: 2, economies_generees: 8100, ca_gmb: 1400 },
    { month: 'Sep 2022', dossiers_traites: 2, dossiers_valides: 2, economies_generees: 6900, ca_gmb: 1200 },
    { month: 'Aoû 2022', dossiers_traites: 1, dossiers_valides: 0, economies_generees: 0, ca_gmb: 0 },
    { month: 'Jul 2022', dossiers_traites: 2, dossiers_valides: 1, economies_generees: 4800, ca_gmb: 800 },
    { month: 'Jun 2022', dossiers_traites: 3, dossiers_valides: 2, economies_generees: 7200, ca_gmb: 1300 },
    { month: 'Mai 2022', dossiers_traites: 2, dossiers_valides: 2, economies_generees: 6500, ca_gmb: 1100 },
    { month: 'Avr 2022', dossiers_traites: 1, dossiers_valides: 1, economies_generees: 3800, ca_gmb: 700 },
    { month: 'Mar 2022', dossiers_traites: 2, dossiers_valides: 1, economies_generees: 4100, ca_gmb: 600 },
    { month: 'Fév 2022', dossiers_traites: 1, dossiers_valides: 1, economies_generees: 2900, ca_gmb: 500 }
  ], []);

  const mockRankingData = useMemo(() => [
    { period: 'Jan 2024', position: 3, evolution: 'up' as const },
    { period: 'Déc 2023', position: 4, evolution: 'up' as const },
    { period: 'Nov 2023', position: 5, evolution: 'down' as const },
    { period: 'Oct 2023', position: 4, evolution: 'up' as const },
    { period: 'Sep 2023', position: 6, evolution: 'down' as const },
    { period: 'Aoû 2023', position: 5, evolution: 'stable' as const }
  ], []);

  // ============================================================================
  // SUPABASE INTEGRATION - RÉCUPÉRATION DES DONNÉES APPORTEUR
  // ============================================================================

  /**
   * FONCTION DE RÉCUPÉRATION COMPLÈTE DES DONNÉES APPORTEUR
   * 
   * Cette fonction doit récupérer depuis Supabase :
   * 1. Les informations du profil apporteur
   * 2. Les statistiques calculées (nombre de dossiers, économies, etc.)
   * 3. L'historique de performance
   * 
   * Requête SQL principale :
   * ```sql
   * SELECT 
   *   ap.*,
   *   COUNT(d.id) as nb_dossiers_traites,
   *   COUNT(CASE WHEN d.status = 'valide' THEN 1 END) as nb_dossiers_valides,
   *   COUNT(CASE WHEN d.status IN ('nouveau', 'devis_envoye', 'analyse') THEN 1 END) as nb_dossiers_en_cours,
   *   COALESCE(SUM(CASE WHEN d.status = 'valide' THEN d.economie_client END), 0) as economies_generees,
   *   COALESCE(SUM(CASE WHEN d.status = 'finalise' THEN d.ca_gmb END), 0) as ca_total_gmb,
   *   CASE 
   *     WHEN COUNT(d.id) > 0 THEN 
   *       ROUND((COUNT(CASE WHEN d.status = 'valide' THEN 1 END)::float / COUNT(d.id) * 100), 2)
   *     ELSE 0 
   *   END as taux_conversion
   * FROM apporteur_profiles ap
   * LEFT JOIN dossiers d ON d.apporteur_id = ap.user_id
   * WHERE ap.user_id = $1
   * GROUP BY ap.id
   * ```
   */
  const fetchApporteurComplet = async () => {
    try {
      setIsLoading(true);
      
      // SIMULATION - À remplacer par l'appel Supabase réel
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // SUPABASE: Récupération des données apporteur
      /*
      const { data: apporteurData, error: apporteurError } = await supabase
        .rpc('get_apporteur_complet', { p_user_id: apporteurId });

      if (apporteurError) throw apporteurError;

      const { data: statsData, error: statsError } = await supabase
        .rpc('get_apporteur_statistics', { p_user_id: apporteurId });

      if (statsError) throw statsError;

      setApporteur(apporteurData);
      setStatistics(statsData);
      */

      // Données mock pour la démonstration
      const mockApporteur: ApporteurProfile = {
        id: apporteurId,
        user_id: apporteurId,
        nom: apporteurId === '1' ? 'Dubois' : apporteurId === '2' ? 'Lambert' : apporteurId === '3' ? 'Martin' : 'Moreau',
        prenom: apporteurId === '1' ? 'Marie' : apporteurId === '2' ? 'Thomas' : apporteurId === '3' ? 'Sophie' : 'Jean',
        email: apporteurId === '1' ? 'marie.dubois@email.com' : 
               apporteurId === '2' ? 'thomas.lambert@email.com' : 
               apporteurId === '3' ? 'sophie.martin@email.com' : 'jean.moreau@email.com',
        telephone: apporteurId === '1' ? '06 12 34 56 78' : 
                   apporteurId === '2' ? '06 23 45 67 89' : 
                   apporteurId === '3' ? '06 34 56 78 90' : '06 45 67 89 01',
        date_naissance: apporteurId === '1' ? '1982-05-15' : 
                        apporteurId === '2' ? '1979-11-23' : 
                        apporteurId === '3' ? '1985-03-08' : '1978-09-12',
        adresse: apporteurId === '1' ? '25 rue de la Liberté' : 
                 apporteurId === '2' ? '18 avenue Victor Hugo' : 
                 apporteurId === '3' ? '42 boulevard Saint-Michel' : '8 place de la République',
        code_postal: apporteurId === '1' ? '69001' : 
                     apporteurId === '2' ? '75016' : 
                     apporteurId === '3' ? '33000' : '13001',
        ville: apporteurId === '1' ? 'Lyon' : 
               apporteurId === '2' ? 'Paris' : 
               apporteurId === '3' ? 'Bordeaux' : 'Marseille',
        entreprise: apporteurId === '1' ? 'Conseil Patrimoine Plus' : 
                    apporteurId === '2' ? 'Lambert Courtage' : 
                    apporteurId === '3' ? 'Martin Assurance Conseil' : 'Moreau Finance',
        siret: apporteurId === '1' ? '12345678901234' : 
               apporteurId === '2' ? '23456789012345' : 
               apporteurId === '3' ? '34567890123456' : '45678901234567',
        forme_juridique: apporteurId === '1' ? 'EURL' : 
                         apporteurId === '2' ? 'SARL' : 
                         apporteurId === '3' ? 'Auto-entrepreneur' : 'SAS',
        secteur_activite: 'Courtage en assurance',
        specialites: apporteurId === '1' ? ['Assurance emprunteur', 'Assurance vie'] : 
                     apporteurId === '2' ? ['Prêt immobilier', 'Assurance emprunteur', 'Rachat de crédit'] : 
                     apporteurId === '3' ? ['Assurance emprunteur', 'Prévoyance'] : ['Assurance auto', 'Assurance habitation'],
        zone_geographique: apporteurId === '1' ? ['Rhône-Alpes', 'Auvergne'] : 
                          apporteurId === '2' ? ['Île-de-France', 'Normandie'] : 
                          apporteurId === '3' ? ['Nouvelle-Aquitaine'] : ['PACA', 'Occitanie'],
        date_inscription: apporteurId === '1' ? '2023-03-15T10:30:00Z' : 
                         apporteurId === '2' ? '2022-11-08T14:20:00Z' : 
                         apporteurId === '3' ? '2023-07-22T09:45:00Z' : '2023-01-10T11:15:00Z',
        statut: apporteurId === '1' || apporteurId === '2' || apporteurId === '3' ? 'approuve' : 'suspendu',
        commentaire_motivation: apporteurId === '1' ? 'Experte en assurance emprunteur avec 12 ans d\'expérience. Souhaite développer son portefeuille client avec des solutions compétitives.' : 
                               apporteurId === '2' ? 'Courtier expérimenté spécialisé dans l\'immobilier. Portfolio de plus de 500 clients. Recherche des partenariats de qualité.' : 
                               apporteurId === '3' ? 'Conseillère indépendante passionnée par l\'accompagnement personnalisé des familles dans leurs projets d\'assurance.' : 'Courtier multi-spécialiste avec réseau étendu.',
        // Statistiques calculées - Ces données viennent de requêtes SQL sur les dossiers
        nb_dossiers_traites: apporteurId === '1' ? 24 : 
                             apporteurId === '2' ? 32 : 
                             apporteurId === '3' ? 18 : 8,
        nb_dossiers_en_cours: apporteurId === '1' ? 3 : 
                              apporteurId === '2' ? 5 : 
                              apporteurId === '3' ? 2 : 1,
        nb_dossiers_valides: apporteurId === '1' ? 21 : 
                             apporteurId === '2' ? 28 : 
                             apporteurId === '3' ? 15 : 6,
        economies_generees: apporteurId === '1' ? 67200 : 
                           apporteurId === '2' ? 85600 : 
                           apporteurId === '3' ? 45800 : 18900,
        ca_total_gmb: apporteurId === '1' ? 15400 : 
                      apporteurId === '2' ? 21200 : 
                      apporteurId === '3' ? 12800 : 5600,
        taux_conversion: apporteurId === '1' ? 87.5 : 
                        apporteurId === '2' ? 87.5 : 
                        apporteurId === '3' ? 83.3 : 75.0,
        position_classement: apporteurId === '1' ? 3 : 
                            apporteurId === '2' ? 1 : 
                            apporteurId === '3' ? 5 : 12,
        created_at: '2023-03-15T10:30:00Z',
        updated_at: '2024-01-20T16:45:00Z',
        last_login: '2024-01-20T09:15:00Z'
      };

      const mockStatistics: ApporteurStatistics = {
        performance_mensuelle: [
          { mois: '2024-01', dossiers_traites: 3, dossiers_valides: 3, economies_generees: 8400, ca_gmb: 1800 },
          { mois: '2023-12', dossiers_traites: 4, dossiers_valides: 3, economies_generees: 12200, ca_gmb: 2100 },
          { mois: '2023-11', dossiers_traites: 2, dossiers_valides: 2, economies_generees: 6800, ca_gmb: 1200 },
          { mois: '2023-10', dossiers_traites: 3, dossiers_valides: 3, economies_generees: 9600, ca_gmb: 1900 },
          { mois: '2023-09', dossiers_traites: 5, dossiers_valides: 4, economies_generees: 15200, ca_gmb: 2800 },
          { mois: '2023-08', dossiers_traites: 4, dossiers_valides: 4, economies_generees: 11400, ca_gmb: 2400 }
        ],
        repartition_types: [
          { type: 'Prêt immobilier', nombre: 18, pourcentage: 75 },
          { type: 'Rachat de crédit', nombre: 4, pourcentage: 16.7 },
          { type: 'Prêt travaux', nombre: 2, pourcentage: 8.3 }
        ],
        evolution_classement: [
          { periode: '2024-01', position: 3 },
          { periode: '2023-12', position: 4 },
          { periode: '2023-11', position: 5 },
          { periode: '2023-10', position: 6 },
          { periode: '2023-09', position: 4 },
          { periode: '2023-08', position: 7 }
        ],
        clients_recents: [
          { id: '1', nom: 'Martin', prenom: 'Pierre', date_soumission: '2024-01-15T10:30:00Z', statut: 'nouveau', economie: 3200 },
          { id: '2', nom: 'Durand', prenom: 'Sophie', date_soumission: '2024-01-12T14:20:00Z', statut: 'valide', economie: 2800 },
          { id: '3', nom: 'Moreau', prenom: 'Jean', date_soumission: '2024-01-08T09:45:00Z', statut: 'devis_envoye', economie: 4100 },
          { id: '4', nom: 'Petit', prenom: 'Marie', date_soumission: '2024-01-05T16:30:00Z', statut: 'valide', economie: 2400 },
          { id: '5', nom: 'Robert', prenom: 'Paul', date_soumission: '2024-01-02T11:15:00Z', statut: 'finalise', economie: 3600 }
        ]
      };

      setApporteur(mockApporteur);
      setStatistics(mockStatistics);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données apporteur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour récupérer les dossiers d'un mois spécifique
  const fetchMonthlyDossiers = async (month: string) => {
    setLoadingMonthlyData(true);
    try {
      // SUPABASE: Récupération des dossiers du mois
      /*
      const { data: monthlyData, error } = await supabase
        .from('dossiers')
        .select(`
          id, numero, client_nom, client_prenom, date_soumission,
          status, montant_capital, economie_generee, ca_gmb, type_assurance
        `)
        .eq('apporteur_id', apporteurId)
        .gte('date_soumission', `${month}-01`)
        .lt('date_soumission', `${getNextMonth(month)}-01`)
        .order('date_soumission', { ascending: false });

      if (error) throw error;
      setMonthlyDossiers(monthlyData);
      */

      // Simulation de données mensuelles
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockMonthlyDossiers: DossierMensuel[] = [
        {
          id: '1',
          numero: 'DSS-2024-001',
          client_nom: 'Martin',
          client_prenom: 'Pierre',
          date_soumission: '2024-01-15T10:30:00Z',
          statut: 'valide',
          montant_capital: 350000,
          economie_generee: 4200,
          ca_gmb: 800,
          type_assurance: 'Prêt Immobilier'
        },
        {
          id: '2',
          numero: 'DSS-2024-002',
          client_nom: 'Durand',
          client_prenom: 'Sophie',
          date_soumission: '2024-01-12T14:20:00Z',
          statut: 'finalise',
          montant_capital: 280000,
          economie_generee: 2800,
          ca_gmb: 600,
          type_assurance: 'Prêt Immobilier'
        },
        {
          id: '3',
          numero: 'DSS-2024-003',
          client_nom: 'Moreau',
          client_prenom: 'Jean',
          date_soumission: '2024-01-08T09:45:00Z',
          statut: 'devis_envoye',
          montant_capital: 420000,
          economie_generee: 1400,
          ca_gmb: 400,
          type_assurance: 'Prêt Immobilier'
        }
      ];

      setMonthlyDossiers(mockMonthlyDossiers);
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers mensuels:', error);
    } finally {
      setLoadingMonthlyData(false);
    }
  };

  // Fonction pour ouvrir la modale d'un mois
  const handleMonthClick = (month: string) => {
    setSelectedMonth(month);
    setShowMonthModal(true);
    fetchMonthlyDossiers(month);
  };

  // Fonction pour naviguer vers un dossier
  const handleDossierClick = (dossierId: string) => {
    router.push(`/admin/dossiers/${dossierId}`);
    setShowMonthModal(false);
  };

  // Fonction pour naviguer vers un dossier récent
  const handleClientRecentClick = (clientId: string) => {
    router.push(`/admin/dossiers/${clientId}`);
  };

  // Filtre les données de performance selon la période sélectionnée
  const getFilteredPerformanceData = () => {
    const dataCount = {
      '6mois': 6,
      '12mois': 12,
      '24mois': 24,
      'tout': mockPerformanceDataExtended.length
    };
    
    return mockPerformanceDataExtended.slice(0, dataCount[performancePeriod]);
  };

  useEffect(() => {
    if (apporteurId) {
      fetchApporteurComplet();
    }
  }, [apporteurId]);

  // ============================================================================
  // SUPABASE INTEGRATION - ACTIONS ADMINISTRATEUR
  // ============================================================================

  /**
   * FONCTION DE CONTACT D'UN APPORTEUR
   * 
   * Envoie un email à l'apporteur via le système de notifications
   */
  const handleContactApporteur = async () => {
    try {
      console.log('Envoi de message à l\'apporteur:', apporteur?.email, contactSubject, contactMessage);
      
      // SUPABASE: Envoi d'email via Edge Function
      /*
      const { error } = await supabase.functions.invoke('send-admin-message', {
        body: {
          to_email: apporteur.email,
          to_name: `${apporteur.prenom} ${apporteur.nom}`,
          subject: contactSubject || 'Message de l\'administration GMB Courtage',
          message: contactMessage,
          admin_name: 'Administration GMB'
        }
      });

      if (error) throw error;
      */
      
      setShowContactModal(false);
      setContactMessage('');
      setContactSubject(''); // Réinitialiser l'objet
      alert('Message envoyé avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  /**
   * FONCTION DE SUSPENSION D'UN APPORTEUR
   * 
   * Met à jour le statut de l'apporteur et l'empêche de soumettre de nouveaux dossiers
   */
  const handleSuspendApporteur = async () => {
    try {
      console.log('Suspension de l\'apporteur:', apporteur?.id, suspendReason);
      
      // SUPABASE: Mise à jour du statut
      /*
      const { error } = await supabase
        .from('apporteur_profiles')
        .update({ 
          statut: 'suspendu',
          raison_suspension: suspendReason,
          date_suspension: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', apporteurId);

      if (error) throw error;

      // Créer une notification pour l'apporteur
      await supabase
        .from('notifications')
        .insert({
          type: 'compte_suspendu',
          user_id: apporteurId,
          title: 'Compte suspendu',
          message: `Votre compte a été suspendu. Raison: ${suspendReason}`,
          created_at: new Date().toISOString()
        });

      // Envoyer un email de notification
      await supabase.functions.invoke('send-suspension-email', {
        body: {
          to_email: apporteur.email,
          to_name: `${apporteur.prenom} ${apporteur.nom}`,
          reason: suspendReason
        }
      });
      */
      
      if (apporteur) {
        setApporteur({ ...apporteur, statut: 'suspendu' });
      }
      
      setShowSuspendModal(false);
      setSuspendReason('');
      alert('Apporteur suspendu avec succès !');
    } catch (error) {
      console.error('Erreur lors de la suspension:', error);
      alert('Erreur lors de la suspension');
    }
  };

  /**
   * FONCTION DE RÉACTIVATION D'UN APPORTEUR
   * 
   * Réactive un compte suspendu en remettant le statut à 'approuve'
   */
  const handleReactivateApporteur = async () => {
    try {
      console.log('Réactivation de l\'apporteur:', apporteur?.id);
      
      // SUPABASE: Mise à jour du statut
      /*
      const { error } = await supabase
        .from('apporteur_profiles')
        .update({ 
          statut: 'approuve',
          date_reactivation: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', apporteurId);

      if (error) throw error;

      // Créer une notification pour l'apporteur
      await supabase
        .from('notifications')
        .insert({
          type: 'compte_reactive',
          user_id: apporteurId,
          title: 'Compte réactivé',
          message: 'Votre compte a été réactivé avec succès. Vous pouvez maintenant soumettre de nouveaux dossiers.',
          created_at: new Date().toISOString()
        });

      // Envoyer un email de notification
      await supabase.functions.invoke('send-reactivation-email', {
        body: {
          to_email: apporteur.email,
          to_name: `${apporteur.prenom} ${apporteur.nom}`
        }
      });
      */
      
      if (apporteur) {
        setApporteur({ ...apporteur, statut: 'approuve' });
      }
      
      setShowReactivateModal(false);
      alert('Apporteur réactivé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la réactivation:', error);
      alert('Erreur lors de la réactivation');
    }
  };

  /**
   * FONCTION DE SUPPRESSION D'UN APPORTEUR
   * 
   * Supprime définitivement le compte apporteur (action irréversible)
   */
  const handleDeleteApporteur = async () => {
    try {
      console.log('Suppression de l\'apporteur:', apporteur?.id);
      
      // SUPABASE: Suppression en cascade
      /*
      // 1. Archiver les dossiers existants
      await supabase
        .from('dossiers')
        .update({ 
          apporteur_id: null,
          archived: true 
        })
        .eq('apporteur_id', apporteurId);

      // 2. Supprimer le profil apporteur
      await supabase
        .from('apporteur_profiles')
        .delete()
        .eq('user_id', apporteurId);

      // 3. Supprimer l'utilisateur de l'authentification
      await supabase.auth.admin.deleteUser(apporteurId);
      */
      
      setShowDeleteModal(false);
      alert('Apporteur supprimé avec succès !');
      router.push('/admin/apporteurs');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Fonctions utilitaires
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatutBadge = (statut: string) => {
    const config = {
      approuve: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', text: 'Approuvé', icon: 'ri-check-line' },
      en_attente: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', text: 'En attente', icon: 'ri-time-line' },
      suspendu: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', text: 'Suspendu', icon: 'ri-pause-line' },
      refuse: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', text: 'Refusé', icon: 'ri-close-line' }
    };
    
    const { color, text, icon } = config[statut as keyof typeof config] || config.refuse;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        <i className={`${icon} mr-2`}></i>
        {text}
      </span>
    );
  };

  const getDossierStatutBadge = (statut: string) => {
    const config = {
      nouveau: { color: 'bg-[#335FAD]/10 text-[#335FAD] dark:bg-[#335FAD]/30 dark:text-[#335FAD]', text: 'Nouveau', icon: 'ri-file-add-line' },
      devis_envoye: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', text: 'Devis envoyé', icon: 'ri-send-plane-line' },
      valide: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', text: 'Validé', icon: 'ri-check-line' },
      refuse: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', text: 'Refusé', icon: 'ri-close-line' },
      finalise: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', text: 'Finalisé', icon: 'ri-checkbox-circle-line' }
    };
    
    const { color, text, icon } = config[statut as keyof typeof config] || config.nouveau;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <i className={`${icon} mr-1`}></i>
        {text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!apporteur) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-red-600 dark:text-red-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Apporteur introuvable
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Cet apporteur n'existe pas ou a été supprimé.
          </p>
          <button
            onClick={() => router.push('/admin/apporteurs')}
            className="bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-6 py-3 rounded-xl font-medium transition-colors cursor-pointer inline-flex items-center space-x-2"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Retour aux apporteurs</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-line text-gray-600 dark:text-gray-300"></i>
            </button>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-light text-gray-900 dark:text-white">
                  {apporteur.prenom} {apporteur.nom}
                </h1>
                {getStatutBadge(apporteur.statut)}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center">
                  <i className="ri-building-line mr-1"></i>
                  {apporteur.entreprise}
                </span>
                <span className="flex items-center">
                  <i className="ri-mail-line mr-1"></i>
                  {apporteur.email}
                </span>
                <span className="flex items-center">
                  <i className="ri-map-pin-line mr-1"></i>
                  {apporteur.ville}
                </span>
              </div>
            </div>
          </div>

          {/* Boutons d'action responsive - Déplacés sous la description */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={() => setShowContactModal(true)}
              className="flex-1 sm:flex-none bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
            >
              <i className="ri-mail-send-line mr-2"></i>
              Contacter
            </button>
            {apporteur.statut === 'approuve' && (
              <button
                onClick={() => setShowSuspendModal(true)}
                className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bgorange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                <i className="ri-pause-line mr-2"></i>
                Suspendre
              </button>
            )}
            {apporteur.statut === 'suspendu' && (
              <button
                onClick={() => setShowReactivateModal(true)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                <i className="ri-play-line mr-2"></i>
                Réactiver
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center"
            >
              <i className="ri-delete-bin-line mr-2"></i>
              Supprimer
            </button>
          </div>

          {/* Navigation tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8 overflow-x-auto scrollbar-hide pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Vue d'ensemble
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'statistics'
                    ? 'border-indigo-500 text-[#335FAD] dark:text-[#335FAD]/80'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Statistiques
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Statistiques principales */}
            <div className="lg:col-span-2 space-y-6">
              {/* KPIs principaux */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Dossiers traités</p>
                      <p className="text-2xl font-light text-gray-900 dark:text-white">{apporteur.nb_dossiers_traites}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#335FAD]/10 dark:bg-[#335FAD]/30 rounded-full flex items-center justify-center">
                      <i className="ri-file-text-line text-[#335FAD] dark:text-[#335FAD] text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Taux de conversion</p>
                      <p className="text-2xl font-light text-gray-900 dark:text-white">{apporteur.taux_conversion}%</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <i className="ri-percent-line text-green-600 dark:text-green-400 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Économies générées</p>
                      <p className="text-2xl font-light text-gray-900 dark:text-white">{formatCurrency(apporteur.economies_generees)}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <i className="ri-money-euro-circle-line text-purple-600 dark:text-purple-400 text-xl"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Position classement</p>
                      <p className="text-2xl font-light text-gray-900 dark:text-white">#{apporteur.position_classement}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <i className="ri-trophy-line text-orange-600 dark:text-orange-400 text-xl"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* CA Total GMB Courtage */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Chiffre d'affaires généré pour GMB Courtage
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <i className="ri-money-dollar-circle-line text-[#335FAD] dark:text-[#335FAD]/80 text-2xl"></i>
                  </div>
                  <div>
                    <p className="text-3xl font-light text-gray-900 dark:text-white">{formatCurrency(apporteur.ca_total_gmb)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Depuis l'inscription ({formatDate(apporteur.date_inscription)})</p>
                  </div>
                </div>
              </div>

              {/* Clients récents */}
              {statistics && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Dossiers récents
                  </h3>
                  <div className="space-y-4">
                    {statistics.clients_recents.map((client) => (
                      <div 
                        key={client.id} 
                        onClick={() => handleClientRecentClick(client.id)}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                            <span className="text-[#335FAD] dark:text-[#335FAD]/80 font-medium text-sm">
                              {client.prenom.charAt(0)}{client.nom.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {client.prenom} {client.nom}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(client.date_soumission)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center space-x-3">
                          <div>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(client.economie)}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                client.statut === 'valide' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                client.statut === 'finalise' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                client.statut === 'devis_envoye' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                'bg-[#335FAD]/10 text-[#335FAD] dark:bg-[#335FAD]/30 dark:text-[#335FAD]'
                              }`}>
                                {client.statut === 'valide' ? 'Validé' :
                                 client.statut === 'finalise' ? 'Finalisé' :
                                 client.statut === 'devis_envoye' ? 'Devis envoyé' :
                                 'Nouveau'}
                              </span>
                            </div>
                          </div>
                          <i className="ri-arrow-right-line text-gray-400 dark:text-gray-500"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Informations personnelles */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Informations personnelles
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Nom complet
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {apporteur.prenom} {apporteur.nom}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date de naissance
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(apporteur.date_naissance).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{apporteur.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Téléphone
                    </label>
                    <p className="text-gray-900 dark:text-white">{apporteur.telephone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Adresse
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {apporteur.adresse}<br />
                      {apporteur.code_postal} {apporteur.ville}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations professionnelles */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <div className="w-6 h-6 mr-2 flex items-center justify-center">
                    <i className="ri-building-line text-[#335FAD]"></i>
                  </div>
                  Informations professionnelles
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Entreprise</span>
                    <p className="text-gray-900 dark:text-white">{apporteur.entreprise || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">SIRET</span>
                    <p className="text-gray-900 dark:text-white">{apporteur.siret || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Forme juridique</span>
                    <p className="text-gray-900 dark:text-white">{apporteur.forme_juridique || 'Non renseignée'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Zone géographique</span>
                    <p className="text-gray-900 dark:text-white">{apporteur.zone_geographique?.join(', ') || 'Non renseignée'}</p>
                  </div>
                </div>
              </div>

              {/* Informations du compte */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Informations du compte
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date d'inscription
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(apporteur.date_inscription)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Dernière connexion
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(apporteur.last_login)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Statut du compte
                    </label>
                    {getStatutBadge(apporteur.statut)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statistics' && statistics && (
          <div className="space-y-8">
            {/* Performance mensuelle améliorée */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Performance mensuelle détaillée
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Cliquez sur un mois pour voir les dossiers traités
                  </p>
                </div>
                
                {/* Filtres de période */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['6mois', '12mois', '24mois', 'tout'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setPerformancePeriod(period)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        performancePeriod === period
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {period === '6mois' ? '6 mois' : 
                       period === '12mois' ? '12 mois' : 
                       period === '24mois' ? '24 mois' : 'Tout'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Mois
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Dossiers traités
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Dossiers validés
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Économies générées
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        CA GMB Courtage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {getFilteredPerformanceData().map((month, index) => {
                      const taux = month.dossiers_traites > 0 ? (month.dossiers_valides / month.dossiers_traites * 100) : 0;
                      
                      return (
                        <tr 
                          key={index}
                          onClick={() => handleMonthClick(month.month)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {month.month}
                              </span>
                              <i className="ri-eye-line text-gray-400 dark:text-gray-500 text-xs"></i>
                            </div>
                          </td>
                          <td className="py-3 text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {month.dossiers_traites}
                            </span>
                          </td>
                          <td className="py-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {month.dossiers_valides}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                taux >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                                taux >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 
                                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {taux.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(month.economies_generees)}
                          </td>
                          <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(month.ca_gmb)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Évolution du classement */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <div className="w-6 h-6 mr-2 flex items-center justify-center">
                  <i className="ri-trophy-line text-yellow-600"></i>
                </div>
                Évolution du classement
              </h3>
              <div className="space-y-3">
                {mockRankingData.map((ranking, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{ranking.period}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Position {ranking.position}</p>
                    </div>
                    <div className="flex items-center">
                      {ranking.evolution === 'up' && (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <i className="ri-arrow-up-line text-green-600"></i>
                        </div>
                      )}
                      {ranking.evolution === 'down' && (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <i className="ri-arrow-down-line text-red-600"></i>
                        </div>
                      )}
                      {ranking.evolution === 'stable' && (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <i className="ri-subtract-line text-gray-400"></i>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      
      {/* Modal des dossiers mensuels */}
      {showMonthModal && selectedMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header de la modale */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Dossiers de {selectedMonth}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {apporteur.prenom} {apporteur.nom} • Cliquez sur un dossier pour l'ouvrir
                  </p>
                </div>
                <button
                  onClick={() => setShowMonthModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
            </div>

            {/* Contenu de la modale */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingMonthlyData ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Chargement des dossiers...</p>
                </div>
              ) : monthlyDossiers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-file-list-3-line text-gray-400 dark:text-gray-500 text-2xl"></i>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Aucun dossier ce mois-ci
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400">
                    Aucun dossier n'a été traité en {selectedMonth}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyDossiers.map((dossier) => (
                    <div 
                      key={dossier.id}
                      onClick={() => handleDossierClick(dossier.id)}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {dossier.numero}
                            </h4>
                            {getDossierStatutBadge(dossier.statut)}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Client :</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {dossier.client_prenom} {dossier.client_nom}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Type :</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {dossier.type_assurance}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Capital :</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {formatCurrency(dossier.montant_capital)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Date :</span>
                              <span className="ml-2 text-gray-900 dark:text-white">
                                {formatDate(dossier.date_soumission)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="flex items-center space-x-2">
                              <i className="ri-money-euro-circle-line text-green-600 dark:text-green-400"></i>
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Économie générée</span>
                                <p className="font-medium text-green-600 dark:text-green-400">
                                  {formatCurrency(dossier.economie_generee)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <i className="ri-bank-line text-[#335FAD] dark:text-[#335FAD]/80"></i>
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">CA GMB</span>
                                <p className="font-medium text-[#335FAD] dark:text-[#335FAD]/80">
                                  {formatCurrency(dossier.ca_gmb)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4 flex-shrink-0">
                          <i className="ri-arrow-right-line text-gray-400 dark:text-gray-500"></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de contact */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Contacter {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              {/* NOUVEAU: Champ Objet */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Objet du message
                </label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Ex: Demande de précisions sur votre dossier..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {contactSubject.length}/100 caractères
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Tapez votre message ici..."
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {contactMessage.length}/500 caractères
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    setContactMessage('');
                    setContactSubject('');
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleContactApporteur}
                  disabled={!contactMessage.trim()}
                  className="flex-1 bg-[#335FAD] hover:bg-[#335FAD]/90 dark:bg-[#335FAD] dark:hover:bg-[#335FAD]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-send-plane-line mr-2"></i>
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suspension */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Suspendre {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowSuspendModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Cette action suspendra temporairement le compte de l'apporteur. Il ne pourra plus soumettre de nouveaux dossiers.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Raison de la suspension
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Indiquez la raison de la suspension..."
                  className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  maxLength={300}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSuspendModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >Annuler</button>
                <button
                  onClick={handleSuspendApporteur}
                  disabled={!suspendReason.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-pause-line mr-2"></i>
                  Suspendre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de réactivation */}
      {showReactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Réactiver {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowReactivateModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-check-circle-line text-green-600 dark:text-green-400 text-xl mt-0.5"></i>
                  <div>
                    <p className="text-green-900 dark:text-green-200 font-medium mb-1">Réactivation du compte</p>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      Cette action réactivera le compte de l'apporteur. Il pourra à nouveau soumettre de nouveaux dossiers et accéder à toutes les fonctionnalités.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Êtes-vous sûr de vouloir réactiver ce compte ?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowReactivateModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >Annuler</button>
                <button
                  onClick={handleReactivateApporteur}
                  className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  <i className="ri-play-line mr-2"></i>
                  Réactiver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Supprimer {apporteur.prenom} {apporteur.nom}
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-gray-600 dark:text-gray-300"></i>
                </button>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <i className="ri-error-warning-line text-red-600 dark:text-red-400 text-xl mt-0.5"></i>
                  <div>
                    <p className="text-red-900 dark:text-red-200 font-medium mb-1">Action irréversible</p>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      Cette action supprimera définitivement le compte apporteur, ses données personnelles et l'accès à tous ses dossiers. Les dossiers existés seront archivés.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Êtes-vous sûr de vouloir supprimer définitivement ce compte ?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >Annuler</button>
                <button
                  onClick={handleDeleteApporteur}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  <i className="ri-delete-bin-line mr-2"></i>
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
