/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    CISCO.COM HOSTING CONFIGURATION                            ║
 * ║              Cisco SRE AgenticOps Intelligence Dashboard                       ║
 * ║                          Version 1.1.0                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This configuration file contains all host details, server settings, and 
 * Cisco-specific parameters required for deploying the application on cisco.com.
 * 
 * DEPLOYMENT CHECKLIST:
 * 1. Update all [PLACEHOLDER] values with actual Cisco infrastructure details
 * 2. Configure SSL/TLS certificates paths
 * 3. Set up load balancer endpoints
 * 4. Configure Cisco SSO/OAuth integration
 * 5. Update database connection strings
 * 6. Set appropriate environment (staging/production)
 * 
 * SUPPORT: Contact SRE Team for infrastructure access and credentials
 */

// =============================================================================
// DEPLOYMENT ENVIRONMENT
// =============================================================================

export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export const DEPLOYMENT_ENV: DeploymentEnvironment = 
  (process.env.DEPLOYMENT_ENV as DeploymentEnvironment) || 'production';

// =============================================================================
// SERVER HOST CONFIGURATION
// =============================================================================

export interface HostConfig {
  /** Primary server hostname */
  hostname: string;
  /** Server IP address (internal) */
  internalIp: string;
  /** External IP (load balancer) */
  externalIp: string;
  /** Primary application port */
  port: number;
  /** HTTPS port */
  httpsPort: number;
  /** Admin/management port */
  adminPort: number;
  /** Health check port */
  healthPort: number;
}

export const HOST_CONFIG: Record<DeploymentEnvironment, HostConfig> = {
  development: {
    hostname: 'localhost',
    internalIp: '127.0.0.1',
    externalIp: '127.0.0.1',
    port: 8001,
    httpsPort: 8443,
    adminPort: 9001,
    healthPort: 8081,
  },
  staging: {
    // ═══════════════════════════════════════════════════════════════════════
    // STAGING ENVIRONMENT - Update with Cisco staging server details
    // ═══════════════════════════════════════════════════════════════════════
    hostname: process.env.STAGING_HOSTNAME || 'sre-staging.cisco.com',
    internalIp: process.env.STAGING_INTERNAL_IP || '10.0.1.100',
    externalIp: process.env.STAGING_EXTERNAL_IP || '172.16.1.100',
    port: parseInt(process.env.STAGING_PORT || '8000'),
    httpsPort: parseInt(process.env.STAGING_HTTPS_PORT || '443'),
    adminPort: parseInt(process.env.STAGING_ADMIN_PORT || '9000'),
    healthPort: parseInt(process.env.STAGING_HEALTH_PORT || '8080'),
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION ENVIRONMENT - https://sre.cisco.com/fnip/dashboard
    // ═══════════════════════════════════════════════════════════════════════
    hostname: process.env.PROD_HOSTNAME || 'sre.cisco.com',
    internalIp: process.env.PROD_INTERNAL_IP || '10.0.0.100',
    externalIp: process.env.PROD_EXTERNAL_IP || '172.16.0.100',
    port: parseInt(process.env.PROD_PORT || '8000'),
    httpsPort: parseInt(process.env.PROD_HTTPS_PORT || '443'),
    adminPort: parseInt(process.env.PROD_ADMIN_PORT || '9000'),
    healthPort: parseInt(process.env.PROD_HEALTH_PORT || '8080'),
  },
};

// =============================================================================
// CISCO API ENDPOINTS
// =============================================================================

export interface CiscoApiConfig {
  /** Circuit API base URL */
  circuitApiUrl: string;
  /** Circuit API Key - KEEP SECURE */
  circuitApiKey: string;
  /** Field Notice API URL */
  fieldNoticeApiUrl: string;
  /** PSIRT (Security) API URL */
  psirtApiUrl: string;
  /** Bug API URL */
  bugApiUrl: string;
  /** EoX (End of Life) API URL */
  eoxApiUrl: string;
  /** Support API URL */
  supportApiUrl: string;
  /** API timeout in milliseconds */
  timeout: number;
  /** Rate limit (requests per minute) */
  rateLimit: number;
}

