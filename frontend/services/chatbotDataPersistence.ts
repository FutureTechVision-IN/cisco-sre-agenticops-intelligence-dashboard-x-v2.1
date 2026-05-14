/**
 * Chatbot Data Persistence Service
 * SRE AgenticOps Intelligence Dashboard
 * 
 * Handles:
 * - Persistent storage of chat messages
 * - Automatic backup to browser storage
 * - Data recovery and restoration
 * - Zero-data condition detection
 * - Session state management
 */

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface PersistentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    inputType?: 'voice' | 'text';
    processingTime?: number;
    model?: string;
    confidence?: number;
  };
  feedback?: 'positive' | 'negative' | null;
}

export interface ChatSessionState {
  sessionId: string;
  messages: PersistentChatMessage[];
  suggestions: any[];
  lastActivity: number;
  voiceProfile?: string;
  autoSpeak?: boolean;
  metadata?: {
    userAgent?: string;
    browserVersion?: string;
    createdAt: number;
  };
}

export interface BackupMetadata {
  backupId: string;
  timestamp: number;
  messageCount: number;
  messagesSizeBytes: number;
  checksum: string;
  version: string;
}

export interface RecoveryReport {
  recovered: boolean;
  messageCount: number;
  timestamp: number;
  source: 'localStorage' | 'sessionStorage' | 'fresh';
  issues: string[];
}

// ==========================================
// CONSTANTS
// ==========================================

const STORAGE_KEYS = {
  CHAT_MESSAGES: 'cisco_sre_chatbot_messages',
  SESSION_STATE: 'cisco_sre_chatbot_session',
  BACKUP_METADATA: 'cisco_sre_chatbot_backup_meta',
  BACKUP_ARCHIVE: 'cisco_sre_chatbot_backup_archive',
  RECOVERY_LOG: 'cisco_sre_chatbot_recovery_log',
  DATA_HEALTH: 'cisco_sre_chatbot_data_health',
  ZERO_DATA_HISTORY: 'cisco_sre_chatbot_zero_data_history'
};

const CONFIG = {
  MAX_LOCAL_MESSAGES: 500,           // Max messages to store locally
  BACKUP_INTERVAL: 30 * 1000,        // 30 seconds
  ARCHIVE_HISTORY_LIMIT: 10,         // Keep 10 backups
  COMPRESSION_THRESHOLD: 1024 * 100, // 100KB - compress if larger
  ZERO_DATA_CHECK_INTERVAL: 5 * 1000, // 5 seconds
  MAX_RECOVERY_ATTEMPTS: 3,
  DATA_VERSION: '2.0.0'
};

// ==========================================
// MAIN SERVICE CLASS
// ==========================================

