import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  try {
    const uid = req.headers.get('x-admin-id');
    if (!uid) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existing } = await admin.from('admin_roles').select('user_id').eq('user_id', uid).maybeSingle();
    if (existing) {
      return NextResponse.json({ exists: true, message: 'Déjà admin' });
    }

    const { data: anyAdmin } = await admin.from('admin_roles').select('user_id').limit(1);
    if (anyAdmin && anyAdmin.length > 0) {
      return NextResponse.json({ exists: true, message: 'Un admin existe déjà' });
    }

    await admin.auth.admin.updateUserById(uid, {
      user_metadata: { admin_role: 'super_admin' },
    });

    const { error: insErr } = await admin.from('admin_roles').insert({
      user_id: uid, role: 'super_admin', created_by: uid,
    });

    if (insErr) {
      return NextResponse.json({ success: true, role: 'super_admin', warning: 'Table admin_roles non créée, mais rôle stocké dans les métadonnées' });
    }

    return NextResponse.json({ success: true, role: 'super_admin' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
