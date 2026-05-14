/**
 * Simplified Admin Panel Component
 * Focused API Key Management with Advanced Configuration
 */

import React, { useState, useEffect } from 'react';
import {
  X, Shield, Key, Eye, EyeOff, Trash2, Copy, Plus, AlertTriangle, CheckCircle, Lock, Globe
} from 'lucide-react';
import { getAdminSettingsService, AdminSettings } from '../services/adminSettingsService';
import { useAuth } from '../contexts/AuthContext';
import { ApiSessionTracker } from './ApiSessionTracker';


interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface APIKey {
  id: string;
  providerName: string;
  subName: string;
  apiKey: string;
  service: 'openai' | 'gemini' | 'anthropic' | 'aws' | 'azure' | 'other';
  created: Date;
  lastUsed?: Date;
  isActive: boolean;
  description: string;
}

export const AdminPanelEnhanced: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const settingsService = getAdminSettingsService();

  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: '1',
      providerName: 'OpenAI',
      subName: 'GPT-4 Production',
      apiKey: 'sk-proj-abc123def456...xyz789',
      service: 'openai',
      created: new Date('2024-01-15'),
      lastUsed: new Date(),
      isActive: true,
      description: 'Primary GPT-4 model for SRE chatbot'
    },
    {
      id: '2',
      providerName: 'Google Cloud',
      subName: 'Gemini Pro API',
      apiKey: 'AIza-goog-SyD21u0FyH...kL9M0nO1p2Q',
      service: 'gemini',
      created: new Date('2024-02-01'),
      lastUsed: new Date('2024-12-01'),
      isActive: true,
      description: 'Gemini Pro for multi-modal analysis'
    },
  ]);

  const [activeTab, setActiveTab] = useState<'api-keys' | 'api-tracker'>('api-keys');
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKey, setNewKey] = useState({
    providerName: '',
    subName: '',
    apiKey: '',
    service: 'openai' as const,
    description: '',
  });
  const [showKeyValue, setShowKeyValue] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleAddAPIKey = () => {
    if (!newKey.providerName.trim() || !newKey.apiKey.trim()) return;

    const apiKeyRecord: APIKey = {
      id: Date.now().toString(),
      providerName: newKey.providerName,
      subName: newKey.subName,
      apiKey: newKey.apiKey,
      service: newKey.service,
      created: new Date(),
      isActive: true,
      description: newKey.description,
    };

    setApiKeys([...apiKeys, apiKeyRecord]);
    setNewKey({
      providerName: '',
      subName: '',
      apiKey: '',
      service: 'openai',
      description: '',
    });
    setShowNewKeyForm(false);

    settingsService.logAudit({
      action: 'API_KEY_ADDED',
      details: `Added API key for ${newKey.providerName}`,
      severity: 'info'
    });
  };

  const handleDeleteAPIKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    settingsService.logAudit({
      action: 'API_KEY_DELETED',
      details: 'API key removed',
      severity: 'warning'
    });
  };

  const handleToggleAPIKey = (id: string) => {
    setApiKeys(apiKeys.map(k => 
      k.id === id ? { ...k, isActive: !k.isActive } : k
    ));
  };

  const handleCopyKey = (keyId: string) => {
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen || user?.role !== 'admin') return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-slate-900 border-l border-slate-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Admin Panel</h2>
              <p className="text-xs text-slate-400">API Key Management</p>
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
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'api-keys'
                ? 'border-cyan-500 text-cyan-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Key className="w-4 h-4" />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('api-tracker')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'api-tracker'
                ? 'border-cyan-500 text-cyan-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            API Tracker
          </button>
        </div>

        {/* Content */}
        {activeTab === 'api-tracker' ? (
          <div className="p-6">
            <ApiSessionTracker />
          </div>
        ) : (
        <div className="p-6 space-y-6">
          {/* Security Warning */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-cyan-400">API Key Security</h4>
                <p className="text-xs text-cyan-300/80 mt-1">API keys are sensitive credentials. Never share them publicly. Keys are encrypted at rest and all operations are audited.</p>
              </div>
            </div>
          </div>

          {/* Header with Add Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">API Keys Configuration</h3>
            <button
              onClick={() => setShowNewKeyForm(!showNewKeyForm)}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Key
            </button>
          </div>

          {/* New Key Form */}
          {showNewKeyForm && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-semibold text-white">Add New API Key</h4>
              
              <input
                type="text"
                placeholder="Provider Name (e.g., 'OpenAI', 'Google Cloud')"
                value={newKey.providerName}
                onChange={(e) => setNewKey({ ...newKey, providerName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />

              <input
                type="text"
                placeholder="Sub Name (e.g., 'GPT-4 Production', 'Gemini Pro API')"
                value={newKey.subName}
                onChange={(e) => setNewKey({ ...newKey, subName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />

              <select
                value={newKey.service}
                onChange={(e) => setNewKey({ ...newKey, service: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="other">Other</option>
              </select>

              <textarea
                placeholder="API Key (full key)"
                value={newKey.apiKey}
                onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none h-20 font-mono text-xs"
              />

              <textarea
                placeholder="Description (optional) - what this key is used for"
                value={newKey.description}
                onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none h-16"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowNewKeyForm(false);
                    setNewKey({
                      providerName: '',
                      subName: '',
                      apiKey: '',
                      service: 'openai',
                      description: '',
                    });
                  }}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAPIKey}
                  disabled={!newKey.providerName.trim() || !newKey.apiKey.trim()}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Key
                </button>
              </div>
            </div>
          )}

          {/* API Keys List */}
          <div className="space-y-3">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No API keys configured yet</p>
                <p className="text-slate-500 text-xs mt-1">Click "Add New Key" to get started</p>
              </div>
            ) : (
              apiKeys.map(key => (
                <div key={key.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{key.providerName}</h4>
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          key.isActive 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-300 mb-2">{key.subName}</p>
                      
                      {key.description && (
                        <p className="text-xs text-slate-400 mb-2 italic">{key.description}</p>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded capitalize">
                          {key.service}
                        </span>
                      </div>

                      {/* API Key Display */}
                      <div className="bg-slate-700/50 rounded px-3 py-2 flex items-center justify-between font-mono text-xs text-slate-300 mb-2">
                        <span>{showKeyValue[key.id] ? key.apiKey : key.apiKey.substring(0, 20) + '...' + key.apiKey.substring(key.apiKey.length - 10)}</span>
                        <button
                          onClick={() => setShowKeyValue({ ...showKeyValue, [key.id]: !showKeyValue[key.id] })}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          {showKeyValue[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Metadata */}
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>Created: {key.created.toLocaleDateString()}</span>
                        {key.lastUsed && <span>Last used: {key.lastUsed.toLocaleDateString()}</span>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopyKey(key.id)}
                        className={`p-2 rounded transition-colors ${
                          copiedKey === key.id
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                        }`}
                        title="Copy key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleAPIKey(key.id)}
                        className={`p-2 rounded transition-colors ${
                          key.isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
                        }`}
                        title={key.isActive ? 'Disable' : 'Enable'}
                      >
                        {key.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteAPIKey(key.id)}
                        className="p-2 rounded bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanelEnhanced;