export const CISCO_API_CONFIG: Record<DeploymentEnvironment, CiscoApiConfig> = {
  development: {
    circuitApiUrl: 'https://api-sandbox.cisco.com/circuit/v1',
    circuitApiKey: process.env.CISCO_CIRCUIT_API_KEY || '[DEV_API_KEY]',
    fieldNoticeApiUrl: 'https://api-sandbox.cisco.com/fieldnotice/v1',
    psirtApiUrl: 'https://api-sandbox.cisco.com/security/advisories/v2',
    bugApiUrl: 'https://api-sandbox.cisco.com/bug/v2',
    eoxApiUrl: 'https://api-sandbox.cisco.com/supporttools/eox/rest/5',
    supportApiUrl: 'https://api-sandbox.cisco.com/support/v1',
    timeout: 30000,
    rateLimit: 100,
  },
  staging: {
    circuitApiUrl: process.env.CIRCUIT_API_URL || 'https://api-staging.cisco.com/circuit/v1',
    circuitApiKey: process.env.CISCO_CIRCUIT_API_KEY || '[STAGING_API_KEY]',
    fieldNoticeApiUrl: process.env.FN_API_URL || 'https://api-staging.cisco.com/fieldnotice/v1',
    psirtApiUrl: process.env.PSIRT_API_URL || 'https://api-staging.cisco.com/security/advisories/v2',
    bugApiUrl: process.env.BUG_API_URL || 'https://api-staging.cisco.com/bug/v2',
    eoxApiUrl: process.env.EOX_API_URL || 'https://api-staging.cisco.com/supporttools/eox/rest/5',
    supportApiUrl: process.env.SUPPORT_API_URL || 'https://api-staging.cisco.com/support/v1',
    timeout: 30000,
    rateLimit: 500,
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION CISCO API ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════
    circuitApiUrl: process.env.CIRCUIT_API_URL || 'https://api.cisco.com/circuit/v1',
    circuitApiKey: process.env.CISCO_CIRCUIT_API_KEY || '[PRODUCTION_API_KEY_REQUIRED]',
    fieldNoticeApiUrl: process.env.FN_API_URL || 'https://api.cisco.com/fieldnotice/v1',
    psirtApiUrl: process.env.PSIRT_API_URL || 'https://api.cisco.com/security/advisories/v2',
    bugApiUrl: process.env.BUG_API_URL || 'https://api.cisco.com/bug/v2',
    eoxApiUrl: process.env.EOX_API_URL || 'https://api.cisco.com/supporttools/eox/rest/5',
    supportApiUrl: process.env.SUPPORT_API_URL || 'https://api.cisco.com/support/v1',
    timeout: 15000,
    rateLimit: 1000,
  },
};

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

export interface DatabaseConfig {
  /** PostgreSQL connection URL */
  connectionUrl: string;
  /** Database host */
  host: string;
  /** Database port */
  port: number;
  /** Database name */
  database: string;
  /** Database username */
  username: string;
  /** Database password - KEEP SECURE */
  password: string;
  /** SSL mode */
  sslMode: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  /** Connection pool minimum */
  poolMin: number;
  /** Connection pool maximum */
  poolMax: number;
  /** Idle timeout in milliseconds */
  idleTimeout: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
}

export const DATABASE_CONFIG: Record<DeploymentEnvironment, DatabaseConfig> = {
  development: {
    connectionUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard',
    host: 'localhost',
    port: 5432,
    database: 'cisco_sre_dashboard',
    username: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    sslMode: 'disable',
    poolMin: 2,
    poolMax: 10,
    idleTimeout: 30000,
    connectionTimeout: 5000,
  },
  staging: {
    connectionUrl: process.env.DATABASE_URL || 'postgresql://sre_user@staging-db.cisco.com:5432/sre_dashboard_staging',
    host: process.env.DB_HOST || 'staging-db.cisco.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sre_dashboard_staging',
    username: process.env.DB_USERNAME || 'sre_user',
    password: process.env.DB_PASSWORD || '[STAGING_DB_PASSWORD]',
    sslMode: 'require',
    poolMin: 5,
    poolMax: 20,
    idleTimeout: 60000,
    connectionTimeout: 10000,
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION DATABASE - Update with Cisco PostgreSQL cluster details
    // ═══════════════════════════════════════════════════════════════════════
    connectionUrl: process.env.DATABASE_URL || 'postgresql://sre_prod@prod-db-cluster.cisco.com:5432/sre_dashboard',
    host: process.env.DB_HOST || 'prod-db-cluster.cisco.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sre_dashboard',
    username: process.env.DB_USERNAME || 'sre_prod',
    password: process.env.DB_PASSWORD || '[PRODUCTION_DB_PASSWORD_REQUIRED]',
    sslMode: 'verify-full',
    poolMin: 10,
    poolMax: 50,
    idleTimeout: 120000,
    connectionTimeout: 10000,
  },
};

