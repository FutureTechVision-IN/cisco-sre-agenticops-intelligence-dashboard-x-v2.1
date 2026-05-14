/**
 * DataHealthIndicator - Shows real-time data health status in the dashboard header
 * Features: sync status, coverage indicator, auto-refresh toggle
 */
import React, { useState } from 'react';
import { Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle, Database, Clock } from 'lucide-react';
import { useDataSync } from '../hooks/useDataSync';

export function DataHealthIndicator() {
  const { health, isSyncing, lastSyncAt, autoRefreshEnabled, forceRefresh, toggleAutoRefresh } = useDataSync(120000);
  const [showDetails, setShowDetails] = useState(false);

  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Healthy' },
    degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', label: 'Degraded' },
    unhealthy: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Unhealthy' },
    loading: { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', label: 'Loading' },
  };

  const status = statusConfig[health?.status || 'loading'];
  const StatusIcon = status.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 ${status.bg} border ${status.border} rounded-lg text-xs transition-all hover:opacity-80`}
      >
        <StatusIcon className={`w-3.5 h-3.5 ${status.color} ${!health ? 'animate-pulse' : ''}`} />
        <span className={`${status.color} font-bold`}>{status.label}</span>
        {health && (
          <span className="text-slate-500 ml-1">
            {health.recordCount > 0 ? `${(health.recordCount / 1000).toFixed(0)}K` : '0'}
          </span>
        )}
        {isSyncing && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />}
      </button>

      {/* Dropdown Details */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Data Health Status
            </h4>
            <button
              onClick={async (e) => { e.stopPropagation(); await forceRefresh(); }}
              disabled={isSyncing}
              className="p-1.5 bg-cyan-600/30 rounded-lg hover:bg-cyan-600/50 transition-colors disabled:opacity-50"
              title="Force Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {health ? (
            <div className="space-y-2.5">
              <DetailRow label="Status" value={health.status.toUpperCase()} color={status.color} />
              <DetailRow label="Records" value={health.recordCount.toLocaleString()} />
              <DetailRow label="Customers" value={health.customerCount.toLocaleString()} />
              <DetailRow label="Field Notices" value={health.fieldNoticeCount.toLocaleString()} />
              <DetailRow label="Months" value={String(health.monthCount)} />
              <DetailRow label="Data Range" value={health.dataRange} />
              <DetailRow 
                label="Coverage" 
                value={`${health.coveragePercent.toFixed(0)}%`} 
                color={health.coveragePercent === 100 ? 'text-emerald-400' : 'text-amber-400'} 
              />
              {health.lastLoaded && (
                <DetailRow label="Last Loaded" value={new Date(health.lastLoaded).toLocaleTimeString()} />
              )}
              {health.validationErrors.length > 0 && (
                <div className="pt-2 border-t border-slate-700">
                  <p className="text-xs text-red-400 font-bold mb-1">Validation Errors:</p>
                  {health.validationErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-300">{err}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Loading health data...</p>
          )}

          <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
            <button
              onClick={(e) => { e.stopPropagation(); toggleAutoRefresh(); }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Auto-refresh: <span className={autoRefreshEnabled ? 'text-emerald-400' : 'text-slate-500'}>{autoRefreshEnabled ? 'ON' : 'OFF'}</span>
            </button>
            {lastSyncAt && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {new Date(lastSyncAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-bold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}
