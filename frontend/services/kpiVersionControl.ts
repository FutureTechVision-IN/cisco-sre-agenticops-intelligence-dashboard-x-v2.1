/**
 * KPI Card Version Control and Changelog System
 * 
 * This module tracks all changes to KPI cards in the AI/ML Intelligence Center.
 * Each card has its own version history, modification log, and audit trail.
 * 
 * @version 1.0.0
 * @date 2025-12-01
 */

// ==================== TYPES ====================

export interface ChangelogEntry {
  version: string;
  date: string;
  author: string;
  type: 'FEATURE' | 'ENHANCEMENT' | 'BUGFIX' | 'BREAKING' | 'SECURITY';
  description: string;
  details?: string[];
  affectedComponents?: string[];
  backwardCompatible: boolean;
  migrationRequired?: boolean;
  migrationGuide?: string;
}

export interface KPICardVersion {
  cardId: string;
  cardName: string;
  currentVersion: string;
  category: 'PRIMARY_KPI' | 'ANALYTICS' | 'INTELLIGENCE' | 'FORECASTING' | 'ANOMALY';
  status: 'ACTIVE' | 'DEPRECATED' | 'BETA' | 'LEGACY';
  createdDate: string;
  lastModifiedDate: string;
  changelog: ChangelogEntry[];
  dependencies: string[];
  dataSourceVersion: string;
  mlModelVersion?: string;
}

export interface KPICardAudit {
  cardId: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ENABLE' | 'DISABLE' | 'CONFIG_CHANGE';
  performedBy: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  reason?: string;
}

// ==================== KPI CARD REGISTRY ====================

