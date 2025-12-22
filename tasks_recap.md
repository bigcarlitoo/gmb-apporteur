# 📊 Suivi des tâches - GMB Apporteur

> **Dernière mise à jour :** 21/12/2024

Ce document trace l'avancement des tâches définies dans `tasks.md`.

---

## ✅ PHASE 1 : Corrections critiques (Terminée)

### 1.1 Correction du statut invalide 'valide'
- **Fichier :** `app/api/devis/manage/route.ts`
- **Changement :** Remplacé `statut_canon: 'valide'` par `statut_canon: 'devis_accepte'`
- **Pourquoi :** La valeur 'valide' n'existe pas dans l'enum DB

### 1.2 Correction frac_assurance hardcodé
- **Fichier :** `app/api/exade/tarifs/route.ts`
- **Changement :** `<frac_assurance>12</frac_assurance>` → `<frac_assurance>${pretData.frac_assurance || 12}</frac_assurance>`
- **Pourquoi :** Permettre le choix entre paiement mensuel (12) et prime unique (10)

### 2.1 Mise à jour commission plateforme 5% → 6%
- **Fichiers :** 
  - `components/features/commission/BrokerCommissionSettings.tsx` : constante `PLATFORM_FEE_PCT = 6`
  - Migration SQL `update_platform_fee_to_6_percent` : fonction `get_platform_fee_pct` mise à jour
- **Changement :** Taux uniforme de 6% sur tous les revenus (frais courtier + commissions Exade)
- **Pourquoi :** Simplification de la tarification

### 1.4 Config Exade du broker obligatoire
- **Fichiers :**
  - `app/api/exade/tarifs/route.ts` : suppression du fallback vers variables d'environnement
  - `app/admin/dossiers/[id]/AdminDossierDetailContent.tsx` : ajout de `broker_id` dans 3 appels API
  - `app/admin/nouveau-dossier/page.tsx` : ajout de `broker_id` dans 1 appel API
- **Changement :** `broker_id` est maintenant obligatoire pour utiliser l'API Exade
- **Pourquoi :** Chaque courtier doit utiliser ses propres identifiants Exade

### 1.3 Migration des statuts incohérents
- **Action :** Migration SQL `fix_inconsistent_dossier_statuts`
- **Changement :** 4 dossiers corrigés pour synchroniser `statut` avec `statut_canon`
- **Pourquoi :** Données legacy avec incohérences

### 6.2 Ajout du statut 'annule'
- **Fichiers :**
  - Migration SQL `add_annule_status_to_dossier_enum`
  - `lib/utils/statut-mapping.ts` : types, mappings, et badge config mis à jour
- **Changement :** Nouveau statut `annule` pour les dossiers abandonnés définitivement
- **Pourquoi :** Différencier un refus de devis (temporaire) d'un abandon définitif

### 9.1 Correction notification devis accepté
- **Fichier :** `app/api/devis/manage/route.ts`
- **Changement :** La notification est maintenant envoyée à `dossierInfo.apporteur_id` au lieu de `user.id`
- **Pourquoi :** Notifier l'apporteur, pas l'utilisateur qui a accepté

---

## ✅ PHASE 2 : Améliorations fonctionnelles (Terminée)

### 13.1 Feedback visuel "Copié !" sur le bouton d'invitation
- **Fichier :** `components/features/invites/InviteModal.tsx`
- **Changement :** Ajout d'un état `copied` et affichage "Copié !" avec icône verte pendant 2 secondes
- **Pourquoi :** Meilleure UX pour confirmer la copie du lien

### 7.2 Redirection si client déjà locké
- **Fichiers :**
  - `app/api/dossiers/create/route.ts` : Vérification du client lock côté API avec retour 409 Conflict
  - `app/nouveau-dossier/page.tsx` : Ajout de la logique de vérification et modale de redirection côté apporteur
- **Changement :** 
  - L'API vérifie maintenant le client lock avant de créer un dossier
  - La page apporteur affiche une modale proposant de voir le dossier existant
- **Pourquoi :** Anti-contournement - empêcher la création de dossiers en double pour le même client

---

## ✅ PHASE 4 : Workflow avancé (En cours)

### 3.3 Workflow push Exade + bouton "Confirmer" ✅
- **Fichiers modifiés :**
  - Migration SQL `add_exade_push_columns_to_devis` : colonnes `exade_simulation_id`, `exade_pushed_at`, `exade_locked`
  - `lib/services/exade-push.ts` : nouveau service pour pusher un devis vers Exade
  - `components/features/devis/DevisDetailModal.tsx` : ajout du bouton "Confirmer sur Exade" avec modale de confirmation
  - `app/admin/dossiers/[id]/AdminDossierDetailContent.tsx` : intégration du handler `onPushToExade`
