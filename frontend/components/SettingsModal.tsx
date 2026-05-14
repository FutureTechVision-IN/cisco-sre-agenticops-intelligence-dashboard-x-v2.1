/**
 * Settings Modal Component
 * Displays user preferences and application settings
 */

import React, { useState, useEffect } from 'react';
import { X, Settings, Volume2, Bell, Eye, Zap, Moon } from 'lucide-react';
import { useTheme, Theme } from '../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme: currentTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    theme: currentTheme as string,
    notifications: true,
    soundEnabled: true,
    voiceOutput: true,
    autoRefresh: true,
    refreshInterval: 60,
    compactView: false,
    animationsEnabled: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
    }));
  };

  const handleChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    // Wire theme dropdown to the real ThemeContext
    if (key === 'theme') {
      if (value === 'auto') {
        // Respect system preference
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(sys as Theme);
      } else {
        setTheme(value as Theme);
      }
    }
  };

  // Sync dropdown when theme changes externally (e.g. toggle button)
  useEffect(() => {
    setSettings(prev => ({ ...prev, theme: currentTheme }));
  }, [currentTheme]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Display Settings */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Display</h3>

            {/* Theme */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4 text-slate-500" />
                  <label className="text-sm font-medium text-white">Theme</label>
                </div>
                <select
                  value={settings.theme}
                  onChange={(e) => handleChange('theme', e.target.value)}
                  className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            {/* Compact View */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Compact View</label>
                <button
                  onClick={() => handleToggle('compactView')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.compactView ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.compactView ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Animations */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Animations</label>
                <button
                  onClick={() => handleToggle('animationsEnabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.animationsEnabled ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-white mb-4">Notifications</h3>

            {/* Enable Notifications */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <label className="text-sm font-medium text-white">Enable Notifications</label>
                </div>
                <button
                  onClick={() => handleToggle('notifications')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Sound */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-slate-500" />
                  <label className="text-sm font-medium text-white">Sound Alerts</label>
                </div>
                <button
                  onClick={() => handleToggle('soundEnabled')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.soundEnabled ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Voice Settings */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-white mb-4">Voice</h3>

            {/* Voice Output */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Voice Output</label>
                <button
                  onClick={() => handleToggle('voiceOutput')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.voiceOutput ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.voiceOutput ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-white mb-4">Performance</h3>

            {/* Auto Refresh */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-slate-500" />
                  <label className="text-sm font-medium text-white">Auto Refresh</label>
                </div>
                <button
                  onClick={() => handleToggle('autoRefresh')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoRefresh ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {settings.autoRefresh && (
                <div className="mt-3">
                  <label className="text-xs text-slate-400 block mb-2">Refresh Interval (seconds)</label>
                  <input
                    type="number"
                    value={settings.refreshInterval}
                    onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                    min="10"
                    max="300"
                    step="10"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="border-t border-slate-700 pt-6">
            <p className="text-xs text-slate-400 text-center">
              Changes are saved automatically to your local preferences
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
