const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createUser(email, password, displayName, role) {
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find(u => u.email === email);
  if (found) {
    console.log(`User ${email} already exists (id: ${found.id}), assigning role...`);
    await admin.from('admin_roles').upsert({ user_id: found.id, role, created_by: found.id }, { onConflict: 'user_id' });
    if (role === 'super_admin') {
      await admin.auth.admin.updateUserById(found.id, { user_metadata: { admin_role: 'super_admin' } });
    }
    console.log(`Role '${role}' assigned to ${email}`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error) {
    console.error(`Failed to create ${email}:`, error.message);
    return;
  }

  console.log(`Created ${email} (id: ${data.user.id})`);

  await admin.from('admin_roles').upsert({ user_id: data.user.id, role, created_by: data.user.id }, { onConflict: 'user_id' });
  if (role === 'super_admin') {
    await admin.auth.admin.updateUserById(data.user.id, { user_metadata: { admin_role: 'super_admin' } });
  }
  console.log(`Role '${role}' assigned to ${email}`);
}

async function main() {
  await createUser('rosine@gmail.com', 'rosine123', 'Rosine Admin', 'admin');
  await createUser('ela@gmail.com', 'ela123', 'Ela Viewer', 'viewer');
  console.log('Done!');
}

main().catch(console.error);
