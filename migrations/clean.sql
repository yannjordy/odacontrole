-- ==========================================
-- ODAControl - NETTOYAGE + RÉINSTALLATION
-- ==========================================
-- Exécute CECI en premier pour supprimer
-- les tables partiellement créées
-- ==========================================

DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS distribution_campaigns CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS shops CASCADE;
DROP TABLE IF EXISTS onboarding_sessions CASCADE;
DROP TABLE IF EXISTS consent_records CASCADE;
DROP TABLE IF EXISTS contact_attempts CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS workflow_steps CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS agent_runs CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
