'use client';

import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useRealtimeNotifications } from '@/lib/hooks/useRealTimeData';

interface NotificationProps {
  tenantId: string;
}

export function RealTimeNotifications({ tenantId }: NotificationProps) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    clearAll 
  } = useRealtimeNotifications(tenantId);
  
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-400 hover:text-white transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-neutral-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 max-h-96 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-neutral-600" />
                <h3 className="font-semibold text-neutral-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-neutral-500 hover:text-neutral-700"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="p-2">
                  {displayedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border mb-2 transition-all cursor-pointer ${
                        notification.read 
                          ? 'bg-neutral-50 border-neutral-200' 
                          : getBackgroundColor(notification.type)
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {getIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`text-sm font-medium ${
                              notification.read ? 'text-neutral-700' : 'text-neutral-900'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-amber-500 rounded-full" />
                            )}
                          </div>
                          <p className={`text-xs ${
                            notification.read ? 'text-neutral-500' : 'text-neutral-700'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {notifications.length > 5 && !showAll && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full p-2 text-sm text-neutral-600 hover:text-neutral-800 border-t border-neutral-200"
                    >
                      Show {notifications.length - 5} more notifications
                    </button>
                  )}
                  
                  {showAll && notifications.length > 5 && (
                    <button
                      onClick={() => setShowAll(false)}
                      className="w-full p-2 text-sm text-neutral-600 hover:text-neutral-800 border-t border-neutral-200"
                    >
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Toast notifications for immediate feedback
export function ToastNotification({ 
  type, 
  title, 
  message, 
  onClose 
}: {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white border rounded-lg shadow-lg ${
      type === 'success' ? 'border-green-200' :
      type === 'warning' ? 'border-amber-200' :
      type === 'error' ? 'border-red-200' :
      'border-blue-200'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />}
          {type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />}
          {type === 'error' && <XCircle className="h-5 w-5 text-red-500 mt-0.5" />}
          {type === 'info' && <Info className="h-5 w-5 text-blue-500 mt-0.5" />}
          
          <div className="flex-1">
            <h4 className="text-sm font-medium text-neutral-900">{title}</h4>
            <p className="text-sm text-neutral-600 mt-1">{message}</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Global toast provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
  }>>([]);

  const addToast = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Expose addToast globally
  useEffect(() => {
    (window as any).addToast = addToast;
  }, []);

  return (
    <>
      {children}
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}