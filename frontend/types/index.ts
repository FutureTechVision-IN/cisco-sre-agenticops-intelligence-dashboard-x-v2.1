/**
 * Shared type definitions for the dashboard
 */

export interface AccountKARMetrics {
  accountId: string;
  accountName: string;
  industry?: string;
  accountSize?: 'Enterprise' | 'Mid-Market' | 'SMB';
  currentRatio: number;
  historicalTrends: { period: string; ratio: number }[];
  peerBenchmark: number;
  benchmarkPercentile: number;
  impactedDevices: number;
  vulnerabilityCount: number;
  riskScore: number;
  criticalCount: number;
  complianceExposure: string[];
  remediationStatus?: 'Not Started' | 'In Progress' | 'Completed';
  daysOutstanding?: number;
  // Additional properties that may be used in visualizations
  karRatio?: number;
}

export interface FieldNoticeData {
  id: string;
  title: string;
  affectedAccountsCount: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  releaseDate: string;
  lastUpdated: string;
  description?: string;
}

export interface GroupedAccountData {
  groupName: string;
  accounts: AccountKARMetrics[];
  totalAccounts: number;
  avgRatio: number;
  avgRiskScore: number;
  totalDevices: number;
  color: string;
}

export interface TrendData {
  month: string;
  value: number;
  forecast?: boolean;
  confidence?: number;
}

export interface TooltipData {
  accountName: string;
  ratio: number;
  riskScore: number;
  devices: number;
  size?: string;
  industry?: string;
  benchmark?: number;
  percentile?: number;
}

export interface ExportConfig {
  format: 'csv' | 'json' | 'pdf';
  includeMetadata?: boolean;
  timestamp?: string;
}

export interface DataIntegrityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: string;
  accountName?: string;
  validatedFields?: string[];
}
