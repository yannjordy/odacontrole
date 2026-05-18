const { Client } = require('pg');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const PROJECT_REF = 'xjckbqbqxcwzcrlmuvzf';
const HOST = `db.${PROJECT_REF}.supabase.co`;
const PORT = 5432;
const DATABASE = 'postgres';
const USER = 'postgres';

async function askPassword() {
  return new Promise(resolve => {
    rl.question('Mot de passe PostgreSQL Supabase (voir Settings > Database) : ', answer => {
      resolve(answer.trim());
      rl.close();
    });
  });
}

async function run() {
  console.log('🔧 ODAControl - Migration Base de Données\n');
  
  const password = await askPassword();
  
  const client = new Client({
    host: HOST,
    port: PORT,
    database: DATABASE,
    user: USER,
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connecté à Supabase PostgreSQL\n');

    // Clean first
    console.log('🗑️ Nettoyage des anciennes tables...');
    await client.query('DROP TABLE IF EXISTS metrics CASCADE');
    await client.query('DROP TABLE IF EXISTS audit_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS distribution_campaigns CASCADE');
    await client.query('DROP TABLE IF EXISTS whatsapp_messages CASCADE');
    await client.query('DROP TABLE IF EXISTS shops CASCADE');
    await client.query('DROP TABLE IF EXISTS onboarding_sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS consent_records CASCADE');
    await client.query('DROP TABLE IF EXISTS contact_attempts CASCADE');
    await client.query('DROP TABLE IF EXISTS leads CASCADE');
    await client.query('DROP TABLE IF EXISTS workflow_steps CASCADE');
    await client.query('DROP TABLE IF EXISTS workflows CASCADE');
    await client.query('DROP TABLE IF EXISTS agent_runs CASCADE');
    await client.query('DROP TABLE IF EXISTS agents CASCADE');
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
    console.log('✅ Nettoyage terminé\n');
    
    // Read and execute migration
    const sql = fs.readFileSync(__dirname + '/migrations/install_complet.sql', 'utf8');
    console.log('📦 Création des tables...');
    await client.query(sql);
    console.log('✅ Migration terminée avec succès !\n');
    
    // Verify
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('📋 Tables créées :');
    rows.forEach(r => console.log(`   ✅ ${r.table_name}`));
    
  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
