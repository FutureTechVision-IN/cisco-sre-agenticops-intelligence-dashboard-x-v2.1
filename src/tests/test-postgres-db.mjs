import pg from 'pg';
const { Pool } = pg;

console.log('Testing connection to postgres database...');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'sre_user',
  password: 'sre_password',
  database: 'postgres',
  ssl: false
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('✗ Connection failed:', err.message, 'Code:', err.code);
  } else {
    console.log('✓ Connection successful!');
    client.query('SELECT current_user, current_database();', (err, res) => {
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
  process.exit(0);
}, 3000);