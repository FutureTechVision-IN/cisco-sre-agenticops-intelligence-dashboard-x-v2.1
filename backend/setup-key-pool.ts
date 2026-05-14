/**
 * Initialize API Key Pool with Multiple Keys
 * 
 * This script sets up load balancing across multiple API keys
 * to achieve higher throughput (e.g., 2 keys × 12 calls/min = 24 calls/min)
 */

import { initializeKeyPool, getKeyPoolManager } from './api-key-pool-manager.js';

// Define your API keys
const _wfKey = process.env.CISCO_CIRCUIT_WORKFLOW_KEY || '';
if (!_wfKey) { console.error('Set CISCO_CIRCUIT_WORKFLOW_KEY in .env before running this script.'); process.exit(1); }
const API_KEYS = [
  {
    keyId: _wfKey,
    apiKey: _wfKey,
    priority: 1, // Primary key
  },
  // Add your second API key here when available
  // {
  //   keyId: 'your-second-api-key-id',
  //   apiKey: 'your-second-api-key-value',
  //   priority: 1, // Same priority for equal load balancing
  // },
];

async function setupKeyPool() {
  console.log('\n' + '='.repeat(70));
  console.log('API KEY POOL INITIALIZATION');
  console.log('='.repeat(70) + '\n');

  // Initialize the pool
  initializeKeyPool(API_KEYS);

  const pool = getKeyPoolManager();

  // Display initial stats
  console.log('POOL CONFIGURATION:');
  console.log('-'.repeat(70));
  const stats = pool.getPoolStats();
  
  console.log(`Total Keys: ${stats.totalKeys}`);
  console.log(`Active Keys: ${stats.activeKeys}`);
  console.log(`Total Capacity: ${stats.totalCapacity} calls/min`);
  console.log(`Available Tokens: ${stats.availableTokens}`);
  console.log(`Pool Utilization: ${stats.poolUtilization.toFixed(1)}%\n`);

  console.log('KEY DETAILS:');
  console.log('-'.repeat(70));
  stats.keyStats.forEach((key, index) => {
    console.log(`${index + 1}. ${key.keyId}`);
    console.log(`   Status: ${key.status}`);
    console.log(`   Tokens: ${key.availableTokens}/${key.maxTokens}`);
    console.log(`   Total Calls: ${key.totalCalls}`);
    if (key.totalCalls > 0) {
      console.log(`   Success Rate: ${key.successRate.toFixed(1)}%`);
      console.log(`   Avg Response: ${key.avgResponseTime}ms`);
    }
    console.log('');
  });

  console.log('='.repeat(70));
  console.log('LOAD BALANCING STRATEGIES AVAILABLE:');
  console.log('='.repeat(70));
  console.log('• round-robin    - Distribute evenly across all keys');
  console.log('• least-loaded   - Use key with most available tokens (default)');
  console.log('• weighted       - Weighted random based on available tokens');
  console.log('• priority       - Use highest priority key first');
  console.log('='.repeat(70) + '\n');

  console.log('✅ Key pool initialized successfully!\n');
  console.log('Total API capacity: ' + stats.totalCapacity + ' calls/min');
  console.log('With ' + stats.activeKeys + ' active key(s)\n');

  if (stats.activeKeys > 1) {
    console.log('🚀 LOAD BALANCING ACTIVE - Distributing requests across multiple keys');
  } else {
    console.log('ℹ️  Single key mode - Add more keys to enable load balancing');
    console.log('   To add keys: Edit backend/setup-key-pool.ts and restart');
  }

  console.log('\n' + '='.repeat(70) + '\n');

  return stats;
}

// Run setup
if (require.main === module) {
  setupKeyPool()
    .then(() => {
      console.log('Pool setup complete. You can now use getKeyPoolManager() in your code.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error setting up key pool:', error);
      process.exit(1);
    });
}

export { setupKeyPool };