- **Changements :** 
  - Nouvelles colonnes en DB pour tracker le push
  - Service complet pour l'envoi vers Exade avec verrouillage du devis
  - UI avec bouton "Confirmer sur Exade" et modale de confirmation
  - Intégration complète dans la page admin de détail dossier
- **Pourquoi :** Workflow sécurisé pour créer les simulations sur Exade seulement après acceptation

### 8. Tracking analytics ✅
- **Fichiers créés/modifiés :**
  - Migration SQL `add_missing_analytics_columns` : colonnes supplémentaires pour `analytics_events`
  - `lib/services/analytics.ts` : nouveau service complet de tracking RGPD-compliant
  - `app/api/dossiers/create/route.ts` : tracking création dossier
  - `app/api/devis/manage/route.ts` : tracking acceptation/refus devis
  - `lib/services/exade-push.ts` : tracking push Exade
- **Changements :**
  - Table `analytics_events` avec colonnes pour hashing RGPD (email/phone)
  - Service avec méthodes helper pour tous les événements courants
  - Intégration dans les flux critiques (création dossier, devis, push Exade)
- **Pourquoi :** Suivre les parcours utilisateurs pour améliorer l'UX et détecter les patterns suspects

---

## ✅ AMÉLIORATIONS ADDITIONNELLES (21/12/2024)

### Page Statistiques - Suppression des placeholders
- **Fichiers modifiés :**
  - `lib/services/dossiers.ts` : Ajout du filtrage par `broker_id` et calcul du CA réel dans toutes les méthodes de statistiques
  - `lib/services/devis.ts` : Ajout du filtrage par `broker_id` et calcul du CA par compagnie
  - `app/admin/statistiques/page.tsx` : Utilisation du `currentBrokerId` pour filtrer les données et suppression des textes "À venir"
- **Changements :**
  - **KPIs globaux** : Le CA est maintenant calculé depuis les frais de courtage des dossiers finalisés
  - **Analyse par compagnie** : Le CA par compagnie est calculé réellement
  - **Évolution temporelle** : Le CA par mois est maintenant affiché
  - Filtrage multi-courtiers fonctionnel sur toutes les statistiques
- **Pourquoi :** Rendre la page statistiques entièrement fonctionnelle sans données mockées

### Page Nouveau Dossier Admin - Suppression des mocks
- **Fichier :** `app/admin/nouveau-dossier/page.tsx`
- **Changements :**
  - Suppression de la liste d'apporteurs mockée → chargement depuis Supabase via `ApporteursService`
  - Suppression du fallback vers `mockDevis` → affichage d'erreur explicite si l'API Exade échoue
  - Le résumé des offres utilise maintenant `dossierData.devisGeneres` (données réelles)
- **Pourquoi :** Aucune donnée mockée ne doit persister en production

### Menu burger courtier - Fusion Profil/Paramètres
- **Fichier :** `components/AdminHeader.tsx`
- **Changement :** Fusion des liens "Mon profil" et "Paramètres" en un seul lien "Profil & paramètres"
- **Pourquoi :** La page `/admin/parametres` n'existait pas, tous les paramètres sont dans `/admin/profil`

### Nettoyage des TODOs obsolètes
- **Fichier :** `app/dossier/[id]/DossierDetailContent.tsx`
- **Changement :** Suppression des commentaires TODO obsolètes dans les interfaces
- **Pourquoi :** Les champs sont déjà intégrés, les commentaires n'étaient plus pertinents

---

## 🔄 EN COURS

*(Aucune tâche en cours)*

---

## ⏳ À FAIRE

### Phase 3 : Intégrations externes (en attente de clés API)
- [ ] **15.1** Configurer Resend (emails) - ⚠️ Nécessite clé API
- [ ] **15.2** Configurer Stripe (paiements) - ⚠️ Nécessite clé API

### Phase 4 : Workflow avancé
- [ ] **5.2** Système de paiement batch - ⚠️ Dépend de Stripe

### En attente d'infos
- [ ] **11** Relevé mensuel Exade (attendre les réponses aux questions)

---

## 📈 Statistiques

| Phase | Total | Terminé | En cours | À faire |
|-------|-------|---------|----------|---------|
| Phase 1 | 7 | 7 | 0 | 0 |
| Phase 2 | 2 | 2 | 0 | 0 |
| Phase 3 | 2 | 0 | 0 | 2 |
| Phase 4 | 3 | 2 | 0 | 1 |
| Additionnelles | 4 | 4 | 0 | 0 |

**Progression globale : 15/18 tâches (83%)**

*Note : Les tâches restantes nécessitent des clés API (Resend, Stripe) ou des informations supplémentaires (relevé Exade).*

