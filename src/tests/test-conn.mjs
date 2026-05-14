import pg from 'pg';
const { Pool } = pg;

// Test 1: Using connection string
console.log('Test 1: Connection string format');
const pool1 = new Pool({
  connectionString: 'postgresql://sre_user:sre_password@127.0.0.1:5432/sre_database?sslmode=disable'
});

pool1.connect((err, client, release) => {
  if (err) {
    console.error('✗ Connection string failed:', err.message, 'Code:', err.code);
  } else {
    console.log('✓ Connection string worked');
    client.query('SELECT 1', (err, res) => {
      if (err) console.error('✗ Query failed:', err.message);
      else console.log('✓ Query succeeded');
      release();
      pool1.end();
    });
  }
});

setTimeout(() => {
  console.log('\nTest 2: Individual parameters');
  const pool2 = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'sre_user',
    password: 'sre_password',
    database: 'sre_database',
    ssl: false
  });

  pool2.connect((err, client, release) => {
    if (err) {
      console.error('✗ Individual params failed:', err.message, 'Code:', err.code);
    } else {
      console.log('✓ Individual params worked');
      client.query('SELECT 1', (err, res) => {
        if (err) console.error('✗ Query failed:', err.message);
        else console.log('✓ Query succeeded');
        release();
        pool2.end();
      });
    }
  });
}, 1000);

setTimeout(() => {
  process.exit(0);
}, 3000);
