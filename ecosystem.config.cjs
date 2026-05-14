/**
 * PM2 Ecosystem Configuration
 * Cisco SRE AgenticOps Intelligence Dashboard
 *
 * Production deployment: https://sre.cisco.com/fnip/dashboard
 *
 * Cross-platform note:
 *   On Linux/macOS servers the default paths (/opt/cisco/..., /var/log/...)
 *   are used.  Override via environment variables for Windows or local dev:
 *     PM2_APP_CWD      – working directory (default: /opt/cisco/sre-fnip-dashboard)
 *     PM2_LOG_DIR      – log directory      (default: /var/log/sre-fnip-dashboard)
 */

const path = require('path');
const isWindows = process.platform === 'win32';

// Working directory: use env var → relative fallback on Windows → Linux default
const appCwd = process.env.PM2_APP_CWD ||
  (isWindows ? path.resolve(__dirname) : '/opt/cisco/sre-fnip-dashboard');

// Log directory: use env var → ./logs fallback on Windows → Linux default
const logDir = process.env.PM2_LOG_DIR ||
  (isWindows ? path.join(__dirname, 'logs') : '/var/log/sre-fnip-dashboard');

module.exports = {
  apps: [{
    // Application name
    name: 'sre-fnip-dashboard',
    
    // Entry point
    script: 'build/index.js',
    
    // Working directory (set PM2_APP_CWD to override on Windows / local dev)
    cwd: appCwd,
    
    // Cluster mode - use all available CPUs
    instances: 'max',
    exec_mode: 'cluster',
    
    // Memory management
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
    },
    
    // Load environment file
    env_file: '.env',
    
    // Logging configuration (set PM2_LOG_DIR to override on Windows / local dev)
    error_file: path.join(logDir, 'error.log'),
    out_file: path.join(logDir, 'out.log'),
    log_file: path.join(logDir, 'combined.log'),
    merge_logs: true,
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Restart configuration
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 1000,
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Health monitoring
    exp_backoff_restart_delay: 100,
    
    // Node.js arguments
    node_args: [
      '--max-old-space-size=2048',
      '--enable-source-maps'
    ],
    
    // Interpreter (Node.js)
    interpreter: 'node',
    
    // Source map support
    source_map_support: true,
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      // SSH user
      user: 'sre-dashboard',
      
      // Target servers
      host: ['10.0.0.101', '10.0.0.102', '10.0.0.103', '10.0.0.104'],
      
      // Git reference
      ref: 'origin/main',
      
      // Repository
      repo: 'git@github.cisco.com:sre-team/agenticops-intelligence-dashboard.git',
      
      // Target path (Linux server deploy target – not used on Windows)
      path: process.env.PM2_DEPLOY_PROD_PATH || '/opt/cisco/sre-fnip-dashboard',
      
      // SSH options
      ssh_options: 'StrictHostKeyChecking=no',
      
      // Pre-deployment commands
      'pre-deploy-local': '',
      
      // Post-deployment commands
      'post-deploy': 'npm ci --production=false && npm run build && pm2 reload ecosystem.config.cjs --env production',
      
      // Pre-setup commands
      'pre-setup': '',
      
      // Post-setup commands  
      'post-setup': 'ls -la'
    },
    
    staging: {
      user: 'sre-dashboard',
      host: ['10.0.1.101', '10.0.1.102'],
      ref: 'origin/staging',
      repo: 'git@github.cisco.com:sre-team/agenticops-intelligence-dashboard.git',
      path: process.env.PM2_DEPLOY_STAGING_PATH || '/opt/cisco/sre-fnip-dashboard-staging',
      ssh_options: 'StrictHostKeyChecking=no',
      'post-deploy': 'npm ci --production=false && npm run build && pm2 reload ecosystem.config.cjs --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 8000
      }
    }
  }
};
