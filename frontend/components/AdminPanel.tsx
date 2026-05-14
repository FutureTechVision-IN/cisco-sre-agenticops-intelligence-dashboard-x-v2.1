/**
 * Admin Panel Component
 * Manages administrative settings, audit logs, and system configuration
 */

import React, { useState, useEffect } from 'react';
import {
  X, Settings, Shield, Database, Users, BarChart3, LogOut, ChevronRight,
  Toggle, Eye, EyeOff, Download, Trash2, RefreshCw, AlertTriangle, 
  CheckCircle, Lock, Search, Calendar, User, Clock, Filter
} from 'lucide-react';
import { getAdminSettingsService, AdminSettings, AuditLogEntry } from '../services/adminSettingsService';
import { useAuth } from '../contexts/AuthContext';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const settingsService = getAdminSettingsService();

  const [activeTab, setActiveTab] = useState<'settings' | 'audit' | 'security'>('settings');
  const [settings, setSettings] = useState<AdminSettings>(settingsService.getSettings());
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<'all' | 'settings' | 'security' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showAuditExport, setShowAuditExport] = useState(false);
  const [auditStats, setAuditStats] = useState<any>(null);

  // Load audit log on mount
  useEffect(() => {
    if (isOpen) {
      loadAuditLog();
      loadAuditStats();
      const unsubscribe = settingsService.onSettingsChange((newSettings) => {
        setSettings(newSettings);
      });
      return unsubscribe;
    }
  }, [isOpen]);

  const loadAuditLog = () => {
    const logs = settingsService.getAuditLog(100);
    setAuditLog(logs);
  };

  const loadAuditStats = () => {
    const stats = settingsService.getAuditLogStats();
    setAuditStats(stats);
  };

  const handleSettingChange = <K extends keyof AdminSettings>(
    key: K,
    value: AdminSettings[K]
  ) => {
    if (user) {
      settingsService.updateSetting(key, value, user.userId, user.username);
      setSettings(settingsService.getSettings());
    }
  };

  const handleResetSettings = () => {
    if (user && showConfirmReset) {
      settingsService.resetToDefaults(user.userId, user.username);
      setSettings(settingsService.getSettings());
      setShowConfirmReset(false);
    }
  };

  const handleExportAuditLog = () => {
    const csv = settingsService.exportAuditLogAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClearAuditLog = () => {
    if (user) {
      settingsService.clearAuditLog(user.userId, user.username);
      loadAuditLog();
      loadAuditStats();
    }
  };

  const filteredAuditLog = auditLog.filter(entry => {
    const matchesFilter = auditFilter === 'all' || entry.category === auditFilter;
    const matchesSearch = searchQuery === '' || 
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!isOpen || user?.role !== 'admin') return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-4xl bg-slate-900 border-l border-slate-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              <p className="text-xs text-slate-400">System administration & audit logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-700">
          {(['settings', 'audit', 'security'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-cyan-500 text-cyan-400 bg-slate-800/50'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab === 'settings' && 'Settings'}
              {tab === 'audit' && 'Audit Log'}
              {tab === 'security' && 'Security'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-4">Display Settings</h3>
                
                {/* Expand Suggestions */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">Expand Suggestions by Default</label>
                      <p className="text-xs text-slate-400 mt-1">Show all "Try asking" suggestions expanded on initial load</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('expandSuggestionsByDefault', !settings.expandSuggestionsByDefault)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.expandSuggestionsByDefault ? 'bg-cyan-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.expandSuggestionsByDefault ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Cisco Branding Style */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                  <label className="text-sm font-medium text-white block mb-3">Cisco CIRCUIT AI Branding</label>
                  <div className="space-y-2">
                    {(['minimal', 'prominent', 'full'] as const).map(style => (
                      <button
                        key={style}
                        onClick={() => handleSettingChange('cisconBrandingStyle', style)}
                        className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                          settings.cisconBrandingStyle === style
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                            : 'border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border ${
                              settings.cisconBrandingStyle === style
                                ? 'bg-cyan-500 border-cyan-500'
                                : 'border-slate-500'
                            }`}
                          />
                          <span className="capitalize text-sm font-medium">{style}</span>
                          <span className="text-xs text-slate-500 ml-auto">
                            {style === 'minimal' && 'Subtle branding'}
                            {style === 'prominent' && 'Clearly visible'}
                            {style === 'full' && 'Maximum emphasis'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Branding Position */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <label className="text-sm font-medium text-white block mb-3">Branding Position</label>
                  <div className="space-y-2">
                    {(['header', 'footer', 'both'] as const).map(position => (
                      <button
                        key={position}
                        onClick={() => handleSettingChange('cisconBrandingPosition', position)}
                        className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                          settings.cisconBrandingPosition === position
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                            : 'border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border ${
                              settings.cisconBrandingPosition === position
                                ? 'bg-cyan-500 border-cyan-500'
                                : 'border-slate-500'
                            }`}
                          />
                          <span className="capitalize text-sm font-medium">{position}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-sm font-semibold text-white mb-4">System Settings</h3>

                {/* Audit Logging */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">Enable Audit Logging</label>
                      <p className="text-xs text-slate-400 mt-1">Log all administrative actions and security events</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('auditLoggingEnabled', !settings.auditLoggingEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.auditLoggingEnabled ? 'bg-green-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.auditLoggingEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Admin Notifications */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">Admin Notifications</label>
                      <p className="text-xs text-slate-400 mt-1">Receive alerts for security events and system issues</p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('adminNotificationsEnabled', !settings.adminNotificationsEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.adminNotificationsEnabled ? 'bg-amber-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.adminNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Section */}
              <div className="border-t border-slate-700 pt-6">
                {!showConfirmReset ? (
                  <button
                    onClick={() => setShowConfirmReset(true)}
                    className="w-full px-4 py-2.5 flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset to Defaults
                  </button>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-sm text-red-400 mb-3">Are you sure? This will reset all admin settings to defaults.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleResetSettings}
                        className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
                      >
                        Confirm Reset
                      </button>
                      <button
                        onClick={() => setShowConfirmReset(false)}
                        className="flex-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded text-slate-300 hover:text-white transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              {/* Stats */}
              {auditStats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-cyan-400">{auditStats.totalEntries}</div>
                    <div className="text-xs text-slate-400 mt-1">Total Entries</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">{auditStats.entriesByStatus.success || 0}</div>
                    <div className="text-xs text-slate-400 mt-1">Successful</div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-400">{auditStats.entriesByStatus.failure || 0}</div>
                    <div className="text-xs text-slate-400 mt-1">Failed</div>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search audit log..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Events</option>
                  <option value="settings">Settings</option>
                  <option value="security">Security</option>
                  <option value="system">System</option>
                </select>
                <button
                  onClick={handleExportAuditLog}
                  className="px-4 py-2 flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 transition-colors"
                  title="Export as CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Audit Log Entries */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredAuditLog.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No audit log entries found</p>
                  </div>
                ) : (
                  filteredAuditLog.map(entry => (
                    <div
                      key={entry.id}
                      className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            entry.status === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {entry.status === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{entry.action}</span>
                            <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded capitalize">
                              {entry.category}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {entry.username} • {new Date(entry.timestamp).toLocaleString()}
                          </div>
                          {entry.errorMessage && (
                            <div className="text-xs text-red-400 mt-1">{entry.errorMessage}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Clear Log Button */}
              {auditLog.length > 0 && (
                <button
                  onClick={handleClearAuditLog}
                  className="w-full mt-4 px-4 py-2 flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Audit Log
                </button>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400">Security Status</h3>
                    <p className="text-xs text-blue-300 mt-1">
                      All security features are operational. Role-based access control is enforced.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-white">Session Token</span>
                    </div>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Active</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Your session is secure and encrypted</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-medium text-white">Role-Based Access Control</span>
                    </div>
                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">Enabled</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Admin-only functions protected</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-white">Audit Logging</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      settings.auditLoggingEnabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {settings.auditLoggingEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">All admin actions are logged</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
