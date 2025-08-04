import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Settings, 
  Shield, 
  Clock,
  ChevronDown,
  Badge,
  Building,
  Mail,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AccountSettings from './AccountSettings';

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'buyer':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-600">
            <span className="text-white text-sm font-semibold">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </span>
          </div>
        )}
        <div className="hidden md:block text-left min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role.displayName}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-16 w-16 rounded-full object-cover ring-4 ring-white dark:ring-gray-600 shadow-lg"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ring-4 ring-white dark:ring-gray-600 shadow-lg">
                  <span className="text-white text-lg font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{user.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Mail className="h-3 w-3" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleColor(user.role.name)}`}>
                    <Shield className="h-3 w-3 mr-1" />
                    {user.role.displayName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="p-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">Account Details</h4>
            <div className="grid grid-cols-1 gap-4">
              {user.department && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Department</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Your organizational unit</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.department}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Last Login</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Most recent session</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatLastLogin(user.lastLogin)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Badge className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Permissions</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Access level granted</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.permissions.length} granted</span>
              </div>
            </div>
          </div>

          {/* Permissions List */}
          <div className="px-6 pb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wide">Your Permissions</h4>
            <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              {user.permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{permission.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-600 px-2 py-0.5 rounded">{permission.resource}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={() => {
                setIsAccountSettingsOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm rounded-lg transition-all duration-200 mb-2"
            >
              <div className="p-1 bg-gray-200 dark:bg-gray-600 rounded">
                <Settings className="h-4 w-4" />
              </div>
              <span>Account Settings</span>
              <ChevronDown className="h-4 w-4 ml-auto rotate-[-90deg] text-gray-400 dark:text-gray-500" />
            </button>
            <button
              onClick={signOut}
              className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-sm rounded-lg transition-all duration-200"
            >
              <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
                <LogOut className="h-4 w-4" />
              </div>
              <span>Sign Out</span>
              <ChevronDown className="h-4 w-4 ml-auto rotate-[-90deg] text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      <AccountSettings
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />
    </div>
  );
};

export default UserProfile;