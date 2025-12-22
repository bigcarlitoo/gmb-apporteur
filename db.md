# Documentation Complète de la Base de Données

## Vue d'ensemble

Cette base de données Supabase contient plusieurs schémas organisant les données
de l'application GMB Apporteur.

**Architecture multi-courtiers** : La base de données a été conçue pour
supporter plusieurs courtiers/cabinets, avec un système de wallet/commissions et
la possibilité d'ajouter différents types de produits d'assurance au-delà de
l'assurance emprunteur.

---

## Extensions Installées

Les extensions PostgreSQL suivantes sont installées :

- **uuid-ossp** (v1.1) - Génération d'identifiants UUID
- **pgcrypto** (v1.3) - Fonctions cryptographiques
- **pg_stat_statements** (v1.11) - Statistiques d'exécution SQL
- **pg_graphql** (v1.5.11) - Support GraphQL
- **supabase_vault** (v0.3.1) - Extension Vault Supabase
- **unaccent** (v1.1) - Recherche de texte sans accents
- **plpgsql** (v1.0) - Langage procédural PL/pgSQL

---

## Schémas et Tables

### Schéma `public`

Tables métier de l'application.

#### Table `brokers`

Courtiers/cabinets - entités business propriétaires des dossiers.

**Colonnes :**

| Nom                           | Type                     | Nullable | Défaut              | Description                                                               |
| ----------------------------- | ------------------------ | -------- | ------------------- | ------------------------------------------------------------------------- |
| `id`                          | uuid                     | Non      | `gen_random_uuid()` | Identifiant unique                                                        |
| `name`                        | text                     | Non      | -                   | Nom du courtier/cabinet                                                   |
| `status`                      | broker_status            | Non      | `'actif'`           | Statut : `actif`, `suspendu`, `inactif`                                   |
| `exade_default_environment`   | exade_environment        | Non      | `'prod'`            | Environnement Exade par défaut                                            |
| `onboarding_status`           | broker_onboarding_status | Non      | `'created'`         | Statut onboarding : `created`, `exade_pending`, `ready`                   |
| `onboarding_completed_at`     | timestamptz              | Oui      | -                   | Date de complétion onboarding                                             |
| `exade_request_email_sent_at` | timestamptz              | Oui      | -                   | Date d'envoi email Exade                                                  |
| `orias_number`                | text                     | Oui      | -                   | **NOUVEAU** - Numéro ORIAS du courtier                                    |
| `siret_number`                | text                     | Oui      | -                   | **NOUVEAU** - Numéro SIRET du courtier                                    |
| `is_blocked`                  | boolean                  | Non      | `false`             | **NOUVEAU** - TRUE si le broker est bloqué (trop de dossiers non validés) |
| `blocked_at`                  | timestamptz              | Oui      | -                   | **NOUVEAU** - Date de blocage                                             |
| `blocked_reason`              | text                     | Oui      | -                   | **NOUVEAU** - Raison du blocage                                           |
| `pending_validations_count`   | integer                  | Non      | `0`                 | **NOUVEAU** - Nombre de dossiers en attente de validation                 |
| `billing_email`               | text                     | Oui      | -                   | Email de facturation                                                      |
| `billing_address`             | text                     | Oui      | -                   | Adresse de facturation                                                    |
| `created_at`                  | timestamptz              | Non      | `now()`             | Date de création                                                          |
| `updated_at`                  | timestamptz              | Non      | `now()`             | Date de mise à jour                                                       |

**Contraintes :**

- **PRIMARY KEY** : `id`

**Index :**

- `brokers_pkey` (PRIMARY KEY sur `id`)
- `idx_brokers_status` (sur `status`)
- `idx_brokers_onboarding_status` (sur `onboarding_status`)

**RLS :** Activé

---

#### Table `broker_users`

Liaison entre utilisateurs Supabase et brokers avec rôle.

**Colonnes :**

| Nom          | Type             | Nullable | Défaut              | Description                       |
| ------------ | ---------------- | -------- | ------------------- | --------------------------------- |
| `id`         | uuid             | Non      | `gen_random_uuid()` | Identifiant unique                |
| `broker_id`  | uuid             | Non      | -                   | Référence vers `brokers.id`       |
| `user_id`    | uuid             | Non      | -                   | Référence vers `auth.users.id`    |
| `role`       | broker_user_role | Non      | `'member'`          | Rôle : `owner`, `admin`, `member` |
| `created_at` | timestamptz      | Non      | `now()`             | Date de création                  |
| `updated_at` | timestamptz      | Non      | `now()`             | Date de mise à jour               |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `broker_id, user_id`
- **FOREIGN KEY** :
  - `broker_id` → `brokers.id` (ON DELETE CASCADE)
  - `user_id` → `auth.users.id` (ON DELETE CASCADE)

**Index :**

- `broker_users_pkey` (PRIMARY KEY sur `id`)
- `idx_broker_users_broker_id` (sur `broker_id`)
- `idx_broker_users_user_id` (sur `user_id`)

**RLS :** Activé

---

#### Table `broker_apporteurs`

Liaison entre apporteurs et brokers (un apporteur peut être lié à plusieurs
brokers).

**Colonnes :**

| Nom                          | Type                    | Nullable | Défaut              | Description                                                                   |
| ---------------------------- | ----------------------- | -------- | ------------------- | ----------------------------------------------------------------------------- |
| `id`                         | uuid                    | Non      | `gen_random_uuid()` | Identifiant unique                                                            |
| `broker_id`                  | uuid                    | Non      | -                   | Référence vers `brokers.id`                                                   |
| `apporteur_profile_id`       | uuid                    | Non      | -                   | Référence vers `apporteur_profiles.id`                                        |
| `status`                     | broker_apporteur_status | Non      | `'actif'`           | Statut : `actif`, `inactif`, `suspendu`                                       |
| `default_commission_rule_id` | uuid                    | Oui      | -                   | Référence vers `commission_rules.id` (règle par défaut)                       |
| `custom_share_pct`           | numeric                 | Oui      | -                   | **NOUVEAU** - Pourcentage commission personnalisé pour cet apporteur (0-100)  |
| `custom_fixed_amount`        | numeric                 | Oui      | -                   | **NOUVEAU** - Montant fixe personnalisé en centimes (remplace le % si défini) |
| `created_at`                 | timestamptz             | Non      | `now()`             | Date de création                                                              |
| `updated_at`                 | timestamptz             | Non      | `now()`             | Date de mise à jour                                                           |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `broker_id, apporteur_profile_id`
- **FOREIGN KEY** :
  - `broker_id` → `brokers.id` (ON DELETE CASCADE)
  - `apporteur_profile_id` → `apporteur_profiles.id` (ON DELETE CASCADE)
  - `default_commission_rule_id` → `commission_rules.id` (ON DELETE SET NULL)
- **CHECK** :
  - `custom_share_pct` doit être NULL ou entre 0 et 100

**Index :**

- `broker_apporteurs_pkey` (PRIMARY KEY sur `id`)
- `idx_broker_apporteurs_broker_id` (sur `broker_id`)
- `idx_broker_apporteurs_apporteur_id` (sur `apporteur_profile_id`)

**RLS :** Activé

---

#### Table `broker_invites`

Système d'invitations pour apporteurs et broker_users. Permet aux courtiers de
créer des liens d'invitation sécurisés avec expiration et limitation d'usage.

**Colonnes :**