export class ChatbotDataPersistence {
  private sessionId: string;
  private messages: PersistentChatMessage[] = [];
  private sessionState: ChatSessionState | null = null;
  private backupIntervalId: NodeJS.Timeout | null = null;
  private healthCheckIntervalId: NodeJS.Timeout | null = null;
  private recoveryAttempts: number = 0;
  private zeroDataDetectedAt: number | null = null;
  private onDataRestored?: (messages: PersistentChatMessage[]) => void;
  private onZeroDataDetected?: (report: RecoveryReport) => void;
  private onBytesUnavailable?: () => void;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.initialize();
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  private initialize(): void {
    console.log('[ChatbotPersistence] Initializing persistence service');
    
    // Load existing data
    this.loadFromStorage();
    
    // Start automatic backup
    this.startAutomaticBackup();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Log initialization
    this.logDataHealth('initialized');
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages = parsed.map(m => ({
            ...m,
            timestamp: typeof m.timestamp === 'string' ? parseInt(m.timestamp) : m.timestamp
          }));
          console.log(`[ChatbotPersistence] Loaded ${this.messages.length} messages from storage`);
        }
      }
    } catch (error) {
      console.error('[ChatbotPersistence] Error loading from storage:', error);
      // Try fallback
      this.attemptRecovery();
    }
  }

  // ==========================================
  // MESSAGE MANAGEMENT
  // ==========================================

  /**
   * Add a new message and persist it
   */
  addMessage(message: Omit<PersistentChatMessage, 'timestamp'>): void {
    const fullMessage: PersistentChatMessage = {
      ...message,
      timestamp: Date.now()
    };
    
    this.messages.push(fullMessage);
    
    // Trim if exceeds limit
    if (this.messages.length > CONFIG.MAX_LOCAL_MESSAGES) {
      this.messages = this.messages.slice(-CONFIG.MAX_LOCAL_MESSAGES);
    }
    
    // Persist immediately for important messages
    if (message.role === 'user') {
      this.persistMessages();
    }
  }

  /**
   * Get all persisted messages
   */
  getMessages(): PersistentChatMessage[] {
    return [...this.messages];
  }

  /**
   * Clear all messages (user action)
   */
  clearMessages(): void {
    const previousCount = this.messages.length;
    this.messages = [];
    
    // Backup before clearing
    this.createBackup(`cleared_${previousCount}_messages`);
    
    // Clear storage
    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
      console.log('[ChatbotPersistence] Messages cleared by user');
    } catch (error) {
      console.error('[ChatbotPersistence] Error clearing messages:', error);
    }
  }

  /**
   * Get recent messages (for recovery context)
   */
  getRecentMessages(count: number = 50): PersistentChatMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Update message feedback
   */
  updateMessageFeedback(messageId: string, feedback: 'positive' | 'negative' | null): void {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.feedback = feedback;
      this.persistMessages();
    }
  }

  // ==========================================
  // PERSISTENCE & BACKUP
  // ==========================================

  /**
   * Persist messages to storage
   */
  private persistMessages(): void {
    try {
      const serialized = JSON.stringify(this.messages);
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, serialized);
      
      // Update data health
      this.updateDataHealth({
        lastPersisted: Date.now(),
        messageCount: this.messages.length,
        bytesUsed: new Blob([serialized]).size
      });
    } catch (error) {
      console.error('[ChatbotPersistence] Error persisting messages:', error);
      
      // If storage is full, trigger cleanup
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        console.warn('[ChatbotPersistence] Storage quota exceeded, triggering cleanup');
        this.cleanupOldMessages();
      }
    }
  }

  /**
   * Start automatic backup interval
   */
  private startAutomaticBackup(): void {
    if (this.backupIntervalId) clearInterval(this.backupIntervalId);
    
    this.backupIntervalId = setInterval(() => {
      if (this.messages.length > 0) {
        this.createBackup('auto');
      }
    }, CONFIG.BACKUP_INTERVAL);
  }

  /**
   * Create a backup of current messages
   */
  private createBackup(reason: string = 'auto'): void {
    // First, cleanup old backups to prevent quota issues
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(k => k.includes('cisco_sre_chatbot_backup_archive_backup_'));
      
      // Keep only the 5 most recent backups
      if (backupKeys.length > 5) {
        const sorted = backupKeys.sort().slice(0, -5);
        sorted.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            // Ignore individual removal errors
          }
        });
        console.log(`[ChatbotPersistence] Cleaned up ${sorted.length} old backups`);
      }
    } catch (cleanupError) {
      console.warn('[ChatbotPersistence] Cleanup error:', cleanupError);
    }
    
    try {
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const metadata: BackupMetadata = {
        backupId,
        timestamp: Date.now(),
        messageCount: this.messages.length,
        messagesSizeBytes: new Blob([JSON.stringify(this.messages)]).size,
        checksum: this.computeChecksum(this.messages),
        version: CONFIG.DATA_VERSION
      };
      
      // Store backup metadata
      const backups = this.getBackupHistory();
      backups.push(metadata);
      
      // Keep only recent backups
      if (backups.length > CONFIG.ARCHIVE_HISTORY_LIMIT) {
        backups.shift();
      }
      
      localStorage.setItem(STORAGE_KEYS.BACKUP_METADATA, JSON.stringify(backups));
      
      // Store backup data separately (rotate storage to avoid bloat)
      const backupData = {
        id: backupId,
        messages: this.messages,
        createdAt: Date.now()
      };
      localStorage.setItem(`${STORAGE_KEYS.BACKUP_ARCHIVE}_${backupId}`, JSON.stringify(backupData));
      
      console.log(`[ChatbotPersistence] Backup created: ${backupId} (${metadata.messageCount} messages, reason: ${reason})`);
    } catch (error) {
      console.error('[ChatbotPersistence] Error creating backup:', error);
    }
  }

  /**
   * Get backup history
   */
  private getBackupHistory(): BackupMetadata[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BACKUP_METADATA);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Restore from a specific backup
   */
  restoreFromBackup(backupId: string): boolean {
    try {
      const backupData = localStorage.getItem(`${STORAGE_KEYS.BACKUP_ARCHIVE}_${backupId}`);
      if (!backupData) {
        console.error(`[ChatbotPersistence] Backup not found: ${backupId}`);
        return false;
      }
      
      const parsed = JSON.parse(backupData);
      this.messages = parsed.messages || [];
      this.persistMessages();
      
      console.log(`[ChatbotPersistence] Restored ${this.messages.length} messages from backup ${backupId}`);
      return true;
    } catch (error) {
      console.error('[ChatbotPersistence] Error restoring from backup:', error);
      return false;
    }
  }

  /**
   * Cleanup old/large messages to free storage
   */
  private cleanupOldMessages(): void {
    const initialCount = this.messages.length;
    
    // Remove oldest 25% of messages
    const removeCount = Math.floor(this.messages.length * 0.25);
    this.messages = this.messages.slice(removeCount);
    
    this.persistMessages();
    console.log(`[ChatbotPersistence] Cleanup: Removed ${removeCount} old messages (${initialCount} → ${this.messages.length})`);
  }

  // ==========================================
  // DATA HEALTH & MONITORING
  // ==========================================

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckIntervalId) clearInterval(this.healthCheckIntervalId);
    
    this.healthCheckIntervalId = setInterval(() => {
      this.checkDataHealth();
    }, CONFIG.ZERO_DATA_CHECK_INTERVAL);
  }

  /**
   * Check for zero-data condition and trigger recovery
   */
  private checkDataHealth(): void {
    // Only flag zero-data AFTER the session has had messages before.
    // A fresh session with no prior messages is NORMAL — do NOT attempt recovery.
    const hasHadMessagesThisSession = this.zeroDataDetectedAt !== null || this.messages.length > 0;
    const hasPriorBackup = (() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
        return stored !== null;
      } catch { return false; }
    })();

    if (this.messages.length === 0 && this.recoveryAttempts < CONFIG.MAX_RECOVERY_ATTEMPTS && hasPriorBackup) {
      if (!this.zeroDataDetectedAt) {
        this.zeroDataDetectedAt = Date.now();
        console.warn('[ChatbotPersistence] Zero data condition detected!');
      }
      
      // Attempt automatic recovery
      this.attemptRecovery();
    } else if (this.messages.length > 0) {
      this.zeroDataDetectedAt = null;
      this.recoveryAttempts = 0;
    }
  }

  /**
   * Attempt to recover data
   */
  private attemptRecovery(): void {
    if (this.recoveryAttempts >= CONFIG.MAX_RECOVERY_ATTEMPTS) {
      console.error('[ChatbotPersistence] Max recovery attempts reached');
      return;
    }
    
    this.recoveryAttempts++;
    console.log(`[ChatbotPersistence] Attempting recovery (attempt ${this.recoveryAttempts}/${CONFIG.MAX_RECOVERY_ATTEMPTS})`);
    
    // Try to restore from latest backup
    const backups = this.getBackupHistory();
    if (backups.length > 0) {
      const latestBackup = backups[backups.length - 1];
      if (this.restoreFromBackup(latestBackup.backupId)) {
        console.log('[ChatbotPersistence] Successfully recovered from backup');
        this.recordRecovery('backup_restored');
        
        if (this.onDataRestored) {
          this.onDataRestored(this.messages);
        }
        return;
      }
    }
    
    // Try session storage
    try {
      const sessionData = sessionStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages = parsed;
          this.persistMessages();
          console.log('[ChatbotPersistence] Recovered from session storage');
          this.recordRecovery('session_storage');
          
          if (this.onDataRestored) {
            this.onDataRestored(this.messages);
          }
          return;
        }
      }
    } catch (error) {
      console.error('[ChatbotPersistence] Error trying session storage:', error);
    }
    
    console.warn('[ChatbotPersistence] Could not recover data');
  }

  /**
   * Get data health report
   */
  getDataHealthReport(): RecoveryReport {
    return {
      recovered: this.messages.length > 0,
      messageCount: this.messages.length,
      timestamp: Date.now(),
      source: this.getDataSource(),
      issues: this.detectIssues()
    };
  }

  /**
   * Detect data integrity issues
   */
  private detectIssues(): string[] {
    const issues: string[] = [];
    
    if (this.messages.length === 0) {
      issues.push('No messages found in storage');
    }
    
    if (this.recoveryAttempts > 0) {
      issues.push(`Recovery attempted ${this.recoveryAttempts} times`);
    }
    
    // Check for duplicate IDs
    const ids = new Set<string>();
    let duplicates = 0;
    for (const msg of this.messages) {
      if (ids.has(msg.id)) duplicates++;
      ids.add(msg.id);
    }
    if (duplicates > 0) {
      issues.push(`Found ${duplicates} duplicate message IDs`);
    }
    
    // Check for timestamp issues
    const invalidTimestamps = this.messages.filter(m => {
      const ts = typeof m.timestamp === 'number' ? m.timestamp : 0;
      return ts === 0 || ts < Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
    }).length;
    if (invalidTimestamps > 0) {
      issues.push(`Found ${invalidTimestamps} messages with invalid timestamps`);
    }
    
    return issues;
  }

  /**
   * Get data source
   */
  private getDataSource(): 'localStorage' | 'sessionStorage' | 'fresh' {
    if (this.messages.length === 0) return 'fresh';
    if (this.recoveryAttempts > 0) return 'sessionStorage';
    return 'localStorage';
  }

  /**
   * Update data health metadata
   */
  private updateDataHealth(health: any): void {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA_HEALTH) || '{}');
      const updated = { ...current, ...health };
      localStorage.setItem(STORAGE_KEYS.DATA_HEALTH, JSON.stringify(updated));
    } catch (error) {
      console.error('[ChatbotPersistence] Error updating data health:', error);
    }
  }

  /**
   * Log data health event
   */
  private logDataHealth(event: string): void {
    try {
      const log = {
        event,
        timestamp: Date.now(),
        messageCount: this.messages.length,
        sessionId: this.sessionId
      };
      console.log(`[ChatbotPersistence] Health event: ${event}`, log);
    } catch (error) {
      console.error('[ChatbotPersistence] Error logging health:', error);
    }
  }

  /**
   * Record zero-data recovery event
   */
  private recordRecovery(method: string): void {
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.ZERO_DATA_HISTORY) || '[]');
      history.push({
        timestamp: Date.now(),
        method,
        messageCount: this.messages.length,
        sessionId: this.sessionId
      });
      
      // Keep last 50 recovery events
      if (history.length > 50) {
        history.shift();
      }
      
      localStorage.setItem(STORAGE_KEYS.ZERO_DATA_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('[ChatbotPersistence] Error recording recovery:', error);
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Compute checksum of messages for integrity verification
   */
  private computeChecksum(messages: PersistentChatMessage[]): string {
    let hash = 0;
    const str = JSON.stringify(messages);
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Export messages for backup
   */
  exportMessages(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      messages: this.messages,
      exportedAt: new Date().toISOString(),
      version: CONFIG.DATA_VERSION
    }, null, 2);
  }

  /**
   * Import messages from backup file
   */
  importMessages(jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed.messages)) {
        throw new Error('Invalid backup format');
      }
      
      this.messages = parsed.messages;
      this.persistMessages();
      console.log(`[ChatbotPersistence] Imported ${this.messages.length} messages from backup`);
      return true;
    } catch (error) {
      console.error('[ChatbotPersistence] Error importing messages:', error);
      return false;
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const now = Date.now();
    const msPerHour = 60 * 60 * 1000;
    const msPerDay = 24 * msPerHour;
    
    return {
      totalMessages: this.messages.length,
      userMessages: this.messages.filter(m => m.role === 'user').length,
      assistantMessages: this.messages.filter(m => m.role === 'assistant').length,
      sessionAge: {
        ms: now - this.messages[0]?.timestamp || 0,
        hours: (now - (this.messages[0]?.timestamp || now)) / msPerHour,
        days: (now - (this.messages[0]?.timestamp || now)) / msPerDay
      },
      backupCount: this.getBackupHistory().length,
      recoveryAttempts: this.recoveryAttempts,
      storageSizeBytes: new Blob([JSON.stringify(this.messages)]).size
    };
  }

  /**
   * Set recovery callbacks
   */
  onDataRestoredCallback(callback: (messages: PersistentChatMessage[]) => void): void {
    this.onDataRestored = callback;
  }

  onZeroDataDetectedCallback(callback: (report: RecoveryReport) => void): void {
    this.onZeroDataDetected = callback;
  }

  onStorageUnavailableCallback(callback: () => void): void {
    this.onBytesUnavailable = callback;
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    if (this.backupIntervalId) clearInterval(this.backupIntervalId);
    if (this.healthCheckIntervalId) clearInterval(this.healthCheckIntervalId);
    console.log('[ChatbotPersistence] Service destroyed');
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

let persistenceInstance: ChatbotDataPersistence | null = null;

export const getChatbotDataPersistence = (sessionId: string): ChatbotDataPersistence => {
  if (!persistenceInstance) {
    persistenceInstance = new ChatbotDataPersistence(sessionId);
  }
  return persistenceInstance;
};

export const resetChatbotDataPersistence = (): void => {
  if (persistenceInstance) {
    persistenceInstance.destroy();
    persistenceInstance = null;
  }
};

export default ChatbotDataPersistence;
