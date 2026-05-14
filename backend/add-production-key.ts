/**
 * Add Production API Key to System
 * Key is read from CISCO_CIRCUIT_WORKFLOW_KEY environment variable
 */

import { KeyConfigManager } from './ai-ml-key-integration.js';

const PRODUCTION_API_KEY = process.env.CISCO_CIRCUIT_WORKFLOW_KEY || '';
if (!PRODUCTION_API_KEY) { console.error('Set CISCO_CIRCUIT_WORKFLOW_KEY in .env before running this script.'); process.exit(1); }

async function addProductionKey() {
  console.log('\n' + '='.repeat(70));
  console.log('ADDING PRODUCTION API KEY TO SYSTEM');
  console.log('='.repeat(70));
  console.log(`Key: ${PRODUCTION_API_KEY}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(70) + '\n');

  // Add the key
  console.log('Adding API key to configuration manager...');
  const result = await KeyConfigManager.addKey(PRODUCTION_API_KEY);

  if (result.success && result.config) {
    console.log('✅ SUCCESS - API key added to system\n');
    console.log('Configuration Details:');
    console.log('-'.repeat(70));
    console.log(`ID: ${result.config.id}`);
    console.log(`Name: ${result.config.keyName}`);
    console.log(`Provider: ${result.config.provider}`);
    console.log(`Service: ${result.config.serviceName}`);
    console.log(`Environment: ${result.config.environment}`);
    console.log(`Status: ${result.config.status}`);
    console.log(`Usage Limit: ${result.config.usageLimit} calls/min (GLOBAL)`);
    console.log(`Current Usage: ${result.config.currentUsage}`);
    console.log(`Created: ${result.config.createdAt}`);
    console.log(`Last Validated: ${result.config.lastValidated}`);
    console.log('\nCapabilities:');
    result.config.capabilities.forEach(cap => console.log(`  ✓ ${cap}`));
    console.log('\nPermissions:');
    Object.entries(result.config.permissions).forEach(([key, value]) => {
      console.log(`  ${value ? '✓' : '✗'} ${key}`);
    });

    // Verify it's retrievable
    console.log('\n' + '-'.repeat(70));
    console.log('Verifying key retrieval...');
    const retrieved = KeyConfigManager.getKey(PRODUCTION_API_KEY);
    if (retrieved) {
      console.log('✅ Key successfully stored and retrievable');
    } else {
      console.log('❌ WARNING - Key was added but cannot be retrieved');
    }

    // List all keys
    console.log('\n' + '-'.repeat(70));
    console.log('All API keys in system:');
    const allKeys = KeyConfigManager.getAllKeys();
    console.log(`Total keys: ${allKeys.length}`);
    allKeys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key.keyName} (${key.status}) - ${key.environment}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ INTEGRATION COMPLETE');
    console.log('='.repeat(70));
    console.log('\nNext Steps:');
    console.log('1. ✓ API key validated and encrypted');
    console.log('2. ✓ Added to configuration manager');
    console.log('3. ✓ Ready for use with CiscoAPIClient');
    console.log('4. → Update admin routes to use this key');
    console.log('5. → Set up monitoring dashboards');
    console.log('6. → Configure environment variables (ENCRYPTION_KEY)');
    console.log('='.repeat(70) + '\n');

  } else {
    console.log('❌ FAILED to add API key\n');
    console.log('Errors:', result.errors.join(', '));
    process.exit(1);
  }
}

addProductionKey()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  });
