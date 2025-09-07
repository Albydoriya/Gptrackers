import React from 'react';
import { useState } from 'react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users,
  UserCheck, 
  TrendingUp, 
  Truck,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserProfile from './UserProfile';
import NotificationPanel from './NotificationPanel';
import GlobalSearch from './GlobalSearch';
import { useNotifications } from '../hooks/useNotifications';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { hasPermission } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    isLoading: notificationsLoading,
    error: notificationsError,
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll,
    refetch: refetchNotifications
  } = useNotifications();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, permission: { resource: 'orders', action: 'read' } },
    { id: 'parts', label: 'Parts Catalog', icon: Package, permission: { resource: 'parts', action: 'read' } },
    { id: 'suppliers', label: 'Suppliers', icon: UserCheck, permission: { resource: 'suppliers', action: 'read' } },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, permission: { resource: 'analytics', action: 'read' } },
    { id: 'tracking', label: 'Status Tracking', icon: Truck, permission: { resource: 'orders', action: 'read' } },
    { id: 'users', label: 'User Management', icon: Users, permission: { resource: 'users', action: 'manage' } },
  ];

  const visibleNavItems = navItems.filter(item => 
    !item.permission || hasPermission(item.permission.resource, item.permission.action)
  );

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-12">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-6">
                {/* Logo Section */}
                <div className="flex items-center space-x-3">
                  <img
                    src="https://libaopwjoduzlkvhtukb.supabase.co/storage/v1/object/public/company-assets//GoParts.png"
                    alt="GoParts Logo"
                    className="h-10 w-auto object-contain rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                  />
                  
                  {/* System Title */}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">GoParts</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium leading-tight">
                      Parts Tracking System
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Vertical Separator */}
              <div className="hidden lg:block h-8 w-px"></div>
            </div>
            
            <div className="hidden md:flex space-x-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <GlobalSearch onTabChange={onTabChange} />
            
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-medium text-white bg-red-500 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <UserProfile />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 py-3 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-medium ${
                  activeTab === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      </nav>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        isLoading={notificationsLoading}
        error={notificationsError}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDeleteNotification={deleteNotification}
        onClearAll={clearAll}
        onRefetch={refetchNotifications}
      />
    </>
  );
};

export default Navigation;