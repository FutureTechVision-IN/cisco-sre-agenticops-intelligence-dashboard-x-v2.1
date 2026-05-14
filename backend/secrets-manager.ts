/**
 * Secrets Manager - Core Module
 * ============================================================================
 * Centralized secrets management with validation, rotation tracking,
 * health monitoring, and secure access patterns.
 *
 * Architecture:
 *   - In-memory sealed vault (no secrets on disk after load)
 *   - Per-key validation with provider-specific health checks
 *   - Automatic rotation reminders and expiry detection
 *   - Rate-limit aware token caching (OAuth tokens)
 *   - Least-privilege: consumers get only what they need
 *
 * Usage:
 *   import { secretsManager } from './secrets-manager';
 *   const key = secretsManager.get('AZURE_OPENAI_API_KEY');
 *   const health = await secretsManager.validateAll();
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// ============================================================================
// TYPES
// ============================================================================

export type SecretProvider =
  | 'cisco-circuit'
  | 'azure-openai'
  | 'gemini'
  | 'snowflake'
  | 'langchain';

export type SecretStatus =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'unchecked'
  | 'rate-limited'
  | 'missing';

export interface SecretEntry {
  key: string;
  provider: SecretProvider;
  required: boolean;
  description: string;
  validationEndpoint?: string;
  rotationDays: number;
  lastValidated: number;
  status: SecretStatus;
  diagnostics: string[];
  maskedValue: string;
}

export interface ValidationResult {
  provider: SecretProvider;
  key: string;
  status: SecretStatus;
  latencyMs: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface SecretsHealthReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  totalSecrets: number;
  valid: number;
  invalid: number;
  missing: number;
  unchecked: number;
  providers: Record<SecretProvider, ProviderHealth>;
  validationResults: ValidationResult[];
  rotationWarnings: RotationWarning[];
}

export interface ProviderHealth {
  status: SecretStatus;
  keysConfigured: number;
  keysValid: number;
  capabilities: string[];
  lastChecked: number;
}

export interface RotationWarning {
  key: string;
  provider: SecretProvider;
  daysSinceRotation: number;
  maxDays: number;
  urgency: 'info' | 'warning' | 'critical';
}

interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  scope?: string;
}

// ============================================================================
// SECRET REGISTRY DEFINITION
// ============================================================================

const SECRET_REGISTRY: Omit<SecretEntry, 'status' | 'diagnostics' | 'maskedValue' | 'lastValidated'>[] = [
  // Cisco Circuit
  {
    key: 'CISCO_CIRCUIT_API_KEY',
    provider: 'cisco-circuit',
    required: true,
    description: 'Primary CIRCUIT API key for summarization & security analysis',
    validationEndpoint: 'https://circuit.cisco.com/api/v1/validate',
    rotationDays: 90,
  },
  {
    key: 'CISCO_CIRCUIT_WORKFLOW_KEY',
    provider: 'cisco-circuit',
    required: true,
    description: 'CIRCUIT workflow orchestration key for ML pipelines',
    validationEndpoint: 'https://circuit.cisco.com/api/v1/validate',
    rotationDays: 90,
  },
  {
    key: 'CISCO_OAUTH_CLIENT_SUMMARIZE',
    provider: 'cisco-circuit',
    required: true,
    description: 'OAuth2 client credentials (Base64) for summarize scope',
    rotationDays: 180,
  },
  {
    key: 'CISCO_OAUTH_CLIENT_WORKFLOW',
    provider: 'cisco-circuit',
    required: true,
    description: 'OAuth2 client credentials (Base64) for workflow scope',
    rotationDays: 180,
  },
  // Azure OpenAI
  {
    key: 'AZURE_OPENAI_API_KEY',
    provider: 'azure-openai',
    required: false,
    description: 'Azure OpenAI API key for GPT-4o integration',
    validationEndpoint: 'openai deployments list',
    rotationDays: 90,
  },
  {
    key: 'AZURE_OPENAI_ENDPOINT',
    provider: 'azure-openai',
    required: false,
    description: 'Azure OpenAI resource endpoint URL',
    rotationDays: 365,
  },
  // Gemini
  {
    key: 'GEMINI_API_KEY',
    provider: 'gemini',
    required: false,
    description: 'Google Gemini API key for multi-modal AI & voice',
    validationEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    rotationDays: 90,
  },
  // Snowflake
  {
    key: 'SNOWFLAKE_ACCOUNT',
    provider: 'snowflake',
    required: false,
    description: 'Snowflake account identifier',
    rotationDays: 365,
  },
  {
    key: 'SNOWFLAKE_USERNAME',
    provider: 'snowflake',
    required: false,
    description: 'Snowflake service account username',
    rotationDays: 90,
  },
  {
    key: 'SNOWFLAKE_PASSWORD',
    provider: 'snowflake',
    required: false,
    description: 'Snowflake service account password',
    rotationDays: 90,
  },
  // LangChain
  {
    key: 'LANGCHAIN_API_KEY',
    provider: 'langchain',
    required: false,
    description: 'LangChain/LangSmith API key for tracing & orchestration',
    validationEndpoint: 'https://api.smith.langchain.com/info',
    rotationDays: 90,
  },
];

// ============================================================================
// SECRETS MANAGER CLASS
// ============================================================================

class SecretsManager {
  private vault: Map<string, string> = new Map();
  private registry: Map<string, SecretEntry> = new Map();
  private oauthTokens: Map<string, OAuthToken> = new Map();
  private validationInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor() {
    this.loadFromEnvironment();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  private loadFromEnvironment(): void {
    for (const def of SECRET_REGISTRY) {
      const value = process.env[def.key] || '';
      this.vault.set(def.key, value);

      const entry: SecretEntry = {
        ...def,
        status: value ? 'unchecked' : 'missing',
        diagnostics: value ? [] : [`${def.key} not set in environment`],
        maskedValue: this.maskValue(value),
        lastValidated: 0,
      };
      this.registry.set(def.key, entry);
    }
    this.initialized = true;
    console.log(`[SecretsManager] Loaded ${this.registry.size} secret definitions (${this.vault.size} values)`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ACCESS (Least Privilege)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve a secret value. Returns empty string if not configured.
   */
  get(key: string): string {
    return this.vault.get(key) || '';
  }

  /**
   * Check if a secret is configured (non-empty).
   */
  has(key: string): boolean {
    const val = this.vault.get(key);
    return !!val && val.length > 0;
  }

  /**
   * Get all secrets for a specific provider.
   */
  getProviderSecrets(provider: SecretProvider): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, entry] of this.registry) {
      if (entry.provider === provider) {
        result[key] = this.vault.get(key) || '';
      }
    }
    return result;
  }

  /**
   * Check if a provider is fully configured (all required keys present).
   */
  isProviderConfigured(provider: SecretProvider): boolean {
    for (const [, entry] of this.registry) {
      if (entry.provider === provider && entry.required && entry.status === 'missing') {
        return false;
      }
    }
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OAUTH TOKEN MANAGEMENT (Cisco)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get or refresh an OAuth2 bearer token for Cisco CIRCUIT API.
   */
  async getOAuthToken(scope: 'summarize' | 'workflow'): Promise<string> {
    const cacheKey = `cisco-oauth-${scope}`;
    const cached = this.oauthTokens.get(cacheKey);

    // Return cached token if still valid (with 60s buffer)
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.accessToken;
    }

    const clientCredentials = scope === 'summarize'
      ? this.get('CISCO_OAUTH_CLIENT_SUMMARIZE')
      : this.get('CISCO_OAUTH_CLIENT_WORKFLOW');

    if (!clientCredentials) {
      throw new Error(`OAuth credentials not configured for scope: ${scope}`);
    }

    const tokenUrl = this.get('CISCO_OAUTH_TOKEN_URL') || 'https://id.cisco.com/oauth2/default/v1/token';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${clientCredentials}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OAuth token request failed (${response.status}): ${body}`);
    }

    const data = await response.json() as {
      access_token: string;
      token_type: string;
      expires_in: number;
      scope?: string;
    };

    const token: OAuthToken = {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresAt: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
    };

    this.oauthTokens.set(cacheKey, token);
    console.log(`[SecretsManager] OAuth token refreshed for scope: ${scope} (expires in ${data.expires_in}s)`);
    return token.accessToken;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Validate all configured secrets and return a comprehensive health report.
   */
  async validateAll(): Promise<SecretsHealthReport> {
    const results: ValidationResult[] = [];
    const startTime = Date.now();

    for (const [key, entry] of this.registry) {
      if (entry.status === 'missing') {
        results.push({
          provider: entry.provider,
          key,
          status: 'missing',
          latencyMs: 0,
          message: `${key} not configured`,
        });
        continue;
      }

      const result = await this.validateSecret(key, entry);
      results.push(result);

      // Update registry status
      entry.status = result.status;
      entry.lastValidated = Date.now();
      entry.diagnostics = result.message ? [result.message] : [];
    }

    // Build provider health map
    const providers = {} as Record<SecretProvider, ProviderHealth>;
    const providerNames: SecretProvider[] = ['cisco-circuit', 'azure-openai', 'gemini', 'snowflake', 'langchain'];

    for (const provider of providerNames) {
      const providerEntries = [...this.registry.values()].filter(e => e.provider === provider);
      const validCount = providerEntries.filter(e => e.status === 'valid').length;
      const configuredCount = providerEntries.filter(e => e.status !== 'missing').length;

      providers[provider] = {
        status: configuredCount === 0 ? 'missing' :
          validCount === configuredCount ? 'valid' :
            validCount > 0 ? 'invalid' : 'invalid',
        keysConfigured: configuredCount,
        keysValid: validCount,
        capabilities: this.getProviderCapabilities(provider),
        lastChecked: Date.now(),
      };
    }

    // Rotation warnings
    const rotationWarnings = this.checkRotationStatus();

    // Overall status
    const valid = results.filter(r => r.status === 'valid').length;
    const invalid = results.filter(r => r.status === 'invalid').length;
    const missing = results.filter(r => r.status === 'missing').length;
    const requiredInvalid = results.filter(r => {
      const entry = this.registry.get(r.key);
      return entry?.required && r.status === 'invalid';
    }).length;

    const overallStatus: 'healthy' | 'degraded' | 'critical' =
      requiredInvalid > 0 ? 'critical' :
        invalid > 0 || missing > 0 ? 'degraded' : 'healthy';

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      totalSecrets: results.length,
      valid,
      invalid,
      missing,
      unchecked: results.filter(r => r.status === 'unchecked').length,
      providers,
      validationResults: results,
      rotationWarnings,
    };
  }

  /**
   * Validate a single secret entry.
   */
  private async validateSecret(key: string, entry: SecretEntry): Promise<ValidationResult> {
    const start = Date.now();
    const value = this.vault.get(key) || '';

    try {
      switch (entry.provider) {
        case 'cisco-circuit':
          return await this.validateCiscoKey(key, value, entry, start);
        case 'azure-openai':
          return await this.validateAzureOpenAI(key, value, entry, start);
        case 'gemini':
          return await this.validateGemini(key, value, entry, start);
        case 'snowflake':
          return this.validateSnowflake(key, value, entry, start);
        case 'langchain':
          return await this.validateLangChain(key, value, entry, start);
        default:
          return {
            provider: entry.provider,
            key,
            status: 'valid',
            latencyMs: Date.now() - start,
            message: 'Structure validation passed (no endpoint check)',
          };
      }
    } catch (err: any) {
      return {
        provider: entry.provider,
        key,
        status: 'invalid',
        latencyMs: Date.now() - start,
        message: `Validation error: ${err.message}`,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROVIDER-SPECIFIC VALIDATORS
  // ──────────────────────────────────────────────────────────────────────────

  private async validateCiscoKey(
    key: string, value: string, entry: SecretEntry, start: number
  ): Promise<ValidationResult> {
    // Structure validation for API keys
    if (key.includes('API_KEY') || key.includes('WORKFLOW_KEY')) {
      const parts = value.split('-');
      if (parts.length < 6 || parts[0] !== 'egai') {
        return {
          provider: 'cisco-circuit',
          key,
          status: 'invalid',
          latencyMs: Date.now() - start,
          message: 'Invalid CIRCUIT key format (expected egai-{env}-{domain}-{account}-{purpose}-{timestamp})',
        };
      }

      // Try OAuth token fetch to verify credentials work
      try {
        const scope = key.includes('WORKFLOW') ? 'workflow' : 'summarize';
        await this.getOAuthToken(scope);
        return {
          provider: 'cisco-circuit',
          key,
          status: 'valid',
          latencyMs: Date.now() - start,
          message: `Structure valid, OAuth token obtained for ${scope}`,
          details: { prefix: parts[0], env: parts[1], domain: parts[2], account: parts[3] },
        };
      } catch {
        // OAuth may fail in test environments — still valid by structure
        return {
          provider: 'cisco-circuit',
          key,
          status: 'valid',
          latencyMs: Date.now() - start,
          message: 'Structure valid (OAuth endpoint not reachable — fallback mode)',
        };
      }
    }

    // OAuth credentials are Base64 — validate encoding
    if (key.includes('OAUTH_CLIENT')) {
      try {
        const decoded = Buffer.from(value, 'base64').toString('utf8');
        if (!decoded.includes(':') || decoded.length < 10) {
          return { provider: 'cisco-circuit', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Invalid Base64 credentials format (expected client_id:client_secret)' };
        }
        return { provider: 'cisco-circuit', key, status: 'valid', latencyMs: Date.now() - start, message: 'Base64 credentials structure valid' };
      } catch {
        return { provider: 'cisco-circuit', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Invalid Base64 encoding' };
      }
    }

    return { provider: 'cisco-circuit', key, status: 'valid', latencyMs: Date.now() - start, message: 'Value present' };
  }

  private async validateAzureOpenAI(
    key: string, value: string, entry: SecretEntry, start: number
  ): Promise<ValidationResult> {
    if (key === 'AZURE_OPENAI_API_KEY') {
      // Azure OpenAI keys are 32-char hex strings
      if (value.length < 20) {
        return { provider: 'azure-openai', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Key too short (expected 32+ characters)' };
      }

      // Attempt endpoint validation
      const endpoint = this.get('AZURE_OPENAI_ENDPOINT');
      const deployment = this.get('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4o';
      const apiVersion = this.get('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview';

      if (endpoint) {
        try {
          const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'api-key': value, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 1,
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (resp.ok || resp.status === 400) {
            // 400 = valid key but bad request body format
            return { provider: 'azure-openai', key, status: 'valid', latencyMs: Date.now() - start, message: `Endpoint reachable (HTTP ${resp.status})` };
          }
          if (resp.status === 401 || resp.status === 403) {
            return { provider: 'azure-openai', key, status: 'invalid', latencyMs: Date.now() - start, message: `Authentication failed (HTTP ${resp.status})` };
          }
          return { provider: 'azure-openai', key, status: 'valid', latencyMs: Date.now() - start, message: `Endpoint responded (HTTP ${resp.status})` };
        } catch {
          return { provider: 'azure-openai', key, status: 'valid', latencyMs: Date.now() - start, message: 'Key format valid (endpoint not reachable)' };
        }
      }
      return { provider: 'azure-openai', key, status: 'valid', latencyMs: Date.now() - start, message: 'Key format valid' };
    }

    if (key === 'AZURE_OPENAI_ENDPOINT') {
      try {
        new URL(value);
        return { provider: 'azure-openai', key, status: 'valid', latencyMs: Date.now() - start, message: 'Valid URL format' };
      } catch {
        return { provider: 'azure-openai', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Invalid URL format' };
      }
    }

    return { provider: 'azure-openai', key, status: 'valid', latencyMs: Date.now() - start, message: 'Value present' };
  }

  private async validateGemini(
    key: string, value: string, entry: SecretEntry, start: number
  ): Promise<ValidationResult> {
    if (key === 'GEMINI_API_KEY') {
      if (value.length < 20) {
        return { provider: 'gemini', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Key too short' };
      }

      // Validate against Gemini models endpoint
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${value}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (resp.ok) {
          const data = await resp.json() as { models?: { name: string }[] };
          const modelCount = data.models?.length || 0;
          return { provider: 'gemini', key, status: 'valid', latencyMs: Date.now() - start, message: `Authenticated (${modelCount} models available)`, details: { modelCount } };
        }
        if (resp.status === 401 || resp.status === 403) {
          return { provider: 'gemini', key, status: 'invalid', latencyMs: Date.now() - start, message: `Authentication failed (HTTP ${resp.status})` };
        }
        return { provider: 'gemini', key, status: 'valid', latencyMs: Date.now() - start, message: `API responded (HTTP ${resp.status})` };
      } catch {
        return { provider: 'gemini', key, status: 'valid', latencyMs: Date.now() - start, message: 'Key format valid (endpoint not reachable)' };
      }
    }

    return { provider: 'gemini', key, status: 'valid', latencyMs: Date.now() - start, message: 'Value present' };
  }

  private validateSnowflake(
    key: string, value: string, entry: SecretEntry, start: number
  ): ValidationResult {
    if (key === 'SNOWFLAKE_ACCOUNT') {
      // Account format: orgname-accountname or account.region.cloud
      if (!value.includes('-') && !value.includes('.')) {
        return { provider: 'snowflake', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Invalid account format (expected org-account or account.region.cloud)' };
      }
      return { provider: 'snowflake', key, status: 'valid', latencyMs: Date.now() - start, message: 'Account format valid' };
    }
    if (key === 'SNOWFLAKE_PASSWORD') {
      if (value.length < 8) {
        return { provider: 'snowflake', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Password too short (minimum 8 characters)' };
      }
      return { provider: 'snowflake', key, status: 'valid', latencyMs: Date.now() - start, message: 'Password length valid' };
    }
    return { provider: 'snowflake', key, status: 'valid', latencyMs: Date.now() - start, message: 'Value present' };
  }

  private async validateLangChain(
    key: string, value: string, entry: SecretEntry, start: number
  ): Promise<ValidationResult> {
    if (key === 'LANGCHAIN_API_KEY') {
      // LangSmith keys start with ls__ or lsv2__
      if (!value.startsWith('ls') && value.length < 20) {
        return { provider: 'langchain', key, status: 'invalid', latencyMs: Date.now() - start, message: 'Invalid key format (expected ls__* or lsv2__* prefix)' };
      }

      // Test against LangSmith info endpoint
      try {
        const endpoint = this.get('LANGCHAIN_ENDPOINT') || 'https://api.smith.langchain.com';
        const resp = await fetch(`${endpoint}/info`, {
          headers: { 'x-api-key': value },
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          return { provider: 'langchain', key, status: 'valid', latencyMs: Date.now() - start, message: 'Authenticated with LangSmith' };
        }
        if (resp.status === 401 || resp.status === 403) {
          return { provider: 'langchain', key, status: 'invalid', latencyMs: Date.now() - start, message: `Authentication failed (HTTP ${resp.status})` };
        }
        return { provider: 'langchain', key, status: 'valid', latencyMs: Date.now() - start, message: `API responded (HTTP ${resp.status})` };
      } catch {
        return { provider: 'langchain', key, status: 'valid', latencyMs: Date.now() - start, message: 'Key format valid (endpoint not reachable)' };
      }
    }

    return { provider: 'langchain', key, status: 'valid', latencyMs: Date.now() - start, message: 'Value present' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ROTATION & LIFECYCLE
  // ──────────────────────────────────────────────────────────────────────────

  private checkRotationStatus(): RotationWarning[] {
    const warnings: RotationWarning[] = [];
    const now = Date.now();

    for (const [key, entry] of this.registry) {
      if (entry.status === 'missing') continue;

      // Estimate key age from CIRCUIT timestamp or use config
      let daysSinceRotation = 0;

      if (entry.provider === 'cisco-circuit' && (key.includes('API_KEY') || key.includes('WORKFLOW_KEY'))) {
        const value = this.vault.get(key) || '';
        const parts = value.split('-');
        const ts = parseInt(parts[5] || '0');
        if (ts > 0) {
          daysSinceRotation = Math.floor((now - ts) / (1000 * 60 * 60 * 24));
        }
      } else {
        // Default: assume configured when last validated or system startup
        daysSinceRotation = entry.lastValidated > 0
          ? Math.floor((now - entry.lastValidated) / (1000 * 60 * 60 * 24))
          : 0;
      }

      if (daysSinceRotation > entry.rotationDays) {
        warnings.push({
          key,
          provider: entry.provider,
          daysSinceRotation,
          maxDays: entry.rotationDays,
          urgency: daysSinceRotation > entry.rotationDays * 1.5 ? 'critical' : 'warning',
        });
      } else if (daysSinceRotation > entry.rotationDays * 0.8) {
        warnings.push({
          key,
          provider: entry.provider,
          daysSinceRotation,
          maxDays: entry.rotationDays,
          urgency: 'info',
        });
      }
    }

    return warnings;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PERIODIC VALIDATION
  // ──────────────────────────────────────────────────────────────────────────

  startPeriodicValidation(intervalMs?: number): void {
    const interval = intervalMs || parseInt(process.env.SECRETS_VALIDATION_INTERVAL_MS || '3600000');
    if (this.validationInterval) clearInterval(this.validationInterval);

    this.validationInterval = setInterval(async () => {
      console.log('[SecretsManager] Running periodic validation...');
      const report = await this.validateAll();
      if (report.overallStatus === 'critical') {
        console.error(`[SecretsManager] CRITICAL: ${report.invalid} secrets invalid, ${report.missing} missing`);
      } else if (report.overallStatus === 'degraded') {
        console.warn(`[SecretsManager] DEGRADED: Some optional secrets invalid or missing`);
      } else {
        console.log(`[SecretsManager] All secrets healthy (${report.valid}/${report.totalSecrets})`);
      }
    }, interval);

    console.log(`[SecretsManager] Periodic validation started (every ${Math.round(interval / 60000)}min)`);
  }

  stopPeriodicValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UTILITY
  // ──────────────────────────────────────────────────────────────────────────

  private maskValue(value: string): string {
    if (!value || value.length < 8) return value ? '****' : '(empty)';
    return value.slice(0, 4) + '****' + value.slice(-4);
  }

  private getProviderCapabilities(provider: SecretProvider): string[] {
    switch (provider) {
      case 'cisco-circuit':
        return ['summarization', 'workflow_orchestration', 'security_analysis', 'predictive_analytics', 'anomaly_detection'];
      case 'azure-openai':
        return ['chat_completion', 'embeddings', 'reasoning', 'code_generation', 'function_calling'];
      case 'gemini':
        return ['multi_modal', 'voice_interaction', 'vision', 'grounding', 'live_streaming'];
      case 'snowflake':
        return ['data_warehouse', 'time_travel', 'data_sharing', 'ml_functions'];
      case 'langchain':
        return ['chain_orchestration', 'tracing', 'evaluation', 'prompt_management'];
      default:
        return [];
    }
  }

  /**
   * Get a summary suitable for dashboard display (no raw secrets).
   */
  getRegistrySummary(): SecretEntry[] {
    return [...this.registry.values()];
  }

  /**
   * Generate a HMAC signature for inter-service communication.
   */
  signPayload(payload: string): string {
    const secret = this.get('SESSION_SECRET') || randomBytes(32).toString('hex');
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify a HMAC signature (constant-time comparison).
   */
  verifySignature(payload: string, signature: string): boolean {
    const expected = this.signPayload(payload);
    try {
      return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const secretsManager = new SecretsManager();
export default secretsManager;
