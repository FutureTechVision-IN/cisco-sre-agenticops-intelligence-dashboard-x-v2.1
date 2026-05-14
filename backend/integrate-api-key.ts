/**
 * API Key Integration Script
 * 
 * Validates and integrates the production AI/ML API key into the system
 * with comprehensive testing and monitoring setup.
 * 
 * Usage: ts-node backend/integrate-api-key.ts
 */

import {
  AIMLKeyValidator,
  KeyConfigManager,
  UsageMonitor,
  type APIKeyConfig,
  type ValidationResult,
} from './ai-ml-key-integration';

// ==========================================
// PRODUCTION API KEY (read from environment)
// ==========================================

const PRODUCTION_API_KEY = process.env.CISCO_CIRCUIT_WORKFLOW_KEY || '';
if (!PRODUCTION_API_KEY) { console.error('Set CISCO_CIRCUIT_WORKFLOW_KEY in .env before running this script.'); process.exit(1); }

// ==========================================
// INTEGRATION TESTS
// ==========================================

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: any;
}

class IntegrationTester {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        passed: true,
        message: 'Test passed',
        duration,
        details: result,
      });
      
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        name,
        passed: false,
        message,
        duration,
      });
      
      console.error(`❌ ${name} (${duration}ms): ${message}`);
    }
  }

  printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');

    if (failed > 0) {
      console.log('FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.message}`);
        });
      console.log('');
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// ==========================================
// MAIN INTEGRATION FLOW
// ==========================================

