import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: 'Clé API manquante' }, { status: 500 });
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
  }
}