// =============================================================================
// REDIS CACHE CONFIGURATION
// =============================================================================

export interface RedisConfig {
  /** Redis host */
  host: string;
  /** Redis port */
  port: number;
  /** Redis password - KEEP SECURE */
  password: string;
  /** Redis database index */
  db: number;
  /** Connection URL */
  url: string;
  /** TLS enabled */
  tls: boolean;
  /** Key prefix for namespacing */
  keyPrefix: string;
  /** Default TTL in seconds */
  defaultTtl: number;
  /** Cluster mode */
  cluster: boolean;
  /** Cluster nodes (if cluster mode) */
  clusterNodes?: string[];
}

export const REDIS_CONFIG: Record<DeploymentEnvironment, RedisConfig> = {
  development: {
    host: 'localhost',
    port: 6379,
    password: '',
    db: 0,
    url: 'redis://localhost:6379/0',
    tls: false,
    keyPrefix: 'sre_dev:',
    defaultTtl: 3600,
    cluster: false,
  },
  staging: {
    host: process.env.REDIS_HOST || 'staging-redis.cisco.com',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '[STAGING_REDIS_PASSWORD]',
    db: parseInt(process.env.REDIS_DB || '0'),
    url: process.env.REDIS_URL || 'redis://staging-redis.cisco.com:6379/0',
    tls: true,
    keyPrefix: 'sre_staging:',
    defaultTtl: 7200,
    cluster: false,
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION REDIS CLUSTER - Update with Cisco Redis cluster details
    // ═══════════════════════════════════════════════════════════════════════
    host: process.env.REDIS_HOST || 'prod-redis-cluster.cisco.com',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '[PRODUCTION_REDIS_PASSWORD_REQUIRED]',
    db: parseInt(process.env.REDIS_DB || '0'),
    url: process.env.REDIS_URL || 'redis://prod-redis-cluster.cisco.com:6379/0',
    tls: true,
    keyPrefix: 'sre_prod:',
    defaultTtl: 14400,
    cluster: true,
    clusterNodes: [
      'prod-redis-1.cisco.com:6379',
      'prod-redis-2.cisco.com:6379',
      'prod-redis-3.cisco.com:6379',
    ],
  },
};

// =============================================================================
// SSL/TLS CONFIGURATION
// =============================================================================

export interface SslConfig {
  /** SSL enabled */
  enabled: boolean;
  /** Certificate file path */
  certPath: string;
  /** Private key file path */
  keyPath: string;
  /** CA certificate file path */
  caPath: string;
  /** TLS minimum version */
  minVersion: 'TLSv1.2' | 'TLSv1.3';
  /** Cipher suites */
  ciphers: string;
  /** HSTS enabled */
  hsts: boolean;
  /** HSTS max age in seconds */
  hstsMaxAge: number;
}

export const SSL_CONFIG: Record<DeploymentEnvironment, SslConfig> = {
  development: {
    enabled: false,
    certPath: '',
    keyPath: '',
    caPath: '',
    minVersion: 'TLSv1.2',
    ciphers: '',
    hsts: false,
    hstsMaxAge: 0,
  },
  staging: {
    enabled: true,
    certPath: process.env.SSL_CERT_PATH || '/etc/ssl/certs/staging-sre-dashboard.crt',
    keyPath: process.env.SSL_KEY_PATH || '/etc/ssl/private/staging-sre-dashboard.key',
    caPath: process.env.SSL_CA_PATH || '/etc/ssl/certs/cisco-ca-bundle.crt',
    minVersion: 'TLSv1.2',
    ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256',
    hsts: true,
    hstsMaxAge: 86400,
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION SSL - Update with Cisco certificate paths
    // ═══════════════════════════════════════════════════════════════════════
    enabled: true,
    certPath: process.env.SSL_CERT_PATH || '/etc/ssl/certs/sre-dashboard.cisco.com.crt',
    keyPath: process.env.SSL_KEY_PATH || '/etc/ssl/private/sre-dashboard.cisco.com.key',
    caPath: process.env.SSL_CA_PATH || '/etc/ssl/certs/cisco-root-ca.crt',
    minVersion: 'TLSv1.3',
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256',
    hsts: true,
    hstsMaxAge: 31536000, // 1 year
  },
};

// =============================================================================
// LOAD BALANCER CONFIGURATION
// =============================================================================

