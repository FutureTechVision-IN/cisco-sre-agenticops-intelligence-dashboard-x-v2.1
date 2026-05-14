/**
 * Admin Settings Service
 * Manages role-based access control and persists configuration settings
 * Includes audit logging for all administrative changes
 */

export interface AdminSettings {
  expandSuggestionsByDefault: boolean;
  cisconBrandingStyle: 'minimal' | 'prominent' | 'full';
  cisconBrandingPosition: 'header' | 'footer' | 'both';
  auditLoggingEnabled: boolean;
  maxAuditLogEntries: number;
  adminNotificationsEnabled: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  action: string;
  category: 'settings' | 'user-management' | 'security' | 'system';
  changes: {
    fieldName: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  expandSuggestionsByDefault: true,
  cisconBrandingStyle: 'prominent',
  cisconBrandingPosition: 'both',
  auditLoggingEnabled: true,
  maxAuditLogEntries: 1000,
  adminNotificationsEnabled: true,
};

const STORAGE_KEY = 'admin_settings';
const AUDIT_LOG_KEY = 'admin_audit_log';

/**
 * Admin Settings Service - Singleton pattern
 */
class AdminSettingsService {
  private settings: AdminSettings = DEFAULT_ADMIN_SETTINGS;
  private auditLog: AuditLogEntry[] = [];
  private settingsChangeCallbacks: ((settings: AdminSettings) => void)[] = [];

