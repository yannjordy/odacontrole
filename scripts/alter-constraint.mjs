import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local' });

const ref = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const client = new pg.Client({
  host: ref + '.supabase.co',
  port: 6543,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  connectionTimeoutMillis: 8000,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connected via pooler!');
  await client.query("ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_check;");
  await client.query("ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_role_check CHECK (role IN ('super_admin', 'admin', 'moderator', 'support', 'viewer'));");
  await client.query("UPDATE admin_roles SET role = 'viewer' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ela@gmail.com');");
  console.log('Done!');
  const { rows } = await client.query('SELECT u.email, r.role FROM admin_roles r JOIN auth.users u ON u.id = r.user_id');
  console.log(JSON.stringify(rows, null, 2));
  await client.end();
} catch(e) {
  console.log('Error:', e.message);
}
