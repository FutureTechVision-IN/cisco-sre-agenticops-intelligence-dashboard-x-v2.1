/**
 * Notifications Modal Component
 * Displays system notifications and security alerts
 */

import React, { useState } from 'react';
import { X, Bell, AlertTriangle, CheckCircle, Info, Trash2, Clock } from 'lucide-react';

interface Notification {
  id: string;
  type: 'alert' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'alert',
      title: 'Critical Vulnerability Detected',
      message: 'A critical severity vulnerability has been identified in your environment. Immediate action required.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      type: 'success',
      title: 'Patch Management Complete',
      message: 'Monthly patch deployment completed successfully. 847 systems updated.',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '3',
      type: 'info',
      title: 'System Maintenance Scheduled',
      message: 'Scheduled maintenance window on Dec 5, 2025 from 2:00 AM to 4:00 AM UTC.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: '4',
      type: 'success',
      title: 'Compliance Report Generated',
      message: 'Monthly compliance report is ready for review. 94% compliance score.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: '5',
      type: 'info',
      title: 'New Field Notice Released',
      message: 'Cisco PSIRT has released 3 new field notices today. Review recommended.',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNotificationBg = (type: Notification['type']) => {
    switch (type) {
      case 'alert':
        return 'bg-red-500/10 border-red-500/30';
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="ml-2 px-2.5 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Controls */}
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleMarkAllAsRead}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded text-slate-300 hover:text-white transition-colors"
              >
                Mark All Read
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-800/50 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded text-slate-300 hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No notifications</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 transition-colors ${
                  notification.read
                    ? 'bg-slate-800/30 border-slate-700'
                    : `${getNotificationBg(notification.type)} border`
                }`}
              >
                <div className="flex gap-3 mb-2">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">{notification.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notification.message}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="flex-shrink-0 p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500 hover:text-slate-400" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(notification.timestamp)}
                  </span>
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
