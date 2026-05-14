import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield, Settings, Bell, ChevronDown } from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { SettingsModal } from './SettingsModal';
import { NotificationsModal } from './NotificationsModal';
import { AdminPanelEnhanced } from './AdminPanelEnhanced';

interface UserMenuProps {
  collapsed?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({ collapsed = false }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = React.useState(false);
  const [showAdminPanel, setShowAdminPanel] = React.useState(false);

  if (!user) return null;

  const roleColors: Record<string, string> = {
    admin: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    manager: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    director: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    user: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  const roleColor = roleColors[user.role] || roleColors.user;

  // Prefer username (lowercase) if available, otherwise fall back to `sre-<role>` lowercase
  const displayUserLine = user.username ? user.username.toLowerCase() : `sre-${(user.role || 'user').toLowerCase()}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 
                   hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-300 group"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <User className="w-4 h-4 text-white" />
        </div>

        {!collapsed && (
          <>
            {/* User Info: show SREI-<role> on a single line */}
            <div className="text-left">
              <div className="text-sm font-medium text-white whitespace-nowrap">{displayUserLine}</div>
            </div>

            {/* Dropdown Arrow */}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r from-cyan-500/5 to-transparent">
              <div className="text-sm font-medium text-white whitespace-nowrap">{displayUserLine}</div>
              <div className="text-xs text-slate-400">{user.email || 'No email set'}</div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button 
                onClick={() => {
                  setShowProfileModal(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Profile</span>
              </button>
              <button 
                onClick={() => {
                  setShowSettingsModal(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Settings</span>
              </button>
              <button 
                onClick={() => {
                  setShowNotificationsModal(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
              >
                <Bell className="w-4 h-4 text-slate-400" />
                <span className="text-sm">Notifications</span>
                <span className="ml-auto px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded">3</span>
              </button>
              {user.role === 'admin' && (
                <button 
                  onClick={() => {
                    setShowAdminPanel(true);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Admin Panel</span>
                </button>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-slate-700/50 py-2">
              <button 
                onClick={logout}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)}
      />
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
      />
      <NotificationsModal 
        isOpen={showNotificationsModal} 
        onClose={() => setShowNotificationsModal(false)}
      />
      {user?.role === 'admin' && (
        <AdminPanelEnhanced 
          isOpen={showAdminPanel} 
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
};

export default UserMenu;