export const KPI_CARD_REGISTRY: KPICardVersion[] = [
  // ============ PRIMARY KPI CARDS ============
  {
    cardId: 'total-assessed',
    cardName: 'Total Assessed Assets',
    currentVersion: '2.1.0',
    category: 'PRIMARY_KPI',
    status: 'ACTIVE',
    createdDate: '2025-08-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['dataService', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.1.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Added AI/ML predictive capabilities',
        details: [
          'Integrated Holt Exponential Smoothing for 7-day forecasting',
          'Added Z-score + IQR anomaly detection',
          'Real-time data processing with 30s refresh',
          'Confidence intervals for predictions'
        ],
        affectedComponents: ['MetricCard', 'IntelligenceCenter'],
        backwardCompatible: true
      },
      {
        version: '2.0.0',
        date: '2025-11-15',
        author: 'SRE Team',
        type: 'FEATURE',
        description: 'Added deep dive analytics and trend history',
        details: [
          'Historical trend visualization',
          'Deep dive modal with methodology explanation',
          'Data source attribution'
        ],
        affectedComponents: ['MetricCard'],
        backwardCompatible: true
      },
      {
        version: '1.0.0',
        date: '2025-08-01',
        author: 'Dashboard Team',
        type: 'FEATURE',
        description: 'Initial implementation',
        details: ['Basic KPI display', 'Real-time value updates'],
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'secure-assets',
    cardName: 'Secure Assets',
    currentVersion: '2.1.0',
    category: 'PRIMARY_KPI',
    status: 'ACTIVE',
    createdDate: '2025-08-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['dataService', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.1.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Added AI/ML predictive capabilities and trend forecasting',
        details: [
          'Predictive analytics for security posture',
          'Automated anomaly detection',
          'Target compliance tracking with ML'
        ],
        backwardCompatible: true
      },
      {
        version: '2.0.0',
        date: '2025-11-15',
        author: 'SRE Team',
        type: 'FEATURE',
        description: 'Added percentage tracking and trend indicators',
        backwardCompatible: true
      },
      {
        version: '1.0.0',
        date: '2025-08-01',
        author: 'Dashboard Team',
        type: 'FEATURE',
        description: 'Initial implementation',
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'potential-vulnerable',
    cardName: 'Potentially Vulnerable Assets',
    currentVersion: '2.1.0',
    category: 'PRIMARY_KPI',
    status: 'ACTIVE',
    createdDate: '2025-08-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['dataService', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.1.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Added ML-based investigation prioritization',
        details: [
          'Risk scoring for investigation queue',
          'Automated classification suggestions',
          'Trend prediction for workload planning'
        ],
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'vulnerable-assets',
    cardName: 'Vulnerable Assets',
    currentVersion: '2.1.0',
    category: 'PRIMARY_KPI',
    status: 'ACTIVE',
    createdDate: '2025-08-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['dataService', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.1.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Critical vulnerability tracking with AI-powered alerts',
        details: [
          'Real-time anomaly detection for sudden spikes',
          'Remediation velocity prediction',
          'Automated escalation recommendations'
        ],
        backwardCompatible: true
      }
    ]
  },

  // ============ INTELLIGENCE CARDS ============
  {
    cardId: 'detected-anomalies',
    cardName: 'Detected Anomalies',
    currentVersion: '2.1.0',
    category: 'ANOMALY',
    status: 'ACTIVE',
    createdDate: '2025-09-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCards', 'aiMLService', 'InsightModal'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.1.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Advanced multi-method anomaly detection',
        details: [
          'Z-score statistical analysis',
          'Interquartile Range (IQR) outlier detection',
          'Configurable sensitivity levels (low/medium/high)',
          'Confidence scoring for each anomaly',
          'Severity classification (CRITICAL/HIGH/MEDIUM/LOW)',
          'Clickable card with InsightModal integration'
        ],
        affectedComponents: ['AnomaliesCard', 'InsightModal', 'App'],
        backwardCompatible: true
      },
      {
        version: '2.0.0',
        date: '2025-11-01',
        author: 'Intelligence Team',
        type: 'FEATURE',
        description: 'Added interactive card click functionality',
        backwardCompatible: true
      },
      {
        version: '1.0.0',
        date: '2025-09-01',
        author: 'Dashboard Team',
        type: 'FEATURE',
        description: 'Initial anomaly detection display',
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'trend-predictions',
    cardName: 'Trend Predictions',
    currentVersion: '2.1.0',
    category: 'FORECASTING',
    status: 'ACTIVE',
    createdDate: '2025-09-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCards', 'aiMLService', 'InsightModal'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.1.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Holt Exponential Smoothing forecasting',
        details: [
          '7-day ahead predictions with confidence intervals',
          'Trend direction and strength indicators',
          'Seasonality detection (weekly patterns)',
          'Accuracy metrics for model validation',
          'Interactive forecast visualization'
        ],
        affectedComponents: ['PredictionsCard', 'InsightModal'],
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'top-recommendations',
    cardName: 'Top Recommendations',
    currentVersion: '2.1.0',
    category: 'INTELLIGENCE',
    status: 'ACTIVE',
    createdDate: '2025-09-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCards', 'aiMLService', 'InsightModal'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.1.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Intelligent recommendations engine',
        details: [
          'Priority scoring based on impact analysis',
          'Confidence-weighted recommendations',
          'Estimated time-to-resolve predictions',
          'Automation availability indicators',
          'Related metrics correlation'
        ],
        backwardCompatible: true
      }
    ]
  },

  // ============ ANALYTICS CARDS (Intelligence Center) ============
  {
    cardId: 'vulnerability-trend',
    cardName: 'Vulnerability Trend',
    currentVersion: '2.0.0',
    category: 'ANALYTICS',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Advanced trend analysis with ML',
        details: [
          'Linear regression for trend direction',
          'Acceleration calculation (2nd derivative)',
          'Support and resistance level detection',
          'Breakout probability estimation'
        ],
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'customer-risk',
    cardName: 'Customer Risk (80/20)',
    currentVersion: '2.0.0',
    category: 'ANALYTICS',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Pareto analysis with risk prioritization',
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'field-notice-impact',
    cardName: 'Field Notice Impact',
    currentVersion: '2.0.0',
    category: 'ANALYTICS',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'CVE impact scoring with ML classification',
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'remediation-velocity',
    cardName: 'Remediation Velocity',
    currentVersion: '2.0.0',
    category: 'ANALYTICS',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Predictive remediation timeline',
        details: [
          'Months-to-clear prediction',
          'Efficiency scoring',
          'Resource optimization recommendations'
        ],
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'temporal-patterns',
    cardName: 'Temporal Patterns',
    currentVersion: '2.0.0',
    category: 'ANALYTICS',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Seasonality detection and pattern analysis',
        details: [
          'Autocorrelation-based seasonality detection',
          'Peak and low period identification',
          'Quarterly pattern recognition'
        ],
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'risk-prioritization',
    cardName: 'Risk Prioritization',
    currentVersion: '2.0.0',
    category: 'INTELLIGENCE',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'ML-based risk scoring and prioritization',
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'intelligence-summary',
    cardName: 'Intelligence Summary',
    currentVersion: '2.0.0',
    category: 'INTELLIGENCE',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'Aggregated intelligence with AI insights',
        backwardCompatible: true
      }
    ]
  },
  {
    cardId: 'predictive-forecast',
    cardName: 'Predictive Forecast',
    currentVersion: '2.0.0',
    category: 'FORECASTING',
    status: 'ACTIVE',
    createdDate: '2025-10-01',
    lastModifiedDate: '2025-12-01',
    dependencies: ['IntelligenceCenter', 'aiMLService', 'recharts'],
    dataSourceVersion: '1.2.0',
    mlModelVersion: '2.0.0',
    changelog: [
      {
        version: '2.0.0',
        date: '2025-12-01',
        author: 'AI Enhancement System',
        type: 'ENHANCEMENT',
        description: 'ARIMA-style forecasting with visualization',
        details: [
          '3-month vulnerability trend forecast',
          '95% confidence intervals',
          'Interactive chart with tooltips'
        ],
        backwardCompatible: true
      }
    ]
  }
];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get a specific KPI card version info
 */