async function integrateAPIKey(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('AI/ML API KEY INTEGRATION');
  console.log('='.repeat(60));
  console.log(`Key: ${PRODUCTION_API_KEY}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60) + '\n');

  const tester = new IntegrationTester();

  // ==========================================
  // PHASE 1: FORMAT VALIDATION
  // ==========================================

  console.log('PHASE 1: Format Validation\n');

  await tester.runTest('Key Format Validation', async () => {
    const formatCheck = AIMLKeyValidator.validateFormat(PRODUCTION_API_KEY);
    if (!formatCheck.valid) {
      throw new Error(`Format validation failed: ${formatCheck.errors.join(', ')}`);
    }
    return formatCheck;
  });

  await tester.runTest('Key Metadata Parsing', async () => {
    const metadata = AIMLKeyValidator.parseKeyId(PRODUCTION_API_KEY);
    if (!metadata) {
      throw new Error('Failed to parse key metadata');
    }
    console.log(`    Provider: ${metadata.provider}`);
    console.log(`    Environment: ${metadata.environment}`);
    console.log(`    Purpose: ${metadata.purpose}`);
    console.log(`    Timestamp: ${metadata.timestamp}`);
    return metadata;
  });

  // ==========================================
  // PHASE 2: CONNECTIVITY TEST
  // ==========================================

  console.log('\nPHASE 2: Connectivity & Authentication\n');

  let validationResult: ValidationResult | null = null;

  await tester.runTest('API Connectivity Test', async () => {
    validationResult = await AIMLKeyValidator.testConnectivity(PRODUCTION_API_KEY);
    if (!validationResult.isValid) {
      throw new Error(`Connectivity test failed: ${validationResult.message}`);
    }
    console.log(`    Connectivity: ${validationResult.details.connectivity}`);
    console.log(`    Authentication: ${validationResult.details.authentication}`);
    console.log(`    Status: ${validationResult.status}`);
    return validationResult;
  });

  // ==========================================
  // PHASE 3: PERMISSION VALIDATION
  // ==========================================

  console.log('\nPHASE 3: Permission Validation\n');

  await tester.runTest('AI Insights Permission Check', async () => {
    if (!validationResult) throw new Error('No validation result available');
    const hasPermission = validationResult.details.permissions.includes('ai.insights.read');
    if (!hasPermission) throw new Error('Missing ai.insights.read permission');
    console.log(`    ✓ ai.insights.read`);
    return hasPermission;
  });

  await tester.runTest('Analytics Permission Check', async () => {
    if (!validationResult) throw new Error('No validation result available');
    const hasPermission = validationResult.details.permissions.includes('ai.analytics.read');
    if (!hasPermission) throw new Error('Missing ai.analytics.read permission');
    console.log(`    ✓ ai.analytics.read`);
    return hasPermission;
  });

  await tester.runTest('Predictions Permission Check', async () => {
    if (!validationResult) throw new Error('No validation result available');
    const hasPermission = validationResult.details.permissions.includes('ai.predictions.read');
    if (!hasPermission) throw new Error('Missing ai.predictions.read permission');
    console.log(`    ✓ ai.predictions.read`);
    return hasPermission;
  });

  await tester.runTest('Recommendations Permission Check', async () => {
    if (!validationResult) throw new Error('No validation result available');
    const hasPermission = validationResult.details.permissions.includes('ai.recommendations.read');
    if (!hasPermission) throw new Error('Missing ai.recommendations.read permission');
    console.log(`    ✓ ai.recommendations.read`);
    return hasPermission;
  });

  await tester.runTest('ML Inference Permission Check', async () => {
    if (!validationResult) throw new Error('No validation result available');
    const hasPermission = validationResult.details.permissions.includes('ml.models.inference');
    if (!hasPermission) throw new Error('Missing ml.models.inference permission');
    console.log(`    ✓ ml.models.inference`);
    return hasPermission;
  });

  // ==========================================
  // PHASE 4: CAPABILITY VERIFICATION
  // ==========================================

  console.log('\nPHASE 4: Capability Verification\n');

  const requiredCapabilities = [
    'trend-analysis',
    'anomaly-detection',
    'predictive-forecasting',
    'recommendation-engine',
  ];

  for (const capability of requiredCapabilities) {
    await tester.runTest(`Capability: ${capability}`, async () => {
      if (!validationResult) throw new Error('No validation result available');
      const hasCapability = validationResult.details.capabilities.includes(capability);
      if (!hasCapability) throw new Error(`Missing capability: ${capability}`);
      console.log(`    ✓ ${capability}`);
      return hasCapability;
    });
  }

  // ==========================================
  // PHASE 5: KEY INTEGRATION
  // ==========================================

  console.log('\nPHASE 5: Key Integration\n');

  let config: APIKeyConfig | undefined;

  await tester.runTest('Add Key to Configuration Manager', async () => {
    const result = await KeyConfigManager.addKey(PRODUCTION_API_KEY);
    if (!result.success) {
      throw new Error(`Failed to add key: ${result.errors.join(', ')}`);
    }
    config = result.config;
    console.log(`    Key ID: ${config?.id}`);
    console.log(`    Key Name: ${config?.keyName}`);
    console.log(`    Environment: ${config?.environment}`);
    console.log(`    Usage Limit: ${config?.usageLimit}`);
    return result;
  });

  await tester.runTest('Verify Key Retrieval', async () => {
    const retrievedConfig = KeyConfigManager.getKey(PRODUCTION_API_KEY);
    if (!retrievedConfig) {
      throw new Error('Failed to retrieve added key');
    }
    return retrievedConfig;
  });

  // ==========================================
  // PHASE 6: MONITORING SETUP
  // ==========================================

  console.log('\nPHASE 6: Monitoring Setup\n');

  await tester.runTest('Record Test Usage', async () => {
    if (!config) throw new Error('No config available');
    
    UsageMonitor.recordUsage({
      keyId: PRODUCTION_API_KEY,
      operation: 'test-validation',
      endpoint: '/api/v1/auth/validate',
      statusCode: 200,
      responseTime: 145,
      tokensUsed: 0,
      success: true,
    });

    const stats = UsageMonitor.getUsageStats(PRODUCTION_API_KEY);
    console.log(`    Total Usage: ${stats.total}`);
    console.log(`    Successful: ${stats.successful}`);
    console.log(`    Failed: ${stats.failed}`);
    return stats;
  });

  await tester.runTest('Verify Usage Stats Retrieval', async () => {
    const stats = UsageMonitor.getUsageStats(PRODUCTION_API_KEY);
    if (stats.total === 0) {
      throw new Error('No usage stats recorded');
    }
    return stats;
  });

  // ==========================================
  // PHASE 7: RATE LIMIT VALIDATION
  // ==========================================

  console.log('\nPHASE 7: Rate Limit Validation\n');

  await tester.runTest('Rate Limit Configuration', async () => {
    if (!validationResult) throw new Error('No validation result available');
    const rateLimit = validationResult.details.rateLimit;
    console.log(`    Limit: ${rateLimit.limit} requests/hour`);
    console.log(`    Remaining: ${rateLimit.remaining}`);
    console.log(`    Reset Time: ${new Date(rateLimit.resetTime).toLocaleString()}`);
    
    if (rateLimit.limit <= 0) {
      throw new Error('Invalid rate limit configuration');
    }
    return rateLimit;
  });

  // ==========================================
  // PHASE 8: OPERATIONAL TESTS
  // ==========================================

  console.log('\nPHASE 8: Operational Tests\n');

  await tester.runTest('Key Re-validation', async () => {
    const revalidation = await KeyConfigManager.revalidateKey(PRODUCTION_API_KEY);
    if (!revalidation.isValid) {
      throw new Error(`Re-validation failed: ${revalidation.message}`);
    }
    console.log(`    Re-validation Status: ${revalidation.status}`);
    return revalidation;
  });

  await tester.runTest('Status Update', async () => {
    const updated = KeyConfigManager.updateKeyStatus(PRODUCTION_API_KEY, 'active');
    if (!updated) {
      throw new Error('Failed to update key status');
    }
    return updated;
  });

  await tester.runTest('List All Keys', async () => {
    const allKeys = KeyConfigManager.getAllKeys();
    console.log(`    Total Keys in System: ${allKeys.length}`);
    allKeys.forEach(k => {
      console.log(`      - ${k.keyName} (${k.status})`);
    });
    return allKeys;
  });

  // ==========================================
  // FINAL SUMMARY
  // ==========================================

  tester.printSummary();

  if (config) {
    console.log('CONFIGURATION DETAILS:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(config, null, 2));
    console.log('='.repeat(60) + '\n');
  }

  const finalStats = UsageMonitor.getUsageStats(PRODUCTION_API_KEY);
  console.log('USAGE STATISTICS:');
  console.log('='.repeat(60));
  console.log(JSON.stringify(finalStats, null, 2));
  console.log('='.repeat(60) + '\n');

  // Check if integration was successful
  const results = tester.getResults();
  const allPassed = results.every(r => r.passed);

  if (allPassed) {
    console.log('✅ INTEGRATION SUCCESSFUL - API key is ready for production use\n');
    console.log('Next Steps:');
    console.log('1. Update environment variables with ENCRYPTION_KEY');
    console.log('2. Configure monitoring alerts for rate limits');
    console.log('3. Set up usage tracking dashboards');
    console.log('4. Document API key in configuration management');
    console.log('5. Test AI/ML insights functionality with the new key\n');
  } else {
    console.log('❌ INTEGRATION FAILED - Please review errors above\n');
    process.exit(1);
  }
}

// ==========================================
// EXECUTE INTEGRATION
// ==========================================

if (require.main === module) {
  integrateAPIKey().catch(error => {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  });
}

export { integrateAPIKey };
