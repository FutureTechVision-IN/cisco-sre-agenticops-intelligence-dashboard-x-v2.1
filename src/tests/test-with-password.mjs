import pg from 'pg';
const { Pool } = pg;

console.log('Testing connection with explicit password...');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'sre_user',
  password: 'sre_password',
  database: 'sre_database',
  ssl: false,
  connectionTimeoutMillis: 5000
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('✗ Connection failed:', err.message);
    console.error('Error details:', {
      code: err.code,
      severity: err.severity,
      detail: err.detail,
      hint: err.hint
    });
  } else {
    console.log('✓ Connection successful!');
    client.query('SELECT current_user, current_database(), version();', (err, res) => {
      if (err) {
        console.error('✗ Query failed:', err.message);
      } else {
        console.log('✓ Query succeeded:', res.rows[0]);
      }
      release();
      pool.end();
    });
  }
});

setTimeout(() => {
  console.log('Timeout reached');
  process.exit(0);
}, 8000);