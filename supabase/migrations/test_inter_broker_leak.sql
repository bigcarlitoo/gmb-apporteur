-- Script de test pour vérifier l'isolation inter-brokers
-- Ce script crée 2 brokers, des users/apporteurs, et vérifie qu'ils ne peuvent pas accéder aux données de l'autre

-- IMPORTANT : Ce script doit être exécuté avec un user ayant les droits nécessaires
-- Il simule les requêtes que ferait chaque user pour vérifier l'isolation

BEGIN;

-- ============================================
-- SETUP : Créer les données de test
-- ============================================

-- Créer 2 brokers
INSERT INTO brokers (id, name, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Broker A Test', 'actif'),
    ('00000000-0000-0000-0000-000000000002', 'Broker B Test', 'actif')
ON CONFLICT (id) DO NOTHING;

-- Note : Les users Supabase doivent être créés manuellement via auth.users
-- Ici on suppose qu'ils existent déjà avec ces IDs :
-- - user_courtier_a_id (pour broker A)
-- - user_apporteur_b_id (pour broker B)

-- Créer les liens broker_users et broker_apporteurs
-- (À adapter selon vos IDs réels)

-- Exemple pour broker A (courtier)
-- INSERT INTO broker_users (broker_id, user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'user_courtier_a_id', 'admin')
-- ON CONFLICT DO NOTHING;

-- Exemple pour broker B (apporteur)
-- INSERT INTO broker_apporteurs (broker_id, apporteur_profile_id, status)
-- VALUES ('00000000-0000-0000-0000-000000000002', 'apporteur_b_profile_id', 'actif')
-- ON CONFLICT DO NOTHING;

-- Créer un dossier dans Broker B
-- INSERT INTO dossiers (broker_id, apporteur_id, ...)
-- VALUES ('00000000-0000-0000-0000-000000000002', 'apporteur_b_profile_id', ...);

-- ============================================
-- TESTS À EFFECTUER (à exécuter avec chaque user)
-- ============================================

-- TEST 1 : User courtier A ne doit PAS voir les dossiers de Broker B
-- Exécuter avec auth.uid() = user_courtier_a_id
/*
SELECT COUNT(*) as dossiers_broker_b
FROM dossiers
WHERE broker_id = '00000000-0000-0000-0000-000000000002';
-- Résultat attendu : 0
*/

-- TEST 2 : Apporteur B ne doit PAS voir les dossiers de Broker A
-- Exécuter avec auth.uid() = user_apporteur_b_id
/*
SELECT COUNT(*) as dossiers_broker_a
FROM dossiers
WHERE broker_id = '00000000-0000-0000-0000-000000000001';
-- Résultat attendu : 0
*/

-- TEST 3 : Vérifier que les documents ne sont pas accessibles via storage
-- Ce test doit être fait côté application avec les signed URLs
-- Vérifier que :
-- - Un user de Broker A ne peut pas obtenir une signed URL pour un document de Broker B
-- - Les policies storage.objects bloquent l'accès

-- TEST 4 : Vérifier les wallet transactions
/*
-- User courtier A ne doit pas voir les transactions de Broker B
SELECT COUNT(*) as transactions_broker_b
FROM wallet_transactions
WHERE broker_id = '00000000-0000-0000-0000-000000000002';
-- Résultat attendu : 0
*/

-- ============================================
-- NETTOYAGE (optionnel, à exécuter après les tests)
-- ============================================
-- DELETE FROM dossiers WHERE broker_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
-- DELETE FROM broker_users WHERE broker_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
-- DELETE FROM broker_apporteurs WHERE broker_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
-- DELETE FROM brokers WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

COMMIT;










