import pg from 'pg';
const { Pool } = pg;

console.log('Testing connection without password (trust auth)...');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'sre_user',
  database: 'sre_database',
  ssl: false
  // No password field - trust auth
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
        // Test if users table exists
        client.query('SELECT COUNT(*) FROM users;', (err, res2) => {
          if (err) {
            console.error('✗ Users query failed:', err.message);
          } else {
            console.log('✓ Users table accessible, count:', res2.rows[0].count);
          }
          release();
          pool.end();
        });
      }
    });
  }
});

setTimeout(() => {
  process.exit(0);
}, 3000);