export interface LoadBalancerConfig {
  /** Load balancer enabled */
  enabled: boolean;
  /** Load balancer type */
  type: 'nginx' | 'haproxy' | 'f5' | 'cisco-ace' | 'aws-alb' | 'gcp-lb';
  /** Virtual IP (VIP) address */
  vip: string;
  /** Backend servers */
  backends: {
    host: string;
    port: number;
    weight: number;
    healthCheck: string;
  }[];
  /** Health check interval in seconds */
  healthCheckInterval: number;
  /** Session persistence */
  sessionPersistence: boolean;
  /** Sticky session cookie name */
  stickyCookieName: string;
}

export const LOAD_BALANCER_CONFIG: Record<DeploymentEnvironment, LoadBalancerConfig> = {
  development: {
    enabled: false,
    type: 'nginx',
    vip: '127.0.0.1',
    backends: [],
    healthCheckInterval: 30,
    sessionPersistence: false,
    stickyCookieName: '',
  },
  staging: {
    enabled: true,
    type: 'nginx',
    vip: process.env.LB_VIP || '10.0.1.50',
    backends: [
      { host: '10.0.1.101', port: 8000, weight: 1, healthCheck: '/api/health' },
      { host: '10.0.1.102', port: 8000, weight: 1, healthCheck: '/api/health' },
    ],
    healthCheckInterval: 15,
    sessionPersistence: true,
    stickyCookieName: 'SRE_STAGING_SESSION',
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION LOAD BALANCER - Update with Cisco infrastructure details
    // ═══════════════════════════════════════════════════════════════════════
    enabled: true,
    type: 'f5',
    vip: process.env.LB_VIP || '10.0.0.50',
    backends: [
      { host: '10.0.0.101', port: 8000, weight: 1, healthCheck: '/api/health' },
      { host: '10.0.0.102', port: 8000, weight: 1, healthCheck: '/api/health' },
      { host: '10.0.0.103', port: 8000, weight: 1, healthCheck: '/api/health' },
      { host: '10.0.0.104', port: 8000, weight: 1, healthCheck: '/api/health' },
    ],
    healthCheckInterval: 10,
    sessionPersistence: true,
    stickyCookieName: 'SRE_PROD_SESSION',
  },
};

// =============================================================================
// CISCO SSO / OAUTH CONFIGURATION
// =============================================================================

export interface AuthConfig {
  /** Authentication provider */
  provider: 'none' | 'cisco-sso' | 'okta' | 'azure-ad' | 'saml';
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret - KEEP SECURE */
  clientSecret: string;
  /** OAuth authorization URL */
  authorizationUrl: string;
  /** OAuth token URL */
  tokenUrl: string;
  /** OAuth callback URL */
  callbackUrl: string;
  /** SAML metadata URL (if SAML) */
  samlMetadataUrl?: string;
  /** Required scopes */
  scopes: string[];
  /** Session secret - KEEP SECURE */
  sessionSecret: string;
  /** Session expiry in seconds */
  sessionExpiry: number;
  /** Allowed email domains */
  allowedDomains: string[];
}

export const AUTH_CONFIG: Record<DeploymentEnvironment, AuthConfig> = {
  development: {
    provider: 'none',
    clientId: '',
    clientSecret: '',
    authorizationUrl: '',
    tokenUrl: '',
    callbackUrl: 'http://localhost:8001/auth/callback',
    scopes: [],
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-key',
    sessionExpiry: 86400,
    allowedDomains: ['*'],
  },
  staging: {
    provider: 'cisco-sso',
    clientId: process.env.OAUTH_CLIENT_ID || '[STAGING_CLIENT_ID]',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || '[STAGING_CLIENT_SECRET]',
    authorizationUrl: 'https://cloudsso-staging.cisco.com/as/authorization.oauth2',
    tokenUrl: 'https://cloudsso-staging.cisco.com/as/token.oauth2',
    callbackUrl: process.env.OAUTH_CALLBACK_URL || 'https://sre-dashboard-staging.cisco.com/auth/callback',
    scopes: ['openid', 'profile', 'email'],
    sessionSecret: process.env.SESSION_SECRET || '[STAGING_SESSION_SECRET]',
    sessionExpiry: 28800, // 8 hours
    allowedDomains: ['cisco.com'],
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION CISCO SSO - Update with production OAuth credentials
    // ═══════════════════════════════════════════════════════════════════════
    provider: 'cisco-sso',
    clientId: process.env.OAUTH_CLIENT_ID || '[PRODUCTION_CLIENT_ID_REQUIRED]',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || '[PRODUCTION_CLIENT_SECRET_REQUIRED]',
    authorizationUrl: 'https://cloudsso.cisco.com/as/authorization.oauth2',
    tokenUrl: 'https://cloudsso.cisco.com/as/token.oauth2',
    callbackUrl: process.env.OAUTH_CALLBACK_URL || 'https://sre-dashboard.cisco.com/auth/callback',
    samlMetadataUrl: 'https://cloudsso.cisco.com/saml/metadata',
    scopes: ['openid', 'profile', 'email', 'groups'],
    sessionSecret: process.env.SESSION_SECRET || '[PRODUCTION_SESSION_SECRET_REQUIRED]',
    sessionExpiry: 14400, // 4 hours
    allowedDomains: ['cisco.com'],
  },
};

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

