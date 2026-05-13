-- Table des rôles admin
CREATE TABLE IF NOT EXISTS admin_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Logs des actions admin
CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: admin_roles
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Permet à un utilisateur connecté de lire son propre rôle
CREATE POLICY "users_read_own_role" ON admin_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Permet aux super_admin de tout faire sur admin_roles
CREATE POLICY "super_admin_all" ON admin_roles
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'super_admin'));

-- Logs : admin peut lire ses propres logs
CREATE POLICY "admin_read_own_logs" ON admin_logs
  FOR SELECT USING (auth.uid() = admin_id);

-- Logs : super_admin peut tout faire sur logs
CREATE POLICY "super_admin_all_logs" ON admin_logs
  USING (auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'super_admin'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_admin_roles_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_admin_roles_updated_at
  BEFORE UPDATE ON admin_roles FOR EACH ROW EXECUTE FUNCTION update_admin_roles_updated_at();
