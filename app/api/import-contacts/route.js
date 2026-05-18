import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    const ext = name.split('.').pop();

    let contacts = [];

    if (ext === 'csv') {
      contacts = parseCSV(buffer.toString('utf-8'));
    } else if (ext === 'xlsx' || ext === 'xls') {
      contacts = await parseExcel(buffer);
    } else if (ext === 'docx') {
      contacts = await parseDocx(buffer);
    } else if (ext === 'pdf') {
      contacts = await parsePdf(buffer);
    } else {
      return NextResponse.json({ error: `Format .${ext} non supporté. Utilisez CSV, XLSX, DOCX ou PDF.` }, { status: 400 });
    }

    return NextResponse.json({ success: true, contacts, total: contacts.length, filename: file.name });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function guessFields(row) {
  const map = {};
  const patterns = [
    { keys: ['nom', 'name', 'full_name', 'fullname', 'prénom', 'prenom', 'firstname', 'first_name'], field: 'full_name' },
    { keys: ['téléphone', 'telephone', 'tel', 'phone', 'mobile', 'portable', 'whatsapp', 'contact'], field: 'phone' },
    { keys: ['email', 'e-mail', 'mail', 'courriel'], field: 'email' },
    { keys: ['ville', 'city', 'town', 'localité', 'localite', 'lieu'], field: 'city' },
    { keys: ['entreprise', 'business', 'company', 'société', 'societe', 'boutique', 'shop', 'commerce', 'magasin'], field: 'business_name' },
    { keys: ['type', 'categorie', 'catégorie', 'category', 'secteur', 'industry'], field: 'business_type' },
    { keys: ['notes', 'commentaire', 'comment', 'note', 'remarque'], field: 'notes' },
    { keys: ['adresse', 'address'], field: 'address' },
    { keys: ['pays', 'country'], field: 'country' },
  ];
  for (const [k, v] of Object.entries(row)) {
    const kLower = k.toLowerCase().trim();
    for (const p of patterns) {
      if (p.keys.some(key => kLower.includes(key) || key.includes(kLower))) {
        map[p.field] = k;
        break;
      }
    }
  }
  return map;
}

function extractFields(rows) {
  if (!rows.length) return [];
  const headerMap = guessFields(rows[0]);
  const usedKeys = new Set(Object.values(headerMap));
  const extraKeys = Object.keys(rows[0]).filter(k => !usedKeys.has(k));

  return rows.map(row => {
    const contact = {};
    for (const [field, key] of Object.entries(headerMap)) {
      contact[field] = (row[key] || '').toString().trim();
    }
    contact._extra = {};
    for (const k of extraKeys) {
      if (row[k]) contact._extra[k] = row[k].toString().trim();
    }
    return contact;
  });
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (vals.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx]; });
      rows.push(row);
    }
  }
  return extractFields(rows);
}

async function parseExcel(buffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return extractFields(rows);
}

async function parseDocx(buffer) {
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4B) {
    throw new Error('Le fichier .docx est invalide ou corrompu. Vérifiez qu\'il s\'agit bien d\'un fichier .docx (pas .doc ancien format). Essayez avec un fichier .csv ou .xlsx.');
  }
  const mammoth = await import('mammoth');
  let result;
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (e) {
    if (e.message?.includes('could not find main document part')) {
      throw new Error('Le fichier semble être un ancien format .doc (Word 97-2003) et non un vrai .docx. Veuillez enregistrer le fichier au format .docx ou utiliser un fichier .csv/.xlsx.');
    }
    throw e;
  }
  const text = result.value;
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  const contacts = [];
  let current = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\d+[\)\.]/.test(trimmed) || trimmed.startsWith('-') || trimmed.startsWith('•')) {
      if (current.full_name || current.phone) {
        contacts.push(current);
        current = {};
      }
      const clean = trimmed.replace(/^[\d\s\)\.\-\•]+/, '').trim();
      if (clean.includes(':') || clean.includes(';')) {
        const [key, ...val] = clean.split(/[:;]/);
        const k = key.trim().toLowerCase();
        const v = val.join(':').trim();
        if (k.includes('nom')) current.full_name = v;
        else if (k.includes('tél') || k.includes('phon')) current.phone = v;
        else if (k.includes('emai')) current.email = v;
        else if (k.includes('ville') || k.includes('city')) current.city = v;
        else current.notes = clean;
      } else {
        current.notes = clean;
      }
    } else if (trimmed.includes(':') || trimmed.includes(';')) {
      const [key, ...val] = trimmed.split(/[:;]/);
      const k = key.trim().toLowerCase();
      const v = val.join(':').trim();
      if (k.includes('nom')) current.full_name = v;
      else if (k.includes('tél') || k.includes('phon')) current.phone = v;
      else if (k.includes('emai')) current.email = v;
      else if (k.includes('ville') || k.includes('city')) current.city = v;
      else if (k.includes('entr') || k.includes('bout')) current.business_name = v;
    }
  }
  if (current.full_name || current.phone) contacts.push(current);
  return contacts.filter(c => c.full_name || c.phone);
}

async function parsePdf(buffer) {
  const pdfParse = await import('pdf-parse');
  const data = await pdfParse(buffer);
  const text = data.text;
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];

  const contacts = [];
  let current = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (/^\d+[\)\.]\s/.test(line) || line.startsWith('-') || line.startsWith('•')) {
      if (current.full_name || current.phone) { contacts.push(current); current = {}; }
      const clean = line.replace(/^[\d\s\)\.\-\•]+/, '').trim();
      if (clean.includes(':') || clean.includes(';')) {
        const [key, ...val] = clean.split(/[:;]/);
        const k = key.trim().toLowerCase();
        const v = val.join(':').trim();
        if (k.includes('nom')) current.full_name = v;
        else if (k.includes('tél') || k.includes('phon')) current.phone = v;
        else if (k.includes('emai')) current.email = v;
        else if (k.includes('ville') || k.includes('city')) current.city = v;
        else { current.full_name = clean; }
      } else {
        current.full_name = clean;
      }
      let j = i + 1;
      while (j < lines.length && !/^\d+[\)\.]/.test(lines[j]) && !lines[j].startsWith('-') && !lines[j].startsWith('•')) {
        const sub = lines[j].trim();
        if (sub.includes(':') || sub.includes(';')) {
          const [key, ...val] = sub.split(/[:;]/);
          const k = key.trim().toLowerCase();
          const v = val.join(':').trim();
          if (k.includes('tél') || k.includes('phon')) current.phone = v;
          else if (k.includes('emai')) current.email = v;
          else if (k.includes('ville') || k.includes('city')) current.city = v;
          else if (k.includes('entr') || k.includes('bout')) current.business_name = v;
          else current.notes = (current.notes || '') + ' ' + sub;
        }
        j++;
      }
      i = j;
    } else {
      i++;
    }
  }
  if (current.full_name || current.phone) contacts.push(current);
  return contacts.filter(c => c.full_name || c.phone);
}
