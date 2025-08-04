import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Save, 
  X, 
  Shield, 
  Mail, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Settings,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'buyer' | 'viewer';
  department: string | null;
  phone: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  email?: string; // From auth.users
}

const UserManagement: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roles = [
    { value: 'admin', label: 'System Administrator', color: 'bg-red-100 text-red-800 border-red-200' },
    { value: 'manager', label: 'Procurement Manager', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'buyer', label: 'Procurement Buyer', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'viewer', label: 'Read-Only User', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  ];

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all user profiles with email from auth.users via a join or separate query
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // For each profile, try to get the email from the current user or use a placeholder
      const usersWithEmails = profiles?.map(profile => ({
        ...profile,
        email: profile.id === user?.id ? user.email : 'user@example.com' // We can't access other users' emails from client
      })) || [];

      setUsers(usersWithEmails);
      setFilteredUsers(usersWithEmails);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('users', 'manage')) {
      fetchUsers();
    }
  }, [hasPermission]);

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'manager' | 'buyer' | 'viewer') => {
    setIsUpdating(userId);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole, updated_at: new Date().toISOString() }
          : user
      ));

      const updatedUser = users.find(u => u.id === userId);
      setSuccess(`Successfully updated ${updatedUser?.full_name || 'user'}'s role to ${roles.find(r => r.value === newRole)?.label}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setIsUpdating(null);
    }
  };

  const getRoleInfo = (role: string) => {
    return roles.find(r => r.value === role) || roles[3]; // Default to viewer
  };

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never';
    return new Date(lastLogin).toLocaleString();
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (!hasPermission('users', 'manage')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 max-w-md">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full w-fit mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">Access Denied</h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            You need administrator privileges to manage user accounts.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Contact your system administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-300">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((userProfile) => {
                  const roleInfo = getRoleInfo(userProfile.role);
                  const isCurrentUser = userProfile.id === user?.id;
                  
                  return (
                    <tr key={userProfile.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {userProfile.avatar_url ? (
                            <img
                              src={userProfile.avatar_url}
                              alt={userProfile.full_name || 'User'}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-600">
                              <span className="text-white text-sm font-semibold">
                                {getInitials(userProfile.full_name, userProfile.email || '')}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {userProfile.full_name || 'Unnamed User'}
                              </p>
                              {isCurrentUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleInfo.color}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {roleInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {userProfile.department || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatLastLogin(userProfile.last_login)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <select
                            value={userProfile.role}
                            onChange={(e) => updateUserRole(userProfile.id, e.target.value as any)}
                            disabled={isUpdating === userProfile.id || isCurrentUser}
                            className={`px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                              isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {roles.map(role => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          {isUpdating === userProfile.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                          )}
                          {isCurrentUser && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              (Cannot modify own role)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && !isLoading && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || roleFilter !== 'all' ? 'No matching users found' : 'No users found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search criteria or filters'
                  : 'Users will appear here once they sign up for accounts'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {roles.map(role => {
          const count = users.filter(u => u.role === role.value).length;
          return (
            <div key={role.value} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{role.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
                </div>
                <div className={`p-3 rounded-lg ${role.color.replace('text-', 'text-').replace('bg-', 'bg-').replace('border-', '')}`}>
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Management Guidelines */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">User Management Guidelines</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Admin:</strong> Full system access, can manage all users and settings</li>
              <li>• <strong>Manager:</strong> Can approve orders, manage suppliers, and view analytics</li>
              <li>• <strong>Buyer:</strong> Can create and manage orders, update parts information</li>
              <li>• <strong>Viewer:</strong> Read-only access to orders, parts, and suppliers</li>
              <li>• <strong>Note:</strong> You cannot modify your own role for security reasons</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;