| Nom                  | Type               | Nullable | Défaut              | Description                                                       |
| -------------------- | ------------------ | -------- | ------------------- | ----------------------------------------------------------------- |
| `id`                 | uuid               | Non      | `gen_random_uuid()` | Identifiant unique                                                |
| `broker_id`          | uuid               | Non      | -                   | Référence vers `brokers.id`                                       |
| `created_by_user_id` | uuid               | Non      | -                   | Référence vers `auth.users.id` (courtier qui génère l'invitation) |
| `invite_type`        | broker_invite_type | Non      | `'apporteur'`       | Type : `apporteur`, `broker_user`                                 |
| `token`              | text               | Non      | -                   | Token unique (64 caractères, base64)                              |
| `expires_at`         | timestamptz        | Non      | -                   | Date d'expiration de l'invitation                                 |
| `max_uses`           | int                | Non      | `1`                 | Nombre maximum d'utilisations                                     |
| `uses`               | int                | Non      | `0`                 | Nombre d'utilisations actuelles                                   |
| `revoked_at`         | timestamptz        | Oui      | -                   | Date de révocation (si révoquée)                                  |
| `created_at`         | timestamptz        | Non      | `now()`             | Date de création                                                  |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `token`
- **FOREIGN KEY** :
  - `broker_id` → `brokers.id` (ON DELETE CASCADE)
  - `created_by_user_id` → `auth.users.id` (ON DELETE CASCADE)
- **CHECK** :
  - `max_uses > 0`
  - `uses >= 0`
  - `uses <= max_uses`

**Index :**

- `broker_invites_pkey` (PRIMARY KEY sur `id`)
- `idx_broker_invites_broker_id` (sur `broker_id`)
- `idx_broker_invites_token` (sur `token`)
- `idx_broker_invites_created_by` (sur `created_by_user_id`)
- `idx_broker_invites_expires_at` (sur `expires_at` WHERE `revoked_at IS NULL`)

**RLS :** Activé

**Policies RLS :**

- **ALL** : `Broker owners and admins can manage invites`
  - Seuls les owner/admin du broker peuvent créer/voir/modifier les invitations
  - Les apporteurs ne peuvent PAS lister les invitations (ils n'en ont pas
    besoin)

---

#### Table `broker_exade_configs`

Configuration Exade par broker. Les secrets (licence WS, password, token) sont
stockés dans Supabase Vault, référencés via `vault_secret_name` ou
`vault_secret_id`.

**Colonnes :**

| Nom                   | Type              | Nullable | Défaut              | Description                                                   |
| --------------------- | ----------------- | -------- | ------------------- | ------------------------------------------------------------- |
| `id`                  | uuid              | Non      | `gen_random_uuid()` | Identifiant unique                                            |
| `broker_id`           | uuid              | Non      | -                   | Référence vers `brokers.id`                                   |
| `environment`         | exade_environment | Non      | `'prod'`            | Environnement : `stage`, `prod`                               |
| `endpoint_url`        | text              | Oui      | -                   | URL de l'endpoint Exade                                       |
| `code_courtier`       | text              | Non      | -                   | Code courtier Exade                                           |
| `point_de_vente_code` | text              | Oui      | -                   | Code point de vente (si nécessaire)                           |
| `is_enabled`          | boolean           | Non      | `true`              | Indique si la config est active                               |
| `vault_secret_name`   | text              | Oui      | -                   | Nom du secret dans Supabase Vault                             |
| `vault_secret_id`     | uuid              | Oui      | -                   | ID du secret dans `vault.secrets`                             |
| `configured_at`       | timestamptz       | Oui      | -                   | Date de configuration Exade                                   |
| `last_tested_at`      | timestamptz       | Oui      | -                   | Date du dernier test Exade                                    |
| `last_test_status`    | text              | Oui      | -                   | Statut du dernier test (`success`, `error`, etc.)             |
| `licence_key`         | text              | Oui      | -                   | **NOUVEAU** - Clé de licence WebService Exade (sensible)      |
| `sso_key`             | text              | Oui      | -                   | **NOUVEAU** - Clé SSO pour authentification automatique Exade |
| `created_at`          | timestamptz       | Non      | `now()`             | Date de création                                              |
| `updated_at`          | timestamptz       | Non      | `now()`             | Date de mise à jour                                           |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `broker_id, environment`
- **FOREIGN KEY** : `broker_id` → `brokers.id` (ON DELETE CASCADE)

**Index :**

- `broker_exade_configs_pkey` (PRIMARY KEY sur `id`)
- `idx_broker_exade_configs_broker_id` (sur `broker_id`)
- `idx_broker_exade_configs_enabled` (sur `is_enabled` WHERE
  `is_enabled = true`)

**RLS :** Désactivé

---

#### Table `insurance_products`

Produits d'assurance supportés (emprunteur, auto, santé, etc.).

**Colonnes :**

| Nom          | Type        | Nullable | Défaut              | Description                                                                    |
| ------------ | ----------- | -------- | ------------------- | ------------------------------------------------------------------------------ |
| `id`         | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                                                             |
| `code`       | text        | Non      | -                   | Code unique du produit (ex: `loan_insurance`, `auto`, `home`, `health`, `pro`) |
| `label`      | text        | Non      | -                   | Libellé du produit                                                             |
| `is_enabled` | boolean     | Non      | `true`              | Indique si le produit est activé                                               |
| `created_at` | timestamptz | Non      | `now()`             | Date de création                                                               |
| `updated_at` | timestamptz | Non      | `now()`             | Date de mise à jour                                                            |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `code`

**Index :**

- `insurance_products_pkey` (PRIMARY KEY sur `id`)
- `idx_insurance_products_code` (sur `code`)
- `idx_insurance_products_enabled` (sur `is_enabled` WHERE `is_enabled = true`)

**RLS :** Activé

**Produits initiaux :**

- `loan_insurance` - Assurance Emprunteur (activé)
- `auto` - Assurance Auto (désactivé)
- `home` - Assurance Habitation (désactivé)
- `health` - Assurance Santé (désactivé)
- `pro` - Assurance Professionnelle (désactivé)

---

#### Table `apporteur_profiles`

Profil des apporteurs d'affaires.

**Colonnes :**

| Nom               | Type             | Nullable | Défaut              | Description                             |
| ----------------- | ---------------- | -------- | ------------------- | --------------------------------------- |
| `id`              | uuid             | Non      | `gen_random_uuid()` | Identifiant unique                      |
| `user_id`         | uuid             | Oui      | -                   | Référence vers `auth.users.id` (UNIQUE) |
| `nom`             | varchar          | Non      | -                   | Nom de l'apporteur                      |
| `prenom`          | varchar          | Non      | -                   | Prénom de l'apporteur                   |
| `email`           | varchar          | Non      | -                   | Email de l'apporteur                    |
| `telephone`       | varchar          | Oui      | -                   | Téléphone de l'apporteur                |
| `cgu_accepted_at` | timestamptz      | Oui      | -                   | Date d'acceptation des CGU              |
| `statut`          | apporteur_statut | Non      | `'actif'`           | Statut de l'apporteur (enum)            |
| `last_login_at`   | timestamptz      | Oui      | -                   | Date de dernière connexion              |
| `created_at`      | timestamptz      | Oui      | `now()`             | Date de création                        |
| `updated_at`      | timestamptz      | Oui      | `now()`             | Date de mise à jour                     |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `user_id`
- **FOREIGN KEY** : `user_id` → `auth.users.id` (ON DELETE CASCADE)

**Index :**

- `apporteur_profiles_pkey` (PRIMARY KEY sur `id`)
- `apporteur_profiles_user_id_key` (UNIQUE sur `user_id`)
- `idx_apporteur_profiles_email` (sur `email`)
- `idx_apporteur_profiles_last_login_at` (sur `last_login_at DESC`)

**RLS :** Activé

---

#### Table `dossiers`

Dossiers de prêts gérés par l'application.

**Colonnes :**

| Nom                           | Type           | Nullable | Défaut              | Description                                                                                                  |
| ----------------------------- | -------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`                          | uuid           | Non      | `gen_random_uuid()` | Identifiant unique                                                                                           |
| `numero_dossier`              | varchar        | Non      | -                   | Numéro unique du dossier (UNIQUE)                                                                            |
| `broker_id`                   | uuid           | Non      | -                   | **NOUVEAU** - Référence vers `brokers.id` (pivot principal multi-courtiers)                                  |
| `apporteur_id`                | uuid           | Oui      | -                   | Référence vers `apporteur_profiles.id`                                                                       |
| `admin_id`                    | uuid           | Oui      | -                   | Référence vers `auth.users.id` (admin assigné)                                                               |
| `insurance_product_id`        | uuid           | Non      | -                   | **NOUVEAU** - Référence vers `insurance_products.id` (remplace progressivement type_dossier)                 |
| `type_dossier`                | varchar        | Non      | -                   | Type : `pret_immobilier`, `rachat_credit`, `pret_travaux`, `pret_consommation` (maintenu pour compatibilité) |
| `statut`                      | varchar        | Oui      | `'en_attente'`      | **LEGACY** - Statut avec accents (utiliser `statut_canon` en logique métier)                                 |
| `statut_canon`                | dossier_statut | Non      | `'en_attente'`      | Statut canonique (enum) - **À utiliser en logique métier**                                                   |
| `montant_capital`             | numeric        | Oui      | -                   | Montant du capital                                                                                           |
| `economie_generee`            | numeric        | Oui      | `0`                 | Économie générée                                                                                             |
| `is_read`                     | boolean        | Oui      | `false`             | Indique si le dossier a été lu                                                                               |
| `is_couple`                   | boolean        | Oui      | `false`             | Indique si le dossier concerne un couple                                                                     |
| `commentaire`                 | text           | Oui      | -                   | Commentaire général                                                                                          |
| `notes_interne`               | text           | Oui      | -                   | Notes internes                                                                                               |
| `devis_selectionne_id`        | uuid           | Oui      | -                   | Référence vers `devis.id` (devis sélectionné)                                                                |
| `commentaire_refus`           | text           | Oui      | -                   | Commentaire en cas de refus                                                                                  |
| `date_finalisation`           | timestamptz    | Oui      | -                   | Date de finalisation du dossier                                                                              |
| `extracted_client_data`       | jsonb          | Oui      | -                   | Données client extraites par l'IA                                                                            |
| `comparison_modal_seen`       | boolean        | Oui      | `false`             | Si l'admin a vu la modale de comparaison                                                                     |
| `last_extraction_at`          | timestamptz    | Oui      | -                   | Date de dernière extraction automatique                                                                      |
| `validation_due_at`           | timestamptz    | Oui      | -                   | **NOUVEAU** - Date limite pour valider le paiement (30 jours après finalisation)                             |
| `validated_at`                | timestamptz    | Oui      | -                   | **NOUVEAU** - Date de validation du paiement par le courtier                                                 |
| `validation_reminder_sent_at` | timestamptz    | Oui      | -                   | **NOUVEAU** - Date du dernier rappel envoyé                                                                  |
| `date_creation`               | timestamptz    | Oui      | `now()`             | Date de création                                                                                             |
| `created_at`                  | timestamptz    | Oui      | `now()`             | Date de création                                                                                             |
| `updated_at`                  | timestamptz    | Oui      | `now()`             | Date de mise à jour                                                                                          |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `numero_dossier`
- **FOREIGN KEY** :
  - `broker_id` → `brokers.id` (ON DELETE RESTRICT)
  - `insurance_product_id` → `insurance_products.id` (ON DELETE RESTRICT)
  - `apporteur_id` → `apporteur_profiles.id` (ON DELETE SET NULL)
  - `admin_id` → `auth.users.id` (ON DELETE SET NULL)
  - `devis_selectionne_id` → `devis.id` (ON DELETE SET NULL)
- **CHECK** :
  - `statut` doit être dans
    `['en_attente', 'devis_envoye', 'devis_accepte', 'finalisé', 'refusé']`
  - `type_dossier` doit être dans
    `['pret_immobilier', 'rachat_credit', 'pret_travaux', 'pret_consommation']`

**Index :**

- `dossiers_pkey` (PRIMARY KEY sur `id`)
- `dossiers_numero_dossier_key` (UNIQUE sur `numero_dossier`)
- `idx_dossiers_broker_id` (sur `broker_id`)
- `idx_dossiers_insurance_product_id` (sur `insurance_product_id`)
- `idx_dossiers_broker_statut_date` (sur
  `broker_id, statut_canon, date_creation`) - **NOUVEAU** - Index composite pour
  requêtes multi-courtiers
- `idx_dossiers_apporteur_id` (sur `apporteur_id`)
- `idx_dossiers_admin_id` (sur `admin_id`)
- `idx_dossiers_statut` (sur `statut`)
- `idx_dossiers_statut_canon` (sur `statut_canon`)
- `idx_dossiers_type` (sur `type_dossier`)
- `idx_dossiers_numero_dossier` (sur `numero_dossier`)
- `idx_dossiers_date_creation` (sur `date_creation`)
- `idx_dossiers_devis_selectionne_id` (sur `devis_selectionne_id`)
- `idx_dossiers_is_read` (sur `is_read`)
- `idx_dossiers_apporteur_statut` (sur `apporteur_id, statut_canon`)

**RLS :** Activé

---

#### Table `client_infos`

Informations sur les clients (emprunteurs).

**Colonnes :**

| Nom                                  | Type        | Nullable | Défaut              | Description                                                                |
| ------------------------------------ | ----------- | -------- | ------------------- | -------------------------------------------------------------------------- |
| `id`                                 | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                                                         |
| `dossier_id`                         | uuid        | Oui      | -                   | Référence vers `dossiers.id`                                               |
| `client_civilite`                    | varchar     | Oui      | -                   | Civilité : M, Mme, Mlle                                                    |
| `client_nom`                         | varchar     | Non      | -                   | Nom de l'emprunteur                                                        |
| `client_prenom`                      | varchar     | Non      | -                   | Prénom de l'emprunteur                                                     |
| `client_nom_naissance`               | varchar     | Oui      | -                   | Nom de jeune fille                                                         |
| `client_email`                       | varchar     | Non      | -                   | Email de l'emprunteur                                                      |
| `client_telephone`                   | varchar     | Oui      | -                   | Téléphone de l'emprunteur                                                  |
| `client_date_naissance`              | date        | Non      | -                   | Date de naissance                                                          |
| `client_adresse`                     | text        | Oui      | -                   | Adresse                                                                    |
| `client_profession`                  | varchar     | Oui      | -                   | Profession                                                                 |
| `client_fumeur`                      | boolean     | Oui      | `false`             | Indique si le client fume                                                  |
| `categorie_professionnelle`          | integer     | Oui      | -                   | Code catégorie Exade (1-11)                                                |
| `conjoint_nom`                       | varchar     | Oui      | -                   | Nom du conjoint                                                            |
| `conjoint_prenom`                    | varchar     | Oui      | -                   | Prénom du conjoint                                                         |
| `conjoint_civilite`                  | varchar     | Oui      | -                   | Civilité du conjoint                                                       |
| `conjoint_nom_naissance`             | varchar     | Oui      | -                   | Nom de jeune fille du conjoint                                             |
| `conjoint_email`                     | varchar     | Oui      | -                   | Email du conjoint                                                          |
| `conjoint_telephone`                 | varchar     | Oui      | -                   | Téléphone du conjoint                                                      |
| `conjoint_date_naissance`            | date        | Oui      | -                   | Date de naissance du conjoint                                              |
| `conjoint_profession`                | varchar     | Oui      | -                   | Profession du conjoint                                                     |
| `conjoint_fumeur`                    | boolean     | Oui      | `false`             | Indique si le conjoint fume                                                |
| `conjoint_categorie_professionnelle` | integer     | Oui      | -                   | Code catégorie Exade pour le conjoint (1-11)                               |
| `client_lieu_naissance`              | varchar     | Oui      | -                   | **NOUVEAU** - Lieu de naissance (ville ou pays) - obligatoire pour Exade   |
| `client_code_postal`                 | varchar     | Oui      | -                   | **NOUVEAU** - Code postal                                                  |
| `client_ville`                       | varchar     | Oui      | -                   | **NOUVEAU** - Ville                                                        |
| `client_complement_adresse`          | text        | Oui      | -                   | **NOUVEAU** - Complément d'adresse                                         |
| `client_deplacement_pro`             | integer     | Oui      | `1`                 | **NOUVEAU** - Déplacement professionnel: 1=moins de 20000km/an, 2=20000km+ |
| `client_travaux_manuels`             | integer     | Oui      | `0`                 | **NOUVEAU** - Travaux manuels: 0=aucun, 1=léger, 2=moyen/important         |
| `conjoint_lieu_naissance`            | varchar     | Oui      | -                   | **NOUVEAU** - Lieu de naissance du conjoint                                |
| `conjoint_deplacement_pro`           | integer     | Oui      | `1`                 | **NOUVEAU** - Déplacement professionnel du conjoint                        |
| `conjoint_travaux_manuels`           | integer     | Oui      | `0`                 | **NOUVEAU** - Travaux manuels du conjoint                                  |
| `created_at`                         | timestamptz | Oui      | `now()`             | Date de création                                                           |
| `updated_at`                         | timestamptz | Oui      | `now()`             | Date de mise à jour                                                        |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** : `dossier_id` → `dossiers.id` (ON DELETE CASCADE)
- **CHECK** :
  - `categorie_professionnelle` doit être NULL ou entre 1 et 11
  - `conjoint_categorie_professionnelle` doit être NULL ou entre 1 et 11
  - `client_deplacement_pro` doit être 1 ou 2
  - `client_travaux_manuels` doit être 0, 1 ou 2
  - `conjoint_deplacement_pro` doit être 1 ou 2
  - `conjoint_travaux_manuels` doit être 0, 1 ou 2

**Index :**

- `client_infos_pkey` (PRIMARY KEY sur `id`)
- `idx_client_infos_dossier_id` (sur `dossier_id`)
- `idx_client_infos_client_email` (sur `client_email`)
- `idx_client_infos_email` (sur `client_email`)

**RLS :** Activé

**Codes catégories professionnelles Exade :**

1. Salarié cadre
2. Salarié non cadre
3. Profession libérale
4. Chirurgien
5. Chirurgien-dentiste
6. Médecin spécialiste
7. Vétérinaire
8. Artisan
9. Commerçant
10. Retraité
11. Sans activité

---

#### Table `pret_data`

Données du prêt existant.

**Colonnes :**

| Nom                     | Type        | Nullable | Défaut              | Description                          |
| ----------------------- | ----------- | -------- | ------------------- | ------------------------------------ |
| `id`                    | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                   |
| `dossier_id`            | uuid        | Oui      | -                   | Référence vers `dossiers.id`         |
| `banque_preteuse`       | varchar     | Non      | -                   | Nom de la banque prêteuse            |
| `montant_capital`       | numeric     | Non      | -                   | Montant du capital (doit être > 0)   |
| `duree_mois`            | integer     | Non      | -                   | Durée en mois (doit être > 0)        |
| `type_pret`             | varchar     | Non      | -                   | Type de prêt                         |
| `taux_nominal`          | numeric     | Oui      | -                   | Taux nominal                         |
| `taux_effectif`         | numeric     | Oui      | -                   | Taux effectif                        |
| `taux_assurance`        | numeric     | Oui      | -                   | Taux d'assurance                     |
| `cout_assurance_banque` | numeric     | Oui      | -                   | Coût de l'assurance banque           |
| `type_garantie`         | varchar     | Oui      | -                   | Type de garantie                     |
| `apport_personnel`      | numeric     | Oui      | `0`                 | Apport personnel                     |
| `date_debut`            | date        | Oui      | -                   | Date de début extraite des documents |
| `date_fin`              | date        | Oui      | -                   | Date de fin extraite des documents   |
| `date_debut_effective`  | date        | Oui      | -                   | Date de début effective calculée     |
| `duree_restante_mois`   | integer     | Oui      | -                   | Durée restante en mois calculée      |
| `capital_restant_du`    | numeric     | Oui      | -                   | Capital restant dû calculé           |
| `created_at`            | timestamptz | Oui      | `now()`             | Date de création                     |
| `updated_at`            | timestamptz | Oui      | `now()`             | Date de mise à jour                  |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** : `dossier_id` → `dossiers.id` (ON DELETE CASCADE)
- **CHECK** :
  - `montant_capital > 0`
  - `duree_mois > 0`

**Index :**

- `pret_data_pkey` (PRIMARY KEY sur `id`)
- `idx_pret_data_dossier_id` (sur `dossier_id`)
- `idx_pret_data_banque` (sur `banque_preteuse`)

**RLS :** Activé

---

#### Table `devis`

Devis générés pour les dossiers.

**Colonnes :**

| Nom                       | Type        | Nullable | Défaut              | Description                                                                 |
| ------------------------- | ----------- | -------- | ------------------- | --------------------------------------------------------------------------- |
| `id`                      | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                                                          |
| `dossier_id`              | uuid        | Oui      | -                   | Référence vers `dossiers.id`                                                |
| `numero_devis`            | varchar     | Non      | -                   | Numéro unique du devis (UNIQUE)                                             |
| `compagnie`               | varchar     | Oui      | -                   | Nom de la compagnie d'assurance                                             |
| `produit`                 | varchar     | Oui      | -                   | Nom du produit                                                              |
| `reference`               | varchar     | Oui      | -                   | Référence du devis                                                          |
| `cout_total`              | numeric     | Oui      | -                   | Coût total                                                                  |
| `cout_mensuel`            | numeric     | Oui      | -                   | Coût mensuel                                                                |
| `economie_estimee`        | numeric     | Oui      | -                   | Économie estimée                                                            |
| `statut`                  | varchar     | Non      | `'en_attente'`      | Statut : `en_attente`, `envoye`, `lu`, `accepte`, `refuse`, `expire`        |
| `donnees_devis`           | jsonb       | Non      | -                   | Données complètes du devis (JSON)                                           |
| `pdf_url`                 | text        | Oui      | -                   | URL du PDF du devis                                                         |
| `pdf_created_at`          | timestamptz | Oui      | -                   | Date de création du PDF                                                     |
| `date_generation`         | timestamptz | Oui      | `now()`             | Date de génération                                                          |
| `date_envoi`              | timestamptz | Oui      | -                   | Date d'envoi au client                                                      |
| `date_acceptation`        | timestamptz | Oui      | -                   | Date d'acceptation                                                          |
| `date_expiration`         | timestamptz | Oui      | -                   | Date d'expiration                                                           |
| `date_refus`              | timestamptz | Oui      | -                   | Date de refus                                                               |
| `motif_refus`             | text        | Oui      | -                   | Motif du refus                                                              |
| `frais_courtier`          | numeric     | Oui      | -                   | **NOUVEAU** - Frais de courtage en centimes choisis par le courtier         |
| `commission_exade_code`   | varchar     | Oui      | -                   | **NOUVEAU** - Code commission Exade utilisé (ex: 1T4, 2T2)                  |
| `apporteur_share_pct`     | numeric     | Oui      | -                   | **NOUVEAU** - Pourcentage commission apporteur au moment du calcul (0-100)  |
| `apporteur_amount`        | numeric     | Oui      | -                   | **NOUVEAU** - Montant dû à l'apporteur en centimes                          |
| `platform_fee_pct`        | numeric     | Oui      | -                   | **NOUVEAU** - Pourcentage commission plateforme au moment du calcul (0-100) |
| `platform_fee_amount`     | numeric     | Oui      | -                   | **NOUVEAU** - Montant de commission plateforme en centimes                  |
| `courtier_net_amount`     | numeric     | Oui      | -                   | **NOUVEAU** - Montant net pour le courtier en centimes (après déductions)   |
| `commission_exade_amount` | numeric     | Oui      | -                   | **NOUVEAU** - Commission Exade estimée en centimes (retournée par l'API)    |
| `financial_calculated_at` | timestamptz | Oui      | -                   | **NOUVEAU** - Date/heure du calcul des montants financiers                  |
| `created_at`              | timestamptz | Oui      | `now()`             | Date de création                                                            |
| `updated_at`              | timestamptz | Oui      | `now()`             | Date de mise à jour                                                         |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `numero_devis`
- **FOREIGN KEY** : `dossier_id` → `dossiers.id` (ON DELETE CASCADE)
- **CHECK** :
  - `statut` doit être dans
    `['en_attente', 'envoye', 'lu', 'accepte', 'refuse', 'expire']`
  - `apporteur_share_pct` doit être NULL ou entre 0 et 100
  - `platform_fee_pct` doit être NULL ou entre 0 et 100

**Index :**

- `devis_pkey` (PRIMARY KEY sur `id`)
- `devis_numero_devis_key` (UNIQUE sur `numero_devis`)
- `idx_devis_dossier_id` (sur `dossier_id`)
- `idx_devis_statut` (sur `statut`)
- `idx_devis_numero_devis` (sur `numero_devis`)
- `idx_devis_compagnie` (sur `compagnie`)
- `idx_devis_reference` (sur `reference`)
- `idx_devis_cout_total` (sur `cout_total`)
- `idx_devis_date_generation` (sur `date_generation`)
- `idx_devis_date_refus` (sur `date_refus` WHERE `date_refus IS NOT NULL`)
- `idx_devis_motif_refus` (sur `motif_refus` WHERE `motif_refus IS NOT NULL`)
- `idx_devis_donnees_gin` (GIN sur `donnees_devis`)

**RLS :** Activé

---

#### Table `devis_history`

Historique des actions effectuées sur les devis.

**Colonnes :**

| Nom                | Type        | Nullable | Défaut              | Description                                              |
| ------------------ | ----------- | -------- | ------------------- | -------------------------------------------------------- |
| `id`               | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                                       |
| `devis_id`         | uuid        | Non      | -                   | Référence vers `devis.id`                                |
| `dossier_id`       | uuid        | Non      | -                   | Référence vers `dossiers.id`                             |
| `action`           | varchar     | Non      | -                   | Type d'action : `envoye`, `refuse`, `accepte`, `renvoye` |
| `statut_precedent` | varchar     | Oui      | -                   | Statut précédent                                         |
| `statut_nouveau`   | varchar     | Oui      | -                   | Nouveau statut                                           |
| `motif_refus`      | text        | Oui      | -                   | Motif de refus (si applicable)                           |
| `user_id`          | uuid        | Oui      | -                   | ID de l'utilisateur ayant effectué l'action              |
| `user_type`        | varchar     | Oui      | -                   | Type d'utilisateur : `admin` ou `apporteur`              |
| `commentaire`      | text        | Oui      | -                   | Commentaire                                              |
| `created_at`       | timestamptz | Oui      | `now()`             | Date de création                                         |
| `updated_at`       | timestamptz | Oui      | `now()`             | Date de mise à jour                                      |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** :
  - `devis_id` → `devis.id` (ON DELETE CASCADE)
  - `dossier_id` → `dossiers.id` (ON DELETE CASCADE)

**Index :**

- `devis_history_pkey` (PRIMARY KEY sur `id`)
- `idx_devis_history_devis_id` (sur `devis_id`)
- `idx_devis_history_dossier_id` (sur `dossier_id`)
- `idx_devis_history_created_at` (sur `created_at`)

**RLS :** Activé

**Policies RLS :**

- **SELECT** : `Users can view devis_history for accessible devis`
  - Un user peut voir l'historique d'un devis s'il peut voir le devis lui-même
  - Vérifie l'accès via `devis_id` → `dossier_id` → `broker_id`
  - Même logique que les policies sur `devis` (apporteur actif du broker,
    broker_user, ou super_admin)

---

#### Table `documents`

Documents associés aux dossiers.

**Colonnes :**

| Nom              | Type                | Nullable | Défaut              | Description                                                             |
| ---------------- | ------------------- | -------- | ------------------- | ----------------------------------------------------------------------- |
| `id`             | uuid                | Non      | `gen_random_uuid()` | Identifiant unique                                                      |
| `dossier_id`     | uuid                | Oui      | -                   | Référence vers `dossiers.id`                                            |
| `document_name`  | varchar             | Non      | -                   | Nom du document                                                         |
| `document_type`  | varchar             | Non      | -                   | Type de document                                                        |
| `file_size`      | bigint              | Oui      | -                   | Taille du fichier en octets                                             |
| `mime_type`      | varchar             | Oui      | -                   | Type MIME                                                               |
| `storage_path`   | text                | Non      | -                   | Chemin de stockage                                                      |
| `storage_bucket` | varchar             | Oui      | `'documents'`       | Nom du bucket de stockage                                               |
| `uploaded_by`    | uuid                | Oui      | -                   | Référence vers `auth.users.id`                                          |
| `source`         | document_source     | Oui      | `'uploaded'`        | **NOUVEAU** - Source : `uploaded`, `exade_generated`, `system`          |
| `external_ref`   | text                | Oui      | -                   | **NOUVEAU** - Référence externe (ex: exade_document_id, exade_doc_type) |
| `visibility`     | document_visibility | Oui      | `'apporteur'`       | **NOUVEAU** - Visibilité : `apporteur`, `broker_only`, `admin_only`     |
| `created_at`     | timestamptz         | Oui      | `now()`             | Date de création                                                        |
| `updated_at`     | timestamptz         | Oui      | `now()`             | Date de mise à jour                                                     |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** :
  - `dossier_id` → `dossiers.id` (ON DELETE CASCADE)
  - `uploaded_by` → `auth.users.id`

**Index :**

- `documents_pkey` (PRIMARY KEY sur `id`)
- `idx_documents_dossier_id` (sur `dossier_id`)
- `idx_documents_type` (sur `document_type`)
- `idx_documents_uploaded_by` (sur `uploaded_by`)
- `idx_documents_source` (sur `source`)
- `idx_documents_external_ref` (sur `external_ref` WHERE
  `external_ref IS NOT NULL`)
- `idx_documents_visibility` (sur `visibility`)

**RLS :** Activé

---

#### Table `process_steps`

Étapes du processus de traitement des dossiers.

**Colonnes :**

| Nom                | Type        | Nullable | Défaut              | Description                                                         |
| ------------------ | ----------- | -------- | ------------------- | ------------------------------------------------------------------- |
| `id`               | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                                                  |
| `dossier_id`       | uuid        | Oui      | -                   | Référence vers `dossiers.id`                                        |
| `step_name`        | varchar     | Non      | -                   | Nom de l'étape                                                      |
| `step_description` | text        | Oui      | -                   | Description de l'étape                                              |
| `step_order`       | integer     | Non      | -                   | Ordre de l'étape                                                    |
| `status`           | varchar     | Non      | `'pending'`         | Statut : `pending`, `in_progress`, `completed`, `failed`, `skipped` |
| `started_at`       | timestamptz | Oui      | -                   | Date de début                                                       |
| `completed_at`     | timestamptz | Oui      | -                   | Date de complétion                                                  |
| `created_at`       | timestamptz | Oui      | `now()`             | Date de création                                                    |
| `updated_at`       | timestamptz | Oui      | `now()`             | Date de mise à jour                                                 |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** : `dossier_id` → `dossiers.id` (ON DELETE CASCADE)
- **CHECK** : `status` doit être dans
  `['pending', 'in_progress', 'completed', 'failed', 'skipped']`

**Index :**

- `process_steps_pkey` (PRIMARY KEY sur `id`)
- `idx_process_steps_dossier_id` (sur `dossier_id`)
- `idx_process_steps_order` (sur `dossier_id, step_order`)
- `idx_process_steps_status` (sur `status`)
- `idx_process_steps_step_order` (sur `step_order`)

**RLS :** Activé

---

#### Table `activities`

Activités et événements liés aux dossiers et apporteurs.

**Colonnes :**

| Nom                    | Type        | Nullable | Défaut              | Description                            |
| ---------------------- | ----------- | -------- | ------------------- | -------------------------------------- |
| `id`                   | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                     |
| `user_id`              | uuid        | Oui      | -                   | Référence vers `apporteur_profiles.id` |
| `dossier_id`           | uuid        | Oui      | -                   | Référence vers `dossiers.id`           |
| `activity_type`        | varchar     | Non      | -                   | Type d'activité                        |
| `activity_title`       | varchar     | Non      | -                   | Titre de l'activité                    |
| `activity_description` | text        | Oui      | -                   | Description de l'activité              |
| `activity_data`        | jsonb       | Oui      | -                   | Données supplémentaires (JSON)         |
| `is_read`              | boolean     | Oui      | `false`             | Indique si l'activité a été lue        |
| `created_at`           | timestamptz | Oui      | `now()`             | Date de création                       |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** :
  - `user_id` → `apporteur_profiles.id` (ON DELETE CASCADE)
  - `dossier_id` → `dossiers.id` (ON DELETE CASCADE)

**Index :**

- `activities_pkey` (PRIMARY KEY sur `id`)
- `idx_activities_user_id` (sur `user_id`)
- `idx_activities_dossier_id` (sur `dossier_id`)
- `idx_activities_type` (sur `activity_type`)
- `idx_activities_created_at` (sur `created_at DESC`)
- `idx_activities_user_created` (sur `user_id, created_at DESC`)
- `idx_activities_unread` (sur `user_id, is_read` WHERE `is_read = false`)
- `idx_activities_data_gin` (GIN sur `activity_data`)

**RLS :** Activé

---

#### Table `notifications`

Notifications pour les apporteurs.

**Colonnes :**

| Nom          | Type        | Nullable | Défaut              | Description                            |
| ------------ | ----------- | -------- | ------------------- | -------------------------------------- |
| `id`         | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                     |
| `user_id`    | uuid        | Non      | -                   | Référence vers `apporteur_profiles.id` |
| `title`      | text        | Non      | -                   | Titre de la notification               |
| `message`    | text        | Non      | -                   | Message de la notification             |
| `type`       | text        | Non      | `'info'`            | Type de notification                   |
| `data`       | jsonb       | Oui      | -                   | Données supplémentaires (JSON)         |
| `is_read`    | boolean     | Oui      | `false`             | Indique si la notification a été lue   |
| `created_at` | timestamptz | Oui      | `now()`             | Date de création                       |
| `updated_at` | timestamptz | Oui      | `now()`             | Date de mise à jour                    |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** : `user_id` → `apporteur_profiles.id` (ON DELETE CASCADE)

**Index :**

- `notifications_pkey` (PRIMARY KEY sur `id`)
- `idx_notifications_user_id` (sur `user_id`)
- `idx_notifications_is_read` (sur `is_read`)
- `idx_notifications_created_at` (sur `created_at DESC`)
- `idx_notifications_user_read` (sur `user_id, is_read, created_at DESC`)
- `idx_notifications_user_type` (sur `user_id, type, created_at DESC`)

**RLS :** Activé

---

#### Table `monthly_stats`

Statistiques mensuelles par apporteur.

**Colonnes :**

| Nom                   | Type        | Nullable | Défaut              | Description                            |
| --------------------- | ----------- | -------- | ------------------- | -------------------------------------- |
| `id`                  | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                     |
| `apporteur_id`        | uuid        | Non      | -                   | Référence vers `apporteur_profiles.id` |
| `month_year`          | varchar     | Non      | -                   | Mois/année (format : `YYYY-MM`)        |
| `total_dossiers`      | integer     | Oui      | `0`                 | Nombre total de dossiers               |
| `total_economies`     | numeric     | Oui      | `0`                 | Total des économies générées           |
| `classement_position` | integer     | Oui      | -                   | Position dans le classement            |
| `created_at`          | timestamptz | Oui      | `now()`             | Date de création                       |
| `updated_at`          | timestamptz | Oui      | `now()`             | Date de mise à jour                    |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `apporteur_id, month_year`
- **FOREIGN KEY** : `apporteur_id` → `apporteur_profiles.id` (ON DELETE CASCADE)

**Index :**

- `monthly_stats_pkey` (PRIMARY KEY sur `id`)
- `monthly_stats_apporteur_id_month_year_key` (UNIQUE sur
  `apporteur_id, month_year`)
- `idx_monthly_stats_apporteur_id` (sur `apporteur_id`)
- `idx_monthly_stats_month_year` (sur `month_year`)
- `idx_monthly_stats_apporteur_month` (sur `apporteur_id, month_year`)

**RLS :** Activé

---

#### Table `wallet_accounts`

Comptes wallet pour apporteurs, brokers et plateforme.

**Colonnes :**

| Nom                 | Type              | Nullable | Défaut              | Description                                                                                                    |
| ------------------- | ----------------- | -------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `id`                | uuid              | Non      | `gen_random_uuid()` | Identifiant unique                                                                                             |
| `broker_id`         | uuid              | Non      | -                   | Référence vers `brokers.id`                                                                                    |
| `owner_type`        | wallet_owner_type | Non      | -                   | Type de propriétaire : `apporteur`, `broker`, `platform`                                                       |
| `owner_id`          | uuid              | Oui      | -                   | ID du propriétaire (si apporteur => `apporteur_profiles.id` ; si broker => `brokers.id` ; si platform => NULL) |
| `currency`          | text              | Non      | `'EUR'`             | Devise                                                                                                         |
| `balance_available` | numeric           | Non      | `0`                 | Solde disponible (doit être >= 0)                                                                              |
| `balance_pending`   | numeric           | Non      | `0`                 | Solde en attente (doit être >= 0)                                                                              |
| `created_at`        | timestamptz       | Non      | `now()`             | Date de création                                                                                               |
| `updated_at`        | timestamptz       | Non      | `now()`             | Date de mise à jour                                                                                            |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `broker_id, owner_type, owner_id, currency`
- **FOREIGN KEY** : `broker_id` → `brokers.id` (ON DELETE CASCADE)
- **CHECK** :
  - `balance_available >= 0`
  - `balance_pending >= 0`

**Index :**

- `wallet_accounts_pkey` (PRIMARY KEY sur `id`)
- `idx_wallet_accounts_broker_id` (sur `broker_id`)
- `idx_wallet_accounts_owner` (sur `owner_type, owner_id`)

**RLS :** Activé

---

#### Table `wallet_transactions`

Ledger immuable de toutes les transactions wallet.

**Colonnes :**

| Nom                 | Type                      | Nullable | Défaut              | Description                                               |
| ------------------- | ------------------------- | -------- | ------------------- | --------------------------------------------------------- |
| `id`                | uuid                      | Non      | `gen_random_uuid()` | Identifiant unique                                        |
| `broker_id`         | uuid                      | Non      | -                   | Référence vers `brokers.id`                               |
| `wallet_account_id` | uuid                      | Non      | -                   | Référence vers `wallet_accounts.id`                       |
| `dossier_id`        | uuid                      | Oui      | -                   | Référence vers `dossiers.id` (si lié à un dossier)        |
| `devis_id`          | uuid                      | Oui      | -                   | Référence vers `devis.id` (si lié à un devis)             |
| `type`              | wallet_transaction_type   | Non      | -                   | Type : `credit`, `debit`, `fee`, `payout`, `adjustment`   |
| `status`            | wallet_transaction_status | Non      | `'pending'`         | Statut : `pending`, `available`, `cancelled`              |
| `amount`            | numeric                   | Non      | -                   | Montant (toujours positif, le signe est porté par `type`) |
| `label`             | text                      | Non      | -                   | Libellé de la transaction                                 |
| `meta`              | jsonb                     | Oui      | -                   | Métadonnées (commission_rule_id, calcul, etc.)            |
| `created_at`        | timestamptz               | Non      | `now()`             | Date de création                                          |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** :
  - `broker_id` → `brokers.id` (ON DELETE CASCADE)
  - `wallet_account_id` → `wallet_accounts.id` (ON DELETE CASCADE)
  - `dossier_id` → `dossiers.id` (ON DELETE SET NULL)
  - `devis_id` → `devis.id` (ON DELETE SET NULL)
- **CHECK** : `amount > 0`

**Index :**

- `wallet_transactions_pkey` (PRIMARY KEY sur `id`)
- `idx_wallet_transactions_wallet_account_id` (sur `wallet_account_id`)
- `idx_wallet_transactions_broker_id` (sur `broker_id`)
- `idx_wallet_transactions_dossier_id` (sur `dossier_id`)
- `idx_wallet_transactions_devis_id` (sur `devis_id`)
- `idx_wallet_transactions_status` (sur `status`)
- `idx_wallet_transactions_created_at` (sur `created_at DESC`)

**RLS :** Activé

---

#### Table `commission_rules`

Règles de commission paramétrables par broker, apporteur ou produit.

**Colonnes :**

| Nom                    | Type                  | Nullable | Défaut              | Description                                                              |
| ---------------------- | --------------------- | -------- | ------------------- | ------------------------------------------------------------------------ |
| `id`                   | uuid                  | Non      | `gen_random_uuid()` | Identifiant unique                                                       |
| `broker_id`            | uuid                  | Non      | -                   | Référence vers `brokers.id`                                              |
| `scope`                | commission_rule_scope | Non      | `'default'`         | Portée : `default`, `apporteur_specific`, `product_specific`             |
| `apporteur_profile_id` | uuid                  | Oui      | -                   | Référence vers `apporteur_profiles.id` (si scope = `apporteur_specific`) |
| `insurance_product_id` | uuid                  | Oui      | -                   | Référence vers `insurance_products.id` (si scope = `product_specific`)   |
| `apporteur_share_pct`  | numeric               | Non      | `0`                 | Part vers l'apporteur (0-100%)                                           |
| `platform_fee_pct`     | numeric               | Non      | `0`                 | Part plateforme (0-100%)                                                 |
| `fixed_fee`            | numeric               | Oui      | `0`                 | Frais fixe                                                               |
| `min_fee`              | numeric               | Oui      | -                   | Frais minimum                                                            |
| `max_fee`              | numeric               | Oui      | -                   | Frais maximum                                                            |
| `effective_from`       | timestamptz           | Non      | `now()`             | Date d'effet                                                             |
| `effective_to`         | timestamptz           | Oui      | -                   | Date de fin d'effet                                                      |
| `created_at`           | timestamptz           | Non      | `now()`             | Date de création                                                         |
| `updated_at`           | timestamptz           | Non      | `now()`             | Date de mise à jour                                                      |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** :
  - `broker_id` → `brokers.id` (ON DELETE CASCADE)
  - `apporteur_profile_id` → `apporteur_profiles.id` (ON DELETE CASCADE)
  - `insurance_product_id` → `insurance_products.id` (ON DELETE CASCADE)
- **CHECK** :
  - `apporteur_share_pct >= 0 AND apporteur_share_pct <= 100`
  - `platform_fee_pct >= 0 AND platform_fee_pct <= 100`
  - `fixed_fee >= 0`
  - `min_fee >= 0` (si non NULL)
  - `max_fee >= 0` (si non NULL)
  - Logique de scope :
    `(scope = 'default' AND apporteur_profile_id IS NULL AND insurance_product_id IS NULL) OR (scope = 'apporteur_specific' AND apporteur_profile_id IS NOT NULL) OR (scope = 'product_specific' AND insurance_product_id IS NOT NULL)`

**Index :**

- `commission_rules_pkey` (PRIMARY KEY sur `id`)
- `idx_commission_rules_broker_id` (sur `broker_id`)
- `idx_commission_rules_apporteur` (sur `apporteur_profile_id` WHERE
  `apporteur_profile_id IS NOT NULL`)
- `idx_commission_rules_product` (sur `insurance_product_id` WHERE
  `insurance_product_id IS NOT NULL`)
- `idx_commission_rules_effective` (sur `effective_from, effective_to`)

**RLS :** Activé

---

#### Table `payout_requests`

Demandes de retrait des fonds wallet.

**Colonnes :**

| Nom                 | Type                  | Nullable | Défaut              | Description                                          |
| ------------------- | --------------------- | -------- | ------------------- | ---------------------------------------------------- |
| `id`                | uuid                  | Non      | `gen_random_uuid()` | Identifiant unique                                   |
| `wallet_account_id` | uuid                  | Non      | -                   | Référence vers `wallet_accounts.id`                  |
| `amount`            | numeric               | Non      | -                   | Montant demandé (doit être > 0)                      |
| `status`            | payout_request_status | Non      | `'requested'`       | Statut : `requested`, `approved`, `rejected`, `paid` |
| `iban_hash`         | text                  | Oui      | -                   | Hash de l'IBAN (pas en clair)                        |
| `payout_method_id`  | uuid                  | Oui      | -                   | ID de la méthode de paiement (pour plus tard)        |
| `created_at`        | timestamptz           | Non      | `now()`             | Date de création                                     |
| `updated_at`        | timestamptz           | Non      | `now()`             | Date de mise à jour                                  |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** : `wallet_account_id` → `wallet_accounts.id` (ON DELETE
  CASCADE)
- **CHECK** : `amount > 0`

**Index :**

- `payout_requests_pkey` (PRIMARY KEY sur `id`)
- `idx_payout_requests_wallet_account_id` (sur `wallet_account_id`)
- `idx_payout_requests_status` (sur `status`)

**RLS :** Activé

---

#### Table `client_locks`

**NOUVELLE TABLE** - Verrouillage des clients par apporteur pour éviter le
contournement. Un client soumis par un apporteur reste lié à cet apporteur
pendant 6 mois.

**Colonnes :**

| Nom            | Type        | Nullable | Défaut                         | Description                                                 |
| -------------- | ----------- | -------- | ------------------------------ | ----------------------------------------------------------- |
| `id`           | uuid        | Non      | `gen_random_uuid()`            | Identifiant unique                                          |
| `broker_id`    | uuid        | Non      | -                              | Référence vers `brokers.id`                                 |
| `apporteur_id` | uuid        | Non      | -                              | Référence vers `apporteur_profiles.id`                      |
| `dossier_id`   | uuid        | Oui      | -                              | Référence vers `dossiers.id`                                |
| `client_hash`  | varchar     | Non      | -                              | Hash SHA256 de (nom + prenom + date_naissance) en lowercase |
| `created_at`   | timestamptz | Non      | `now()`                        | Date de création                                            |
| `expires_at`   | timestamptz | Non      | `now() + '6 months'::interval` | Date d'expiration du lock (6 mois par défaut)               |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **FOREIGN KEY** :
  - `broker_id` → `brokers.id` (ON DELETE CASCADE)
  - `apporteur_id` → `apporteur_profiles.id` (ON DELETE CASCADE)
  - `dossier_id` → `dossiers.id` (ON DELETE SET NULL)

**RLS :** Activé

---

#### Table `broker_commission_settings`

**NOUVELLE TABLE** - Réglages de commission par défaut pour chaque courtier.

**Colonnes :**

| Nom                              | Type        | Nullable | Défaut              | Description                                                                     |
| -------------------------------- | ----------- | -------- | ------------------- | ------------------------------------------------------------------------------- |
| `id`                             | uuid        | Non      | `gen_random_uuid()` | Identifiant unique                                                              |
| `broker_id`                      | uuid        | Non      | -                   | Référence vers `brokers.id` (UNIQUE)                                            |
| `default_apporteur_share_pct`    | numeric     | Non      | `80`                | Pourcentage des frais courtier reversé aux apporteurs par défaut (0-100)        |
| `default_frais_courtier`         | numeric     | Non      | `15000`             | Frais de courtage par défaut en centimes (ex: 15000 = 150€)                     |
| `default_commission_exade_code`  | varchar     | Oui      | -                   | Code commission Exade par défaut                                                |
| `default_apporteur_fixed_amount` | numeric     | Oui      | -                   | Montant fixe en centimes pour la commission apporteur (remplace le % si défini) |
| `subscription_plan`              | varchar     | Non      | `'free'`            | Plan d'abonnement: `free` (7.5%), `pro` (3%), `unlimited` (0%)                  |
| `subscription_started_at`        | timestamptz | Oui      | -                   | Date de début de l'abonnement                                                   |
| `subscription_expires_at`        | timestamptz | Oui      | -                   | Date d'expiration de l'abonnement                                               |
| `stripe_customer_id`             | varchar     | Oui      | -                   | ID client Stripe                                                                |
| `stripe_subscription_id`         | varchar     | Oui      | -                   | ID abonnement Stripe                                                            |
| `created_at`                     | timestamptz | Non      | `now()`             | Date de création                                                                |
| `updated_at`                     | timestamptz | Non      | `now()`             | Date de mise à jour                                                             |

**Contraintes :**

- **PRIMARY KEY** : `id`
- **UNIQUE** : `broker_id`
- **FOREIGN KEY** : `broker_id` → `brokers.id` (ON DELETE CASCADE)
- **CHECK** :
  - `default_apporteur_share_pct` entre 0 et 100
  - `default_frais_courtier >= 0`
  - `subscription_plan` doit être dans `['free', 'pro', 'unlimited']`

**RLS :** Activé

---

### Schéma `auth`

Tables d'authentification Supabase (gérées par Supabase).

#### Table `users`

Utilisateurs du système d'authentification.

**Colonnes principales :**

- `id` (uuid, PRIMARY KEY)
- `email` (varchar, UNIQUE si `is_sso_user = false`)
- `phone` (text, UNIQUE)
- `encrypted_password` (varchar)
- `email_confirmed_at` (timestamptz)
- `phone_confirmed_at` (timestamptz)
- `confirmed_at` (timestamptz, généré)
- `last_sign_in_at` (timestamptz)
- `raw_app_meta_data` (jsonb)
- `raw_user_meta_data` (jsonb)
- `is_super_admin` (boolean)
- `is_sso_user` (boolean, défaut: `false`)
- `is_anonymous` (boolean, défaut: `false`)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- Et de nombreuses autres colonnes pour la gestion des tokens et
  authentification

**RLS :** Activé

#### Table `sessions`

Sessions utilisateur.

**Colonnes principales :**

- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FOREIGN KEY vers `users.id`)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `aal` (aal_level enum)
- `not_after` (timestamptz)
- `ip` (inet)
- `user_agent` (text)

**RLS :** Activé

#### Table `identities`

Identités associées aux utilisateurs (OAuth, etc.).

**Colonnes principales :**

- `id` (uuid, PRIMARY KEY)
- `user_id` (uuid, FOREIGN KEY vers `users.id`)
- `provider` (text)
- `provider_id` (text)
- `identity_data` (jsonb)
- `email` (text, généré)

**RLS :** Activé

#### Autres tables `auth` :

- `refresh_tokens` - Tokens de rafraîchissement
- `mfa_factors` - Facteurs d'authentification multi-facteurs
- `mfa_challenges` - Défis MFA
- `mfa_amr_claims` - Claims d'authentification MFA
- `oauth_clients` - Clients OAuth
- `oauth_authorizations` - Autorisations OAuth
- `oauth_consents` - Consentements OAuth
- `one_time_tokens` - Tokens à usage unique
- `flow_state` - État des flux d'authentification
- `sso_providers` - Fournisseurs SSO
- `sso_domains` - Domaines SSO
- `saml_providers` - Fournisseurs SAML
- `saml_relay_states` - États de relais SAML
- `instances` - Instances d'authentification
- `audit_log_entries` - Entrées d'audit
- `schema_migrations` - Migrations du schéma auth

---

### Schéma `storage`

Tables de stockage de fichiers Supabase.

#### Table `buckets`

Buckets de stockage.

**Colonnes principales :**

- `id` (text, PRIMARY KEY)
- `name` (text, UNIQUE)
- `public` (boolean)
- `file_size_limit` (bigint)
- `allowed_mime_types` (text[])
- `type` (buckettype enum: `STANDARD`, `ANALYTICS`, `VECTOR`)

**RLS :** Activé

#### Table `objects`

Objets (fichiers) stockés.

**Colonnes principales :**

- `id` (uuid, PRIMARY KEY)
- `bucket_id` (text, FOREIGN KEY vers `buckets.id`)
- `name` (text)
- `owner_id` (text)
- `metadata` (jsonb)
- `user_metadata` (jsonb)
- `path_tokens` (text[], généré)
- `level` (integer)

**RLS :** Activé

#### Autres tables `storage` :

- `migrations` - Migrations du schéma storage
- `prefixes` - Préfixes de stockage
- `s3_multipart_uploads` - Uploads multipart S3
- `s3_multipart_uploads_parts` - Parties d'uploads multipart
- `buckets_analytics` - Buckets analytiques
- `buckets_vectors` - Buckets vectoriels
- `vector_indexes` - Index vectoriels

---

### Schéma `vault`

Tables de gestion des secrets.

#### Table `secrets`

Secrets chiffrés.

**Colonnes principales :**

- `id` (uuid, PRIMARY KEY)
- `name` (text, UNIQUE si non NULL)
- `secret` (text, chiffré)
- `description` (text)
- `key_id` (uuid)
- `nonce` (bytea)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**RLS :** Désactivé

---

### Schéma `realtime`

Tables pour les fonctionnalités temps réel.

#### Table `messages`

Messages temps réel.

**Colonnes principales :**

- `id` (uuid)
- `inserted_at` (timestamp)
- `topic` (text)
- `extension` (text)
- `payload` (jsonb)
- `event` (text)
- `private` (boolean)

**PRIMARY KEY :** `(id, inserted_at)`

**RLS :** Activé

#### Autres tables `realtime` :

- `subscription` - Abonnements temps réel
- `schema_migrations` - Migrations du schéma realtime
- `messages_2025_09_17` à `messages_2025_09_21` - Tables partitionnées de
  messages

---

## Types Énumérés (Enums)

### `apporteur_statut`

- `actif`
- `inactif`
- `suspendu`

### `broker_status`

- `actif`
- `suspendu`
- `inactif`

### `broker_user_role`

- `owner`
- `admin`
- `member`

### `broker_apporteur_status`

- `actif`
- `inactif`
- `suspendu`

### `exade_environment`

- `stage`
- `prod`

### `document_source`

- `uploaded`
- `exade_generated`
- `system`

### `document_visibility`

- `apporteur`
- `broker_only`
- `admin_only`

### `wallet_owner_type`

- `apporteur`
- `broker`
- `platform`

### `wallet_transaction_type`

- `credit`
- `debit`
- `fee`
- `payout`
- `adjustment`

### `wallet_transaction_status`

- `pending`
- `available`
- `cancelled`

### `commission_rule_scope`

- `default`
- `apporteur_specific`
- `product_specific`

### `payout_request_status`

- `requested`
- `approved`
- `rejected`
- `paid`

### `dossier_statut`

- `en_attente`
- `devis_disponible`
- `devis_accepte`
- `refuse`
- `finalise`

### `buckettype`

- `STANDARD`
- `ANALYTICS`
- `VECTOR`

### `aal_level` (Authentication Assurance Level)

- `aal1`
- `aal2`
- `aal3`

### `factor_type`

- `totp`
- `webauthn`
- `phone`

### `factor_status`

- `unverified`
- `verified`

### `oauth_authorization_status`

- `pending`
- `approved`
- `denied`
- `expired`

### `oauth_client_type`

- `public`
- `confidential`

### `oauth_registration_type`

- `dynamic`
- `manual`

### `oauth_response_type`

- `code`

### `code_challenge_method`

- `s256`
- `plain`

### `one_time_token_type`

- `confirmation_token`
- `reauthentication_token`
- `recovery_token`
- `email_change_token_new`
- `email_change_token_current`
- `phone_change_token`

---

## Relations Principales

### Graphe des relations (schéma `public`)

```
brokers (courtiers/cabinets)
  ├── broker_users (1:N via broker_id) ← auth.users
  ├── broker_apporteurs (1:N via broker_id) ← apporteur_profiles
  ├── broker_invites (1:N via broker_id) ← auth.users (created_by_user_id)
  ├── broker_exade_configs (1:1 via broker_id)
  ├── dossiers (1:N via broker_id) ← PIVOT PRINCIPAL
  ├── wallet_accounts (1:N via broker_id)
  ├── wallet_transactions (1:N via broker_id)
  ├── commission_rules (1:N via broker_id)
  └── payout_requests (via wallet_accounts)

auth.users
  ├── apporteur_profiles (1:1 via user_id)
  │     ├── broker_apporteurs (1:N via apporteur_profile_id) ← brokers
  │     ├── dossiers (1:N via apporteur_id)
  │     ├── activities (1:N via user_id)
  │     ├── notifications (1:N via user_id)
  │     ├── monthly_stats (1:N via apporteur_id)
  │     └── wallet_accounts (1:N via owner_id, owner_type='apporteur')
  │
  └── broker_users (1:N via user_id) ← brokers
        └── dossiers (via broker_id)

dossiers (PIVOT PRINCIPAL - broker_id)
  ├── broker_id → brokers (NOT NULL)
  ├── insurance_product_id → insurance_products (NOT NULL)
  ├── client_infos (1:1 via dossier_id)
  ├── pret_data (1:1 via dossier_id)
  ├── devis (1:N via dossier_id)
  │     ├── devis_history (1:N via devis_id)
  │     └── wallet_transactions (1:N via devis_id)
  ├── documents (1:N via dossier_id)
  ├── process_steps (1:N via dossier_id)
  ├── activities (1:N via dossier_id)
  └── wallet_transactions (1:N via dossier_id)

insurance_products
  ├── dossiers (1:N via insurance_product_id)
  └── commission_rules (1:N via insurance_product_id)

wallet_accounts
  ├── wallet_transactions (1:N via wallet_account_id)
  └── payout_requests (1:N via wallet_account_id)
```

---

## Migrations

La base de données contient **100+ migrations** au total, organisées
chronologiquement :

### Migrations principales :

1. **Création des tables de base** (2025-09-25)
   - `create_dossiers_table`
   - `create_client_infos_table`
   - `create_pret_data_table`
   - `create_devis_table`
   - `create_process_steps_table`
   - `create_activities_table`
   - `create_documents_table`

2. **Configuration RLS** (2025-09-25)
   - `setup_rls_policies`

3. **Ajout de fonctionnalités** (2025-09-26)
   - `add_canonical_enum_statut_column`
   - `add_stats_columns_to_dossiers`
   - `create_notifications_table`
   - `create_monthly_stats_table`

4. **Améliorations et optimisations** (2025-09-27)
   - `add_performance_indexes`
   - `create_devis_history_table`
   - `add_is_couple_to_dossiers`
   - `create_activity_triggers`
   - `create_date_sync_triggers`

5. **Fonctionnalités récentes** (2025-10-23)
   - `add_extracted_fields_to_pret_data`
   - `add_client_enriched_fields`
   - `add_extraction_tracking_fields`
   - `add_last_login_at_to_apporteur_profiles`
   - `add_date_finalisation_to_dossiers`

6. **Architecture multi-courtiers et wallet** (2025-12-13)
   - `create_brokers_tables` - Création des tables brokers, broker_users,
     broker_apporteurs
   - `create_broker_exade_configs` - Configuration Exade par broker avec
     référence Vault
   - `create_insurance_products_and_modify_dossiers_fixed` - Produits
     d'assurance et modification dossiers
   - `create_wallet_system_complete` - Système wallet complet (accounts,
     transactions, rules, payouts)
   - `enhance_documents_table` - Amélioration documents (source, external_ref,
     visibility)
   - `create_rls_policies_multi_broker` - RLS policies pour multi-courtiers
   - `backfill_broker_data_safe` - Backfill des données existantes (broker GMB)

7. **Corrections critiques et améliorations** (2025-12-13)
   - `create_wallet_rpc_functions` - Fonctions RPC utiles (get_my_brokers,
     get_wallet_summary, get_applicable_commission_rule,
     recompute_wallet_balances)
   - `add_broker_exade_default_environment` - Environnement Exade par défaut +
     contrainte single enabled
   - `create_wallet_triggers_minimal` - Triggers wallet automatiques (devis
     accepté, dossier finalisé)
   - `fix_rls_policies_multi_broker` - Correction des policies RLS pour
     protection multi-courtiers
   - `fix_storage_policies_multi_broker` - Alignement des policies
     storage.objects avec documents
   - `add_statut_legacy_warning` - Gestion legacy statut vs statut_canon

8. **Corrections critiques de sécurité** (2025-12-13)
   - `fix_critical_security_issues` - Corrections des 6 vérifications critiques
     :
     - Rendre le bucket "documents" privé (était public)
     - Ajouter idempotence aux triggers wallet (éviter doublons)
     - Créer règles de commission par défaut 80/20 pour tous les brokers
     - Activer RLS sur devis_history avec policy appropriée

9. **Système d'invitations et onboarding** (2025-12-13)
   - `create_broker_invites_system` - Système d'invitations apporteurs :
     - Table `broker_invites` avec enum `broker_invite_type`
     - RPC `create_broker_invite`, `validate_broker_invite`,
       `consume_broker_invite`
     - RLS policies pour limiter l'accès aux owner/admin
   - `create_broker_onboarding_system` - Système d'onboarding courtiers :
     - Enum `broker_onboarding_status` (`created`, `exade_pending`, `ready`)
     - Champs onboarding dans `brokers` et `broker_exade_configs`
     - RPC `create_broker_for_current_user` pour création automatique
     - RPC `update_broker_onboarding_status` pour suivi onboarding
     - Trigger automatique pour mettre à jour onboarding_status quand Exade est
       configuré

---

## Notes Importantes

### Row Level Security (RLS)

La plupart des tables du schéma `public` ont RLS activé. Les politiques RLS
contrôlent l'accès aux données en fonction du rôle de l'utilisateur et de son
appartenance aux brokers.

**Architecture multi-courtiers :**

- Un utilisateur peut voir un dossier si :
  1. Il est **apporteur** lié au broker ET le dossier appartient à ce broker
  2. OU il est **broker_user** de ce broker
  3. OU il est **admin plateforme** (super_admin)

**Policies RLS détaillées :**

#### Table `dossiers`

- **SELECT** : `Multi-broker dossier access`
  - Vérifie l'accès via `broker_id` (apporteur actif du broker, broker_user, ou
    super_admin)
- **INSERT** : `Apporteurs can create dossiers for their broker`
  - Apporteur actif du broker, broker_user (owner/admin), ou super_admin
- **UPDATE** : `Multi-broker dossier update`
  - Même logique que SELECT

#### Table `documents`

- **SELECT/UPDATE** : `Multi-broker document access`
  - Vérifie l'accès via `dossier_id` → `broker_id`
  - Même logique que `dossiers`
- **INSERT** : `Multi-broker document insert`
  - Vérifie l'accès au dossier avant insertion

#### Table `storage.objects`

- **SELECT/INSERT/UPDATE/DELETE** :
  `Multi-broker document view/upload/update/delete`
  - Utilise `can_access_document_via_dossier(name)` qui vérifie
    `documents.storage_path` → `dossier_id` → `broker_id`
  - **Aligné avec `documents` RLS** pour éviter les fuites de données

**Fonctions helper RLS :**

- `is_broker_member(broker_uuid, user_uuid)` - Vérifie si un user est membre
  d'un broker
- `is_broker_apporteur(broker_uuid, apporteur_uuid)` - Vérifie si un apporteur
  est lié à un broker
- `get_user_broker_ids(user_uuid)` - Retourne les IDs des brokers d'un user
- `get_apporteur_broker_ids(apporteur_uuid)` - Retourne les IDs des brokers d'un
  apporteur
- `can_access_document_via_dossier(storage_path)` - Vérifie l'accès à un
  document via son dossier et broker

### Triggers

Plusieurs triggers sont configurés pour :

- Mettre à jour automatiquement `updated_at`
- Synchroniser les dates entre `devis` et `process_steps`
- Créer des activités automatiquement lors d'événements
- Créer des profils apporteur automatiquement

**Triggers Wallet :**

- **`trigger_devis_accepte_wallet`** (sur `devis`)
  - **Déclenchement** : Quand `devis.statut` passe à `'accepte'`
  - **Action** :
    1. Récupère la règle de commission applicable
    2. Calcule la commission apporteur (basée sur `economie_generee`)
    3. Crée une transaction `credit` avec `status = 'pending'`
    4. Met à jour `wallet_accounts.balance_pending`

- **`trigger_dossier_finalise_wallet`** (sur `dossiers`)
  - **Déclenchement** : Quand `dossiers.statut_canon` passe à `'finalise'`
  - **Action** :
    1. Passe toutes les transactions `pending` → `available`
    2. Met à jour `balance_pending` et `balance_available`
    3. Prélève automatiquement la "platform fee"
    4. Crée une transaction `fee` pour le broker

**Triggers Utilitaires :**

- **`sync_statut_legacy`** (sur `dossiers`)
  - Synchronise automatiquement `statut_canon` → `statut` pour compatibilité
    affichage
  - **À désactiver** une fois que tous les clients utilisent `statut_canon`

- **`ensure_single_enabled_exade_config`** (sur `broker_exade_configs`)
  - Garantit qu'il n'y a qu'une seule config enabled par `broker_id` +
    `environment`
  - Désactive automatiquement les autres configs quand une nouvelle est activée

### Fonctions RPC

Plusieurs fonctions RPC sont disponibles pour :

- Générer des numéros de dossier et devis
- Calculer les classements des apporteurs
- Gérer l'historique des devis
- Synchroniser les données

**Fonctions RPC Multi-Courtiers :**

- **`get_my_brokers()`**
  - Retourne tous les brokers accessibles par l'utilisateur connecté
  - Via `broker_users` (avec rôle) ou `broker_apporteurs` (si apporteur actif)
  - **Usage** : `SELECT * FROM get_my_brokers();`

- **`get_wallet_summary(broker_id, owner_type, owner_id)`**
  - Retourne le résumé wallet (balance_available, balance_pending,
    transaction_count, last_transaction_at)
  - **Usage** :
    `SELECT * FROM get_wallet_summary('broker-uuid'::UUID, 'apporteur'::wallet_owner_type, 'apporteur-uuid'::UUID);`

- **`get_applicable_commission_rule(broker_id, apporteur_id, insurance_product_id, at_time)`**
  - Retourne la règle de commission applicable selon la priorité :
    1. **apporteur_specific** (si `apporteur_id` fourni)
    2. **product_specific** (si `insurance_product_id` fourni)
    3. **default**
  - **Usage** :
    `SELECT * FROM get_applicable_commission_rule('broker-uuid'::UUID, 'apporteur-uuid'::UUID, 'product-uuid'::UUID, now());`

- **`recompute_wallet_balances(broker_id, owner_type, owner_id)`**
  - Recalcule les balances wallet à partir du ledger (utile en cas de désync)
  - **Usage** : `SELECT * FROM recompute_wallet_balances('broker-uuid'::UUID);`

**Fonctions RPC Invitations :**

- **`create_broker_invite(broker_id, invite_type, expires_in_hours, max_uses)`**
  - Crée une invitation pour un apporteur ou broker_user
  - Vérifie que l'utilisateur est owner/admin du broker
  - Retourne un token unique et la date d'expiration
  - **Usage** :
    `SELECT * FROM create_broker_invite('broker-uuid'::UUID, 'apporteur'::broker_invite_type, 168, 1);`

- **`validate_broker_invite(token)`**
  - Valide un token d'invitation
  - Vérifie expiration, révocation, nombre d'utilisations
  - Retourne `is_valid`, `broker_id`, `invite_type`, `reason` si invalide
  - **Usage** : `SELECT * FROM validate_broker_invite('token-string');`

- **`consume_broker_invite(token, user_id)`**
  - Consomme une invitation (incrémente `uses`)
  - Crée automatiquement le lien `broker_apporteurs` si
    `invite_type = 'apporteur'`
  - Crée le wallet account pour l'apporteur si nécessaire
  - **Usage** :
    `SELECT * FROM consume_broker_invite('token-string', auth.uid());`

**Fonctions RPC Onboarding :**

- **`create_broker_for_current_user(broker_name)`**
  - Crée un broker et lie l'utilisateur connecté comme owner
  - Crée automatiquement :
    - Le broker avec `onboarding_status = 'created'`
    - Le lien `broker_users` (role = 'owner')
    - La règle de commission par défaut (80/20)
    - Le wallet account du broker
  - Vérifie que l'utilisateur n'a pas déjà un broker
  - **Usage** : `SELECT * FROM create_broker_for_current_user('Mon Cabinet');`

- **`update_broker_onboarding_status(broker_id, status)`**
  - Met à jour le statut d'onboarding d'un broker
  - Met automatiquement `onboarding_completed_at` si status = 'ready'
  - **Usage** :
    `SELECT update_broker_onboarding_status('broker-uuid'::UUID, 'ready'::broker_onboarding_status);`

### Index de Performance

De nombreux index ont été créés pour optimiser les requêtes fréquentes :

- Index sur les clés étrangères
- Index sur les colonnes de recherche (email, statut, etc.)
- Index GIN sur les colonnes JSONB
- Index composites pour les requêtes complexes
- **Index multi-courtiers** : `idx_dossiers_broker_statut_date` pour requêtes
  filtrées par broker

### Gestion Legacy : `statut` vs `statut_canon`

**Problème identifié :**

- `statut` (varchar) : valeurs avec accents (`finalisé`, `refusé`)
- `statut_canon` (enum) : valeurs sans accents (`finalise`, `refuse`)
- **Risque de bugs subtils** (filtres, conditions)

**Solution appliquée :**

- ✅ **Commentaire** sur `dossiers.statut` : "LEGACY - Utiliser `statut_canon`"
- ✅ **Trigger `sync_statut_legacy`** : Synchronise automatiquement
  `statut_canon` → `statut` pour compatibilité affichage
- ✅ **Recommandation** : Utiliser uniquement `statut_canon` en logique métier

**À faire plus tard :**

- Désactiver le trigger une fois que tous les clients utilisent `statut_canon`
- Supprimer `statut` à terme (ou le garder en "display only")

### Architecture Multi-Courtiers

**Pivot principal :** `dossiers.broker_id` (NOT NULL)

**Principe fondamental :**

> **Tout est filtré par `broker_id`.**

Le "contexte broker" doit être :

- Soit choisi par l'utilisateur (dropdown)
- Soit déduit automatiquement (si un seul broker)

**Avantages :**

- Isolation des données par courtier
- Configuration Exade par courtier (avec secrets dans Vault)
- Wallet et commissions par courtier
- Export/import facile par courtier
- Scalabilité horizontale

**Backfill :**

- Un broker "GMB" a été créé automatiquement
- Tous les dossiers existants ont été assignés au broker GMB
- Les apporteurs existants ont été liés au broker GMB
- Des comptes wallet ont été créés pour les apporteurs et le broker
- Une règle de commission par défaut (80% apporteur, 20% plateforme) a été créée

**Améliorations Contraintes :**

- **`brokers.exade_default_environment`** : Environnement Exade par défaut
  (`stage` ou `prod`)
- **Trigger `ensure_single_enabled_exade_config`** : Garantit une seule config
  enabled par broker/environment

### Système Wallet

**Workflow automatique (implémenté) :**

1. **Quand `devis.statut = 'accepte'`** →
   - Crédit `pending` dans wallet de l'apporteur
   - Calcul automatique de la commission selon la règle applicable
   - Mise à jour de `balance_pending`

2. **Quand `dossiers.statut_canon = 'finalise'`** →
   - Move `pending` → `available`
   - Mise à jour de `balance_pending` et `balance_available`
   - Prélèvement automatique de la "platform fee"
   - Création d'une transaction `fee` pour le broker

**Double vérité : Ledger + Balances**

- **Ledger immuable** : `wallet_transactions` (source de vérité)
- **Balances calculées** : `wallet_accounts.balance_available/pending` (pour
  performance)
- **Fonction de recalcul** : `recompute_wallet_balances()` disponible en cas de
  désync

**À implémenter (côté application) :**

- Edge functions pour gérer les payouts
- Interface de gestion des règles de commission
- Dashboard wallet pour apporteurs et brokers

---

## Vérifications Critiques de Sécurité

### ✅ 1. Storage Bucket "documents" - PRIVÉ

**Status** : ✅ **CORRIGÉ**

- Le bucket `documents` est maintenant **privé** (`public = false`)
- Les accès doivent passer par les policies RLS `storage.objects`
- **CRITIQUE** : Si le bucket était public, les policies RLS ne servaient à rien

### ✅ 2. Test Fuite Inter-Brokers

**Status** : ✅ **Script de test créé**

Un script de test est disponible dans
`supabase/migrations/test_inter_broker_leak.sql` pour vérifier :

- Un courtier de Broker A ne voit aucun dossier de Broker B
- Un apporteur de Broker B ne voit aucun dossier de Broker A
- Impossible d'ouvrir un PDF de l'autre broker via URL (storage.objects RLS)

**Comment tester :**

1. Créer 2 brokers A et B
2. Créer un user courtier dans A, un apporteur dans B
3. Exécuter les requêtes du script avec chaque user
4. Vérifier que les résultats sont 0 (isolation complète)

### ✅ 3. Trigger Wallet : Idempotence

**Status** : ✅ **CORRIGÉ**

- Le trigger `create_wallet_transaction_on_devis_accepte()` vérifie maintenant
  qu'il n'existe pas déjà une transaction pour le même `devis_id`
- Si un devis repasse "accepte" deux fois (ou update multiple), **une seule
  transaction** est créée
- **Protection** : Vérification
  `WHERE devis_id = NEW.id AND type = 'credit' AND status IN ('pending', 'available')`

### ✅ 4. Règles de Commission : Cohérence 80/20

**Status** : ✅ **CORRIGÉ**

- Une règle de commission par défaut **80% apporteur / 20% plateforme** est
  créée automatiquement pour chaque broker actif
- Vérification lors d'un devis accepté + dossier finalisé :
  - `wallet_transactions` crée bien :
    - Un crédit pour l'apporteur (80% de l'économie générée)
    - Une fee pour la plateforme (20% de l'économie générée)
    - Les montants sont stockés dans `meta` pour traçabilité

### ✅ 5. Legacy Statut

**Status** : ✅ **DOCUMENTÉ**

- Le trigger `sync_statut_legacy` synchronise automatiquement `statut_canon` →
  `statut` pour compatibilité affichage
- **Recommandation** : Utiliser uniquement `statut_canon` en logique métier pour
  éviter les problèmes d'accents (`finalisé` vs `finalise`) et d'incohérences

### ✅ 6. devis_history RLS

**Status** : ✅ **CORRIGÉ**

- RLS activé sur `devis_history`
- Policy créée : Un user peut voir l'historique d'un devis s'il peut voir le
  devis lui-même (même logique que `devis`)

---

## Dev Switch : Impersonation Sécurisée (Documentation)

### Objectif

Permettre en développement de basculer rapidement entre rôles (broker_user vs
apporteur) **sans désactiver RLS** ni exposer la service role key au frontend.

### Principe

**Mode DEV uniquement** : Variable d'environnement
`DEV_IMPERSONATION_ENABLED=true` (dev only)

### Architecture Recommandée

#### Option A : Impersonation côté serveur (Recommandé)

1. **Table `dev_impersonation_tokens`** (optionnel, pour audit)
   - `id uuid pk`
   - `created_by_user_id uuid` (super_admin qui crée le token)
   - `target_user_id uuid` (user Supabase à impersonate)
   - `expires_at timestamptz` (5-15 minutes)
   - `created_at timestamptz`
   - **RLS** : Personne ne la lit directement côté client (utilisée uniquement
     via API route serveur)

2. **Page `/dev/switch`** (visible seulement si
   `DEV_IMPERSONATION_ENABLED=true` + super_admin)
   - Appelle RPC `get_my_brokers()` pour lister les brokers accessibles
   - Liste les users liés :
     - `broker_users` (courtiers) du broker choisi
     - `broker_apporteurs` (apporteurs) du broker choisi

3. **API Route serveur `/api/dev/impersonate`** (service role)
   - Génère une session pour `target_user_id`
   - Renvoie un URL de login (ou set-cookie)
   - Le navigateur ouvre ce lien → connecté en target user

#### Option B : Comptes test (Plus simple)

- Créer des comptes "test" (admin test, apporteur test)
- Le switch fait juste un logout/login programmatique (toujours auth normale)

### Broker Context Switch (Indépendant de l'utilisateur)

Même avec l'impersonation, l'app doit gérer un **broker courant**.

**Règle :**

- Si user a 1 broker → auto-select
- Si plusieurs → dropdown

**Stockage :**

- `localStorage: currentBrokerId`
- Éventuellement sync dans `user_metadata` plus tard

**Filtrage :**

- Toutes les queries côté app filtrent sur ce broker (et RLS protège en plus)

### Sécurité

**À éviter absolument :**

- ❌ Désactiver RLS pour aller vite
- ❌ Mettre la service role key côté frontend
- ❌ Faire un "impersonation" côté client sans contrôle

**Bonnes pratiques :**

- ✅ Impersonation uniquement côté serveur (API route avec service role)
- ✅ Vérifier `DEV_IMPERSONATION_ENABLED` avant d'exposer les endpoints
- ✅ Limiter l'accès à `/dev/switch` aux super_admins uniquement
- ✅ Tokens d'impersonation avec expiration courte (5-15 minutes)

### Utilisation

1. Se connecter en tant que super_admin
2. Accéder à `/dev/switch`
3. Choisir un broker
4. Choisir un user (broker_user ou apporteur lié au broker)
5. Cliquer sur "Switch" → redirection vers la session du target user

### Tests Automatisés

Un script de test peut être créé pour valider 90% de la sécurité multi-broker :

- Crée broker A et B
- Crée user courtier A, apporteur B
- Crée un dossier + doc dans B
- Vérifie que user A ne peut pas `select` ni obtenir un signed URL

---

_Document généré automatiquement à partir de la structure actuelle de la base de
données Supabase._
