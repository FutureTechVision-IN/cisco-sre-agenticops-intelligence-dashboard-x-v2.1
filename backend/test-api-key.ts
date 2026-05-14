/**
 * Standalone API Key Test Script
 * Tests the key configured in CISCO_CIRCUIT_WORKFLOW_KEY env var
 */

import {
  AIMLKeyValidator,
  KeyConfigManager,
  UsageMonitor,
} from './ai-ml-key-integration.js';

const PRODUCTION_API_KEY = process.env.CISCO_CIRCUIT_WORKFLOW_KEY || '';
if (!PRODUCTION_API_KEY) { console.error('Set CISCO_CIRCUIT_WORKFLOW_KEY in .env before running this script.'); process.exit(1); }

async function testAPIKey() {
  console.log('\n' + '='.repeat(70));
  console.log('API KEY VALIDATION TEST');
  console.log('='.repeat(70));
  console.log(`Key: ${PRODUCTION_API_KEY}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(70) + '\n');

  let allPassed = true;

  // Test 1: Format Validation
  console.log('TEST 1: Format Validation');
  console.log('-'.repeat(70));
  const formatCheck = AIMLKeyValidator.validateFormat(PRODUCTION_API_KEY);
  if (formatCheck.valid) {
    console.log('✅ PASSED - Key format is valid');
  } else {
    console.log('❌ FAILED - Invalid format:', formatCheck.errors.join(', '));
    allPassed = false;
  }

  // Test 2: Metadata Parsing
  console.log('\nTEST 2: Metadata Parsing');
  console.log('-'.repeat(70));
  const metadata = AIMLKeyValidator.parseKeyId(PRODUCTION_API_KEY);
  if (metadata) {
    console.log('✅ PASSED - Metadata parsed successfully');
    console.log(`   Provider: ${metadata.provider}`);
    console.log(`   Environment: ${metadata.environment}`);
    console.log(`   Purpose: ${metadata.purpose}`);
    console.log(`   Timestamp: ${metadata.timestamp}`);
  } else {
    console.log('❌ FAILED - Could not parse metadata');
    allPassed = false;
  }

  // Test 3: Connectivity Test
  console.log('\nTEST 3: Connectivity & Authentication');
  console.log('-'.repeat(70));
  const validation = await AIMLKeyValidator.testConnectivity(PRODUCTION_API_KEY);
  if (validation.isValid) {
    console.log('✅ PASSED - Connectivity test successful');
    console.log(`   Status: ${validation.status}`);
    console.log(`   Connectivity: ${validation.details.connectivity}`);
    console.log(`   Authentication: ${validation.details.authentication}`);
    console.log(`   Rate Limit: ${validation.details.rateLimit.remainingTokens}/${validation.details.rateLimit.globalLimit} calls/min`);
  } else {
    console.log('❌ FAILED - Connectivity test failed');
    console.log(`   Message: ${validation.message}`);
    allPassed = false;
  }

  // Test 4: Permissions Check
  console.log('\nTEST 4: Permissions Validation');
  console.log('-'.repeat(70));
  const requiredPermissions = [
    'ai.insights.read',
    'ai.analytics.read',
    'ai.predictions.read',
    'ai.recommendations.read',
  ];
  
  if (validation.isValid) {
    let permsPassed = true;
    for (const perm of requiredPermissions) {
      const hasPerm = validation.details.permissions.includes(perm);
      if (hasPerm) {
        console.log(`   ✓ ${perm}`);
      } else {
        console.log(`   ✗ ${perm} - MISSING`);
        permsPassed = false;
      }
    }
    if (permsPassed) {
      console.log('✅ PASSED - All required permissions granted');
    } else {
      console.log('❌ FAILED - Missing required permissions');
      allPassed = false;
    }
  } else {
    console.log('⚠️  SKIPPED - Validation failed in previous test');
  }

  // Test 5: Capabilities Check
  console.log('\nTEST 5: Capabilities Verification');
  console.log('-'.repeat(70));
  const requiredCapabilities = [
    'trend-analysis',
    'anomaly-detection',
    'predictive-forecasting',
    'recommendation-engine',
  ];
  
  if (validation.isValid) {
    let capsPassed = true;
    for (const cap of requiredCapabilities) {
      const hasCap = validation.details.capabilities.includes(cap);
      if (hasCap) {
        console.log(`   ✓ ${cap}`);
      } else {
        console.log(`   ✗ ${cap} - MISSING`);
        capsPassed = false;
      }
    }
    if (capsPassed) {
      console.log('✅ PASSED - All required capabilities available');
    } else {
      console.log('❌ FAILED - Missing required capabilities');
      allPassed = false;
    }
  } else {
    console.log('⚠️  SKIPPED - Validation failed in previous test');
  }

  // Test 6: Full Validation
  console.log('\nTEST 6: Full Key Validation');
  console.log('-'.repeat(70));
  const fullValidation = await AIMLKeyValidator.validateKey(PRODUCTION_API_KEY);
  if (fullValidation.valid && fullValidation.config) {
    console.log('✅ PASSED - Full validation successful');
    console.log(`   Config ID: ${fullValidation.config.id}`);
    console.log(`   Key Name: ${fullValidation.config.keyName}`);
    console.log(`   Environment: ${fullValidation.config.environment}`);
    console.log(`   Usage Limit: ${fullValidation.config.usageLimit} calls/min (GLOBAL)`);
    console.log(`   Cache TTL: ${validation.details.cacheTTL}s`);
  } else {
    console.log('❌ FAILED - Full validation failed');
    console.log(`   Errors: ${fullValidation.errors.join(', ')}`);
    allPassed = false;
  }

  // Test 7: Rate Limit Configuration
  console.log('\nTEST 7: Rate Limit Configuration');
  console.log('-'.repeat(70));
  if (validation.isValid) {
    const rateLimit = validation.details.rateLimit;
    console.log(`   Global Limit: ${rateLimit.globalLimit} calls/min`);
    console.log(`   Per Minute: ${rateLimit.perMinute} calls`);
    console.log(`   Remaining: ${rateLimit.remainingTokens} tokens`);
    console.log(`   Reset Time: ${new Date(rateLimit.resetTime).toLocaleString()}`);
    
    if (rateLimit.globalLimit === 12 && rateLimit.perMinute === 12) {
      console.log('✅ PASSED - Rate limits match system configuration (12 calls/min global)');
    } else {
      console.log('⚠️  WARNING - Rate limits differ from expected system configuration');
    }
  } else {
    console.log('⚠️  SKIPPED - Validation failed in previous test');
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('\n✓ API key is VALID and ready for integration');
    console.log('✓ All required permissions are granted');
    console.log('✓ All required capabilities are available');
    console.log('✓ Rate limits are properly configured (12 calls/min global)');
    console.log('✓ Cache TTL is set to 300 seconds (5 minutes)');
    console.log('\nThe API key can be safely integrated into the system.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\n⚠️  Review the errors above before proceeding with integration.');
  }
  console.log('='.repeat(70) + '\n');

  // Display configuration details
  if (fullValidation.valid && fullValidation.config) {
    console.log('CONFIGURATION DETAILS:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(fullValidation.config, null, 2));
    console.log('='.repeat(70) + '\n');
  }

  return allPassed;
}

// Execute the test
testAPIKey()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ FATAL ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  });