  constructor() {
    this.loadSettings();
    this.loadAuditLog();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(stored) };
        console.log('[AdminSettings] Settings loaded from localStorage');
      } else {
        this.settings = DEFAULT_ADMIN_SETTINGS;
        this.saveSettings();
      }
    } catch (error) {
      console.error('[AdminSettings] Failed to load settings:', error);
      this.settings = DEFAULT_ADMIN_SETTINGS;
    }
  }

  /**
   * Load audit log from localStorage
   */
  private loadAuditLog(): void {
    try {
      const stored = localStorage.getItem(AUDIT_LOG_KEY);
      if (stored) {
        const parsedLog = JSON.parse(stored);
        this.auditLog = parsedLog.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        console.log(`[AdminSettings] Audit log loaded: ${this.auditLog.length} entries`);
      }
    } catch (error) {
      console.error('[AdminSettings] Failed to load audit log:', error);
      this.auditLog = [];
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      console.log('[AdminSettings] Settings saved to localStorage');
    } catch (error) {
      console.error('[AdminSettings] Failed to save settings:', error);
    }
  }

  /**
   * Save audit log to localStorage
   */
  private saveAuditLog(): void {
    try {
      // Keep only recent entries
      const entriesToSave = this.auditLog.slice(-this.settings.maxAuditLogEntries);
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(entriesToSave));
      console.log('[AdminSettings] Audit log saved');
    } catch (error) {
      console.error('[AdminSettings] Failed to save audit log:', error);
    }
  }

  /**
   * Add audit log entry
   */
  private addAuditLogEntry(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    if (this.settings.auditLoggingEnabled) {
      this.saveAuditLog();
      console.log(`[AdminSettings] Audit logged: ${entry.action}`);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AdminSettings {
    return { ...this.settings };
  }

  /**
   * Update a single setting with audit logging
   */
  updateSetting<K extends keyof AdminSettings>(
    key: K,
    value: AdminSettings[K],
    userId: string,
    username: string
  ): void {
    const oldValue = this.settings[key];

    if (oldValue === value) {
      console.log(`[AdminSettings] No change for setting: ${String(key)}`);
      return;
    }

    this.settings[key] = value;
    this.saveSettings();

    // Add audit log entry
    if (this.settings.auditLoggingEnabled) {
      const entry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        userId,
        username,
        action: `Updated setting: ${String(key)}`,
        category: 'settings',
        changes: [
          {
            fieldName: String(key),
            oldValue,
            newValue: value
          }
        ],
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        status: 'success'
      };
      this.addAuditLogEntry(entry);
    }

    // Notify subscribers
    this.notifySettingsChange();

    console.log(`[AdminSettings] Setting updated: ${String(key)} = ${value}`);
  }

  /**
   * Update multiple settings at once
   */
  updateSettings(
    updates: Partial<AdminSettings>,
    userId: string,
    username: string
  ): void {
    const changes = [];

    for (const [key, value] of Object.entries(updates)) {
      const oldValue = (this.settings as any)[key];
      if (oldValue !== value) {
        (this.settings as any)[key] = value;
        changes.push({
          fieldName: key,
          oldValue,
          newValue: value
        });
      }
    }

    if (changes.length === 0) {
      console.log('[AdminSettings] No settings changed');
      return;
    }

    this.saveSettings();

    // Add single audit log entry for all changes
    if (this.settings.auditLoggingEnabled) {
      const entry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        userId,
        username,
        action: `Updated ${changes.length} settings`,
        category: 'settings',
        changes,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        status: 'success'
      };
      this.addAuditLogEntry(entry);
    }

    this.notifySettingsChange();
    console.log(`[AdminSettings] Updated ${changes.length} settings`);
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(userId: string, username: string): void {
    const oldSettings = { ...this.settings };
    this.settings = DEFAULT_ADMIN_SETTINGS;
    this.saveSettings();

    if (this.settings.auditLoggingEnabled) {
      const entry: AuditLogEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        userId,
        username,
        action: 'Reset all settings to defaults',
        category: 'settings',
        changes: Object.entries(oldSettings).map(([key, oldValue]) => ({
          fieldName: key,
          oldValue,
          newValue: DEFAULT_ADMIN_SETTINGS[key as keyof AdminSettings]
        })),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        status: 'success'
      };
      this.addAuditLogEntry(entry);
    }

    this.notifySettingsChange();
    console.log('[AdminSettings] Settings reset to defaults');
  }

  /**
   * Get audit log entries
   */
  getAuditLog(limit: number = 100): AuditLogEntry[] {
    return this.auditLog.slice(-limit).reverse();
  }

  /**
   * Get audit log entries for specific user
   */
  getAuditLogForUser(userId: string, limit: number = 50): AuditLogEntry[] {
    return this.auditLog
      .filter(entry => entry.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get audit log entries for specific category
   */
  getAuditLogByCategory(category: AuditLogEntry['category'], limit: number = 50): AuditLogEntry[] {
    return this.auditLog
      .filter(entry => entry.category === category)
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear all audit logs (admin action)
   */
  clearAuditLog(userId: string, username: string): void {
    const previousCount = this.auditLog.length;
    this.auditLog = [];
    localStorage.removeItem(AUDIT_LOG_KEY);

    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      username,
      action: `Cleared audit log (${previousCount} entries deleted)`,
      category: 'system',
      changes: [],
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      status: 'success'
    };
    this.addAuditLogEntry(entry);

    console.log(`[AdminSettings] Audit log cleared (${previousCount} entries)`);
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    userId: string,
    username: string,
    action: string,
    status: 'success' | 'failure',
    errorMessage?: string
  ): void {
    if (!this.settings.auditLoggingEnabled) {
      return;
    }

    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      username,
      action,
      category: 'security',
      changes: [],
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      status,
      errorMessage
    };
    this.addAuditLogEntry(entry);
  }

  /**
   * Register callback for settings changes
   */
  onSettingsChange(callback: (settings: AdminSettings) => void): () => void {
    this.settingsChangeCallbacks.push(callback);
    return () => {
      this.settingsChangeCallbacks = this.settingsChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of settings change
   */
  private notifySettingsChange(): void {
    const currentSettings = this.getSettings();
    this.settingsChangeCallbacks.forEach(callback => callback(currentSettings));
  }

  /**
   * Export audit log as CSV
   */
  exportAuditLogAsCSV(): string {
    const headers = ['ID', 'Timestamp', 'User ID', 'Username', 'Action', 'Category', 'Status', 'Error'];
    const rows = this.auditLog.map(entry => [
      entry.id,
      entry.timestamp.toISOString(),
      entry.userId,
      entry.username,
      entry.action,
      entry.category,
      entry.status,
      entry.errorMessage || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Get audit log statistics
   */
  getAuditLogStats(): {
    totalEntries: number;
    entriesByCategory: Record<string, number>;
    entriesByStatus: Record<string, number>;
    entriesByUser: Record<string, number>;
    dateRange: { oldest?: Date; newest?: Date };
  } {
    const stats = {
      totalEntries: this.auditLog.length,
      entriesByCategory: {} as Record<string, number>,
      entriesByStatus: {} as Record<string, number>,
      entriesByUser: {} as Record<string, number>,
      dateRange: {} as { oldest?: Date; newest?: Date }
    };

    for (const entry of this.auditLog) {
      stats.entriesByCategory[entry.category] = (stats.entriesByCategory[entry.category] || 0) + 1;
      stats.entriesByStatus[entry.status] = (stats.entriesByStatus[entry.status] || 0) + 1;
      stats.entriesByUser[entry.username] = (stats.entriesByUser[entry.username] || 0) + 1;
    }

    if (this.auditLog.length > 0) {
      stats.dateRange.oldest = new Date(Math.min(...this.auditLog.map(e => e.timestamp.getTime())));
      stats.dateRange.newest = new Date(Math.max(...this.auditLog.map(e => e.timestamp.getTime())));
    }

    return stats;
  }
}

// Singleton instance
let instance: AdminSettingsService | null = null;

export function getAdminSettingsService(): AdminSettingsService {
  if (!instance) {
    instance = new AdminSettingsService();
  }
  return instance;
}
