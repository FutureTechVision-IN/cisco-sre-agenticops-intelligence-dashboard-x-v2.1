#!/usr/bin/env node
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';

// Function to query database via docker exec
const dbQuery = (sql, params = []) => {
  try {
    // Escape parameters for SQL
    const escapedParams = params.map(p => `'${p.replace(/'/g, "''")}'`);
    let query = sql;
    
    // Simple parameter substitution (for basic queries)
    if (params.length > 0) {
      params.forEach((param, i) => {
        query = query.replace('$' + (i + 1), escapedParams[i]);
      });
    }
    
    const result = execSync(`docker exec sre-postgres psql -U sre_user -d sre_database -t -A -c "${query}"`, 
      { encoding: 'utf8' });
    
    return result.trim().split('\n').filter(line => line.length > 0).map(line => {
      const cols = line.split('|');
      return cols;
    });
  } catch (error) {
    console.error('Database query failed:', error.message);
    return null;
  }
};

// Test authentication for all service accounts
const testAccounts = [
  'sre-admin',
  'sre-manager', 
  'sre-user',
  'sre-vp',
  'sre-director'
];

const password = 'password$$';
console.log('Testing authentication for all service accounts...\n');

for (const username of testAccounts) {
  console.log(`Testing ${username}:`);
  
  // Get user from database
  const userResult = dbQuery('SELECT id, username, password, role, email FROM users WHERE username = $1', [username]);
  
  if (!userResult || userResult.length === 0) {
    console.log('  ✗ User not found in database');
    continue;
  }
  
  const [id, dbUsername, hashedPassword, role, email] = userResult[0];
  console.log(`  ✓ User found: ${dbUsername} (${role})`);
  
  // Test password
  const isValid = bcrypt.compareSync(password, hashedPassword);
  if (isValid) {
    console.log('  ✓ Password verification successful');
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: id, username: dbUsername, role: role },
      process.env.SESSION_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );
    
    console.log('  ✓ JWT token generated successfully');
    console.log(`  ✓ Authentication complete for ${username}`);
  } else {
    console.log('  ✗ Password verification failed');
  }
  
  console.log();
}

console.log('Authentication testing complete.');