export const getKPICardInfo = (cardId: string): KPICardVersion | undefined => {
  return KPI_CARD_REGISTRY.find(card => card.cardId === cardId);
};

/**
 * Get all cards by category
 */
export const getCardsByCategory = (category: KPICardVersion['category']): KPICardVersion[] => {
  return KPI_CARD_REGISTRY.filter(card => card.category === category);
};

/**
 * Get all active cards
 */
export const getActiveCards = (): KPICardVersion[] => {
  return KPI_CARD_REGISTRY.filter(card => card.status === 'ACTIVE');
};

/**
 * Get changelog for a specific card
 */
export const getCardChangelog = (cardId: string): ChangelogEntry[] => {
  const card = getKPICardInfo(cardId);
  return card?.changelog || [];
};

/**
 * Get the latest version of all cards
 */
export const getLatestVersions = (): { cardId: string; version: string; lastModified: string }[] => {
  return KPI_CARD_REGISTRY.map(card => ({
    cardId: card.cardId,
    version: card.currentVersion,
    lastModified: card.lastModifiedDate
  }));
};

/**
 * Check if a card has breaking changes
 */
export const hasBreakingChanges = (cardId: string, sinceVersion: string): boolean => {
  const changelog = getCardChangelog(cardId);
  const versionIndex = changelog.findIndex(entry => entry.version === sinceVersion);
  
  if (versionIndex === -1) return false;
  
  const recentChanges = changelog.slice(0, versionIndex);
  return recentChanges.some(entry => entry.type === 'BREAKING' || !entry.backwardCompatible);
};

/**
 * Generate a summary report of all KPI cards
 */
export const generateKPICardReport = (): string => {
  const report: string[] = [
    '# KPI Card Audit Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `Total Cards: ${KPI_CARD_REGISTRY.length}`,
    `Active: ${getActiveCards().length}`,
    '',
    '## Cards by Category',
  ];

  const categories = ['PRIMARY_KPI', 'ANALYTICS', 'INTELLIGENCE', 'FORECASTING', 'ANOMALY'] as const;
  
  categories.forEach(category => {
    const cards = getCardsByCategory(category);
    report.push(`### ${category} (${cards.length} cards)`);
    cards.forEach(card => {
      report.push(`- **${card.cardName}** (v${card.currentVersion}) - ${card.status}`);
    });
    report.push('');
  });

  report.push('## Recent Changes (Last 30 Days)');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  KPI_CARD_REGISTRY.forEach(card => {
    const recentChanges = card.changelog.filter(entry => 
      new Date(entry.date) >= thirtyDaysAgo
    );
    if (recentChanges.length > 0) {
      report.push(`### ${card.cardName}`);
      recentChanges.forEach(change => {
        report.push(`- v${change.version} (${change.date}): ${change.description}`);
      });
      report.push('');
    }
  });

  return report.join('\n');
};

// ==================== AUDIT TRAIL ====================

const auditTrail: KPICardAudit[] = [];

/**
 * Log an audit event
 */
export const logAuditEvent = (event: Omit<KPICardAudit, 'timestamp'>): void => {
  auditTrail.push({
    ...event,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get audit trail for a card
 */
export const getCardAuditTrail = (cardId: string): KPICardAudit[] => {
  return auditTrail.filter(event => event.cardId === cardId);
};

/**
 * Get all audit events
 */
export const getAllAuditEvents = (): KPICardAudit[] => {
  return [...auditTrail];
};

// Export version info
export const VERSION_SYSTEM_VERSION = '1.0.0';
