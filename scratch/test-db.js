const { Pool } = require('pg');

console.log('Connecting with URL:', process.env.DIRECT_URL ? 'URL present' : 'URL missing');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
});

async function main() {
  try {
    const res = await pool.query('SELECT id, email, raw_user_meta_data, created_at FROM auth.users LIMIT 5;');
    console.log('Users found:', res.rows);
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