export interface CorsConfig {
  /** CORS enabled */
  enabled: boolean;
  /** Allowed origins */
  origins: string[];
  /** Allowed methods */
  methods: string[];
  /** Allowed headers */
  headers: string[];
  /** Credentials allowed */
  credentials: boolean;
  /** Preflight max age in seconds */
  maxAge: number;
}

export const CORS_CONFIG: Record<DeploymentEnvironment, CorsConfig> = {
  development: {
    enabled: true,
    origins: ['http://localhost:*', 'http://127.0.0.1:*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  },
  staging: {
    enabled: true,
    origins: [
      'https://sre-dashboard-staging.cisco.com',
      'https://*.staging.cisco.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 3600,
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION CORS - Restrict to cisco.com domains only
    // ═══════════════════════════════════════════════════════════════════════
    enabled: true,
    origins: [
      'https://sre-dashboard.cisco.com',
      'https://*.cisco.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 3600,
  },
};

// =============================================================================
// LOGGING & MONITORING CONFIGURATION
// =============================================================================

export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Log format */
  format: 'json' | 'text' | 'splunk';
  /** Log to stdout */
  stdout: boolean;
  /** Log to file */
  file: boolean;
  /** Log file path */
  filePath: string;
  /** Log rotation enabled */
  rotation: boolean;
  /** Max log file size in MB */
  maxSize: number;
  /** Max log files to keep */
  maxFiles: number;
  /** Splunk HEC URL (if format is splunk) */
  splunkHecUrl?: string;
  /** Splunk HEC token */
  splunkHecToken?: string;
}

export const LOGGING_CONFIG: Record<DeploymentEnvironment, LoggingConfig> = {
  development: {
    level: 'debug',
    format: 'text',
    stdout: true,
    file: true,
    filePath: './logs/app.log',
    rotation: false,
    maxSize: 100,
    maxFiles: 5,
  },
  staging: {
    level: 'info',
    format: 'json',
    stdout: true,
    file: true,
    filePath: '/var/log/sre-dashboard/app.log',
    rotation: true,
    maxSize: 500,
    maxFiles: 30,
    splunkHecUrl: process.env.SPLUNK_HEC_URL || 'https://splunk-staging.cisco.com:8088',
    splunkHecToken: process.env.SPLUNK_HEC_TOKEN || '[STAGING_SPLUNK_TOKEN]',
  },
  production: {
    // ═══════════════════════════════════════════════════════════════════════
    // PRODUCTION LOGGING - Update with Cisco Splunk/logging infrastructure
    // ═══════════════════════════════════════════════════════════════════════
    level: 'info',
    format: 'splunk',
    stdout: true,
    file: true,
    filePath: '/var/log/sre-dashboard/app.log',
    rotation: true,
    maxSize: 1000,
    maxFiles: 90,
    splunkHecUrl: process.env.SPLUNK_HEC_URL || 'https://splunk.cisco.com:8088',
    splunkHecToken: process.env.SPLUNK_HEC_TOKEN || '[PRODUCTION_SPLUNK_TOKEN_REQUIRED]',
  },
};

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export interface FeatureFlags {
  /** Enable AI/ML predictions */
  aiPredictions: boolean;
  /** Enable real-time streaming */
  realTimeStreaming: boolean;
  /** Enable data export */
  dataExport: boolean;
  /** Enable advanced analytics */
  advancedAnalytics: boolean;
  /** Enable multi-tenancy */
  multiTenancy: boolean;
  /** Enable audit logging */
  auditLogging: boolean;
  /** Enable maintenance mode */
  maintenanceMode: boolean;
  /** Maintenance message */
  maintenanceMessage: string;
}

export const FEATURE_FLAGS: Record<DeploymentEnvironment, FeatureFlags> = {
  development: {
    aiPredictions: true,
    realTimeStreaming: true,
    dataExport: true,
    advancedAnalytics: true,
    multiTenancy: false,
    auditLogging: false,
    maintenanceMode: false,
    maintenanceMessage: '',
  },
  staging: {
    aiPredictions: true,
    realTimeStreaming: true,
    dataExport: true,
    advancedAnalytics: true,
    multiTenancy: true,
    auditLogging: true,
    maintenanceMode: false,
    maintenanceMessage: '',
  },
  production: {
    aiPredictions: true,
    realTimeStreaming: true,
    dataExport: true,
    advancedAnalytics: true,
    multiTenancy: true,
    auditLogging: true,
    maintenanceMode: false,
    maintenanceMessage: '',
  },
};

// =============================================================================
// RATE LIMITING CONFIGURATION
// =============================================================================

export interface RateLimitConfig {
  /** Rate limiting enabled */
  enabled: boolean;
  /** Window size in milliseconds */
  windowMs: number;
  /** Max requests per window */
  maxRequests: number;
  /** Skip for trusted IPs */
  trustedIps: string[];
  /** Rate limit message */
  message: string;
}

export const RATE_LIMIT_CONFIG: Record<DeploymentEnvironment, RateLimitConfig> = {
  development: {
    enabled: false,
    windowMs: 60000,
    maxRequests: 1000,
    trustedIps: ['127.0.0.1'],
    message: 'Too many requests',
  },
  staging: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 500,
    trustedIps: ['10.0.1.0/24'],
    message: 'Rate limit exceeded. Please try again later.',
  },
  production: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 300,
    trustedIps: ['10.0.0.0/24', '172.16.0.0/16'],
    message: 'Rate limit exceeded. Please contact support if this continues.',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get current environment configuration
 */
export function getCurrentConfig() {
  return {
    environment: DEPLOYMENT_ENV,
    host: HOST_CONFIG[DEPLOYMENT_ENV],
    ciscoApi: CISCO_API_CONFIG[DEPLOYMENT_ENV],
    database: DATABASE_CONFIG[DEPLOYMENT_ENV],
    redis: REDIS_CONFIG[DEPLOYMENT_ENV],
    ssl: SSL_CONFIG[DEPLOYMENT_ENV],
    loadBalancer: LOAD_BALANCER_CONFIG[DEPLOYMENT_ENV],
    auth: AUTH_CONFIG[DEPLOYMENT_ENV],
    cors: CORS_CONFIG[DEPLOYMENT_ENV],
    logging: LOGGING_CONFIG[DEPLOYMENT_ENV],
    features: FEATURE_FLAGS[DEPLOYMENT_ENV],
    rateLimit: RATE_LIMIT_CONFIG[DEPLOYMENT_ENV],
  };
}

/**
 * Get the full application URL
 */
export function getApplicationUrl(): string {
  const host = HOST_CONFIG[DEPLOYMENT_ENV];
  const ssl = SSL_CONFIG[DEPLOYMENT_ENV];
  const protocol = ssl.enabled ? 'https' : 'http';
  const port = ssl.enabled ? host.httpsPort : host.port;
  
  // Don't show port if it's standard (80 or 443)
  const portSuffix = (port === 80 || port === 443) ? '' : `:${port}`;
  
  return `${protocol}://${host.hostname}${portSuffix}`;
}

/**
 * Validate configuration for production readiness
 */
export function validateProductionConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getCurrentConfig();
  
  if (DEPLOYMENT_ENV === 'production') {
    // Check for placeholder values
    if (config.ciscoApi.circuitApiKey.includes('[')) {
      errors.push('Circuit API Key is not set');
    }
    if (config.database.password.includes('[')) {
      errors.push('Database password is not set');
    }
    if (config.redis.password.includes('[')) {
      errors.push('Redis password is not set');
    }
    if (config.auth.clientId.includes('[')) {
      errors.push('OAuth Client ID is not set');
    }
    if (config.auth.clientSecret.includes('[')) {
      errors.push('OAuth Client Secret is not set');
    }
    if (config.auth.sessionSecret.includes('[')) {
      errors.push('Session Secret is not set');
    }
    if (!config.ssl.enabled) {
      errors.push('SSL should be enabled in production');
    }
    if (!config.loadBalancer.enabled) {
      errors.push('Load balancer should be enabled in production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// EXPORT DEFAULT CONFIGURATION
// =============================================================================

export default getCurrentConfig();
