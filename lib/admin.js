import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminClient = null;

export function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured in .env.local');
  }
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export async function verifierAdmin(userId) {
  if (!userId) return false;
  try {
    const { data } = await getAdminClient()
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    return data?.role || false;
  } catch { return false; }
}
