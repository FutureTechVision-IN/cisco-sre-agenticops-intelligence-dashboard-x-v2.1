#!/usr/bin/env node

// Direct test of authentication without web server
import pkg from 'pg';
import bcryptjs from 'bcryptjs';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://sre_user:sre_password@127.0.0.1:5432/sre_dashboard'
});

async function testAuth() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT 1');
    console.log('✓ Connected to database');
    
    console.log('\nFetching sre-admin user...');
    const userRes = await pool.query('SELECT id, username, password, role FROM users WHERE username = $1', ['sre-admin']);
    
    if (userRes.rows.length === 0) {
      console.log('✗ User not found');
      process.exit(1);
    }
    
    const user = userRes.rows[0];
    console.log('✓ User found:', user.username, '(role:', user.role + ')');
    
    console.log('\nTesting password verification...');
    const testPassword = 'password$$';
    const match = await bcryptjs.compare(testPassword, user.password);
    
    if (match) {
      console.log('✓ Password matches!');
    } else {
      console.log('✗ Password does not match');
      console.log('  Stored hash:', user.password);
    }
    
    console.log('\nTesting all service accounts:');
    const accounts = ['sre-admin', 'sre-user', 'sre-manager', 'sre-director', 'sre-vp'];
    for (const account of accounts) {
      const res = await pool.query('SELECT username, role, password FROM users WHERE username = $1', [account]);
      if (res.rows.length > 0) {
        const userData = res.rows[0];
        const matches = await bcryptjs.compare(testPassword, userData.password);
        const status = matches ? '✓' : '✗';
        console.log(`  ${status} ${userData.username} (${userData.role})`);
      }
    }
    
    await pool.end();
    console.log('\n✓ All tests completed');
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error('  Code:', error.code);
    console.error('  Severity:', error.severity);
    process.exit(1);
  }
}

testAuth();
