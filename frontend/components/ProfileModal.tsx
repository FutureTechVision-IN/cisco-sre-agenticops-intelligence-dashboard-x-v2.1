/**
 * Profile Modal Component
 * Displays user profile information and account details
 */

import React from 'react';
import { X, User, Mail, Shield, Calendar, Globe } from 'lucide-react';
import { User as UserType } from '../contexts/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    admin: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Administrator' },
    manager: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Manager' },
    director: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Director' },
    viewer: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Viewer' },
  };

  const roleInfo = roleColors[user.role] || roleColors.viewer;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar & Name */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <User className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">{user.username}</h3>
            <p className="text-sm text-slate-400 mt-1">{user.email || 'No email set'}</p>
          </div>

          {/* Role Badge intentionally hidden to avoid exposing uppercase 'ADMIN' label */}
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30">
              <span className="text-sm font-semibold text-slate-300 tracking-wider">
                {user.username}
              </span>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white">Account Information</h4>

            {/* User ID */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-medium text-slate-400 uppercase">User ID</label>
              </div>
              <p className="text-sm text-slate-300 break-all font-mono">{user.userId}</p>
            </div>

            {/* Email */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-medium text-slate-400 uppercase">Email Address</label>
              </div>
              <p className="text-sm text-slate-300">{user.email || 'Not configured'}</p>
            </div>

            {/* Role section intentionally hidden */}

            {/* Organization */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-medium text-slate-400 uppercase">Organization</label>
              </div>
              <p className="text-sm text-slate-300">Cisco Systems</p>
            </div>

            {/* Session Token */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-medium text-slate-400 uppercase">Session Status</label>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm text-green-400">Active</p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4 border-t border-slate-700 pt-6">
            <h4 className="text-sm font-semibold text-white">Permissions</h4>
            <div className="space-y-2">
              {user.role === 'admin' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Full system administration access
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    View and manage all audit logs
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Configure system settings
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Manage user accounts
                  </div>
                </>
              )}
              {user.role === 'manager' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    View reports and analytics
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Manage team members
                  </div>
                </>
              )}
              {user.role === 'viewer' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    View dashboard data
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Access read-only reports
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
