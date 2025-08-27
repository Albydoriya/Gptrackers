import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  department?: string;
  lastLogin?: string;
  preferences?: Record<string, any>;
}

interface UserRole {
  id: string;
  name: string;
  displayName: string;
  level: number;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock roles and permissions (these would typically come from your database)
const mockRoles: UserRole[] = [
  {
    id: 'admin',
    name: 'admin',
    displayName: 'System Administrator',
    level: 100,
    permissions: [
      { id: 'orders.create', name: 'Create Orders', resource: 'orders', action: 'create', description: 'Can create new orders' },
      { id: 'orders.read', name: 'View Orders', resource: 'orders', action: 'read', description: 'Can view all orders' },
      { id: 'orders.update', name: 'Update Orders', resource: 'orders', action: 'update', description: 'Can modify orders' },
      { id: 'orders.delete', name: 'Delete Orders', resource: 'orders', action: 'delete', description: 'Can delete orders' },
      { id: 'orders.approve', name: 'Approve Orders', resource: 'orders', action: 'approve', description: 'Can approve orders' },
      { id: 'parts.create', name: 'Create Parts', resource: 'parts', action: 'create', description: 'Can add new parts' },
      { id: 'parts.read', name: 'View Parts', resource: 'parts', action: 'read', description: 'Can view parts catalog' },
      { id: 'parts.update', name: 'Update Parts', resource: 'parts', action: 'update', description: 'Can modify parts' },
      { id: 'parts.delete', name: 'Delete Parts', resource: 'parts', action: 'delete', description: 'Can delete parts' },
      { id: 'suppliers.create', name: 'Create Suppliers', resource: 'suppliers', action: 'create', description: 'Can add suppliers' },
      { id: 'suppliers.read', name: 'View Suppliers', resource: 'suppliers', action: 'read', description: 'Can view suppliers' },
      { id: 'suppliers.update', name: 'Update Suppliers', resource: 'suppliers', action: 'update', description: 'Can modify suppliers' },
      { id: 'suppliers.delete', name: 'Delete Suppliers', resource: 'suppliers', action: 'delete', description: 'Can delete suppliers' },
      { id: 'analytics.read', name: 'View Analytics', resource: 'analytics', action: 'read', description: 'Can view analytics' },
      { id: 'users.manage', name: 'Manage Users', resource: 'users', action: 'manage', description: 'Can manage user accounts' },
      { id: 'pricing.update', name: 'Update Pricing', resource: 'pricing', action: 'update', description: 'Can update pricing' },
      { id: 'shipping.manage', name: 'Manage Shipping', resource: 'shipping', action: 'manage', description: 'Can manage shipping data' },
    ]
  },
  {
    id: 'manager',
    name: 'manager',
    displayName: 'Procurement Manager',
    level: 80,
    permissions: [
      { id: 'orders.create', name: 'Create Orders', resource: 'orders', action: 'create', description: 'Can create new orders' },
      { id: 'orders.read', name: 'View Orders', resource: 'orders', action: 'read', description: 'Can view all orders' },
      { id: 'orders.update', name: 'Update Orders', resource: 'orders', action: 'update', description: 'Can modify orders' },
      { id: 'orders.approve', name: 'Approve Orders', resource: 'orders', action: 'approve', description: 'Can approve orders' },
      { id: 'parts.create', name: 'Create Parts', resource: 'parts', action: 'create', description: 'Can add new parts' },
      { id: 'parts.read', name: 'View Parts', resource: 'parts', action: 'read', description: 'Can view parts catalog' },
      { id: 'parts.update', name: 'Update Parts', resource: 'parts', action: 'update', description: 'Can modify parts' },
      { id: 'suppliers.create', name: 'Create Suppliers', resource: 'suppliers', action: 'create', description: 'Can add suppliers' },
      { id: 'suppliers.read', name: 'View Suppliers', resource: 'suppliers', action: 'read', description: 'Can view suppliers' },
      { id: 'suppliers.update', name: 'Update Suppliers', resource: 'suppliers', action: 'update', description: 'Can modify suppliers' },
      { id: 'analytics.read', name: 'View Analytics', resource: 'analytics', action: 'read', description: 'Can view analytics' },
      { id: 'pricing.update', name: 'Update Pricing', resource: 'pricing', action: 'update', description: 'Can update pricing' },
      { id: 'shipping.manage', name: 'Manage Shipping', resource: 'shipping', action: 'manage', description: 'Can manage shipping data' },
    ]
  },
  {
    id: 'buyer',
    name: 'buyer',
    displayName: 'Procurement Buyer',
    level: 60,
    permissions: [
      { id: 'orders.create', name: 'Create Orders', resource: 'orders', action: 'create', description: 'Can create new orders' },
      { id: 'orders.read', name: 'View Orders', resource: 'orders', action: 'read', description: 'Can view orders' },
      { id: 'orders.update', name: 'Update Orders', resource: 'orders', action: 'update', description: 'Can modify own orders' },
      { id: 'parts.read', name: 'View Parts', resource: 'parts', action: 'read', description: 'Can view parts catalog' },
      { id: 'parts.update', name: 'Update Parts', resource: 'parts', action: 'update', description: 'Can update part info' },
      { id: 'suppliers.read', name: 'View Suppliers', resource: 'suppliers', action: 'read', description: 'Can view suppliers' },
      { id: 'pricing.update', name: 'Update Pricing', resource: 'pricing', action: 'update', description: 'Can update pricing' },
    ]
  },
  {
    id: 'viewer',
    name: 'viewer',
    displayName: 'Read-Only User',
    level: 20,
    permissions: [
      { id: 'orders.read', name: 'View Orders', resource: 'orders', action: 'read', description: 'Can view orders' },
      { id: 'parts.read', name: 'View Parts', resource: 'parts', action: 'read', description: 'Can view parts catalog' },
      { id: 'suppliers.read', name: 'View Suppliers', resource: 'suppliers', action: 'read', description: 'Can view suppliers' },
      { id: 'analytics.read', name: 'View Analytics', resource: 'analytics', action: 'read', description: 'Can view analytics' },
    ]
  }
];

// Helper function to determine user role based on email domain or other criteria
const getUserRole = (email: string): UserRole => {
  // You can customize this logic based on your needs
  if (email.includes('admin')) return mockRoles[0]; // admin
  if (email.includes('manager')) return mockRoles[1]; // manager
  if (email.includes('buyer')) return mockRoles[2]; // buyer
  return mockRoles[3]; // viewer (default)
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Handle refresh token errors specifically
        if (error && (
          error.message.includes('Refresh Token Not Found') || 
          error.message.includes('refresh_token_not_found') ||
          error.message.includes('Invalid Refresh Token')
        )) {
          console.log('Invalid or expired refresh token detected, clearing session...');
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Handle other authentication errors
        if (error) {
          console.error('Session retrieval error:', error);
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        if (session?.user && !error) {
          try {
            await createUserFromSession(session.user);
          } catch (userCreationError) {
            console.error('Error creating user from session:', userCreationError);
            // If user creation fails, sign out to prevent stuck state
            await supabase.auth.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (sessionError) {
        // Check if this is a refresh token error (expected scenario)
        if (sessionError instanceof Error && (
          sessionError.message.includes('Refresh Token Not Found') || 
          sessionError.message.includes('refresh_token_not_found') ||
          sessionError.message.includes('Invalid Refresh Token')
        )) {
          console.log('Session recovery failed due to invalid/expired refresh token, user will need to sign in again');
        } else {
          console.error('Error getting initial session:', sessionError);
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          await createUserFromSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      } catch (authChangeError) {
        console.error('Error handling auth state change:', authChangeError);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createUserFromSession = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Starting createUserFromSession for user:', supabaseUser.id);
      
      // Try to get existing user profile
      console.log('Attempting to fetch user profile from database...');
      const profileResult = await Promise.race([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single()
          .then(result => ({ type: 'success', ...result })),
        new Promise(resolve =>
          setTimeout(() => resolve({ type: 'timeout', data: null, error: { message: 'Profile fetch timeout' } }), 10000)
        )
      ]) as any;
      
      const { data: profile, error: profileError } = profileResult.type === 'timeout' 
        ? { data: null, error: profileResult.error }
        : profileResult;
      
      console.log('Profile fetch completed. Error:', profileError, 'Data exists:', !!profile, 'Timeout:', profileResult.type === 'timeout');

      let userRole = getUserRole(supabaseUser.email || '');
      let fullName = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User';

      // If profile exists, use the data from the profile
      if (profile && !profileError) {
        console.log('Using existing profile data');
        const roleFromProfile = mockRoles.find(role => role.name === profile.role);
        if (roleFromProfile) {
          userRole = roleFromProfile;
        }
        if (profile.full_name) {
          fullName = profile.full_name;
        }
        
        // Update last login for existing profile
        console.log('Updating last login timestamp (non-blocking)');
        supabase
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', supabaseUser.id)
          .then(() => console.log('Last login updated successfully'))
          .catch(err => console.warn('Failed to update last login (non-critical):', err));
      } else if (profileError?.code === 'PGRST116' || profileResult.type === 'timeout') {
        // Profile doesn't exist (PGRST116 = no rows found) or fetch timed out, create it
        console.log(profileResult.type === 'timeout' ? 'Profile fetch timed out, creating new profile...' : 'Profile not found, creating new profile...');
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: supabaseUser.id,
            full_name: fullName,
            email: supabaseUser.email,
            role: userRole.name,
            preferences: {},
            last_login: new Date().toISOString()
          });
        
        console.log('Profile creation completed. Error:', insertError);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          // If it's a duplicate key error, the profile was created by another session
          // Just continue with the existing profile
          if (insertError.code !== '23505') {
            console.warn('Profile creation failed, continuing with default user data:', insertError);
          }
        }
      } else if (profileError) {
        console.warn('Profile fetch error (non-critical):', profileError);
        // Some other error occurred, log it but continue
      }

      console.log('Creating user data object...');
      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: fullName,
        avatar: supabaseUser.user_metadata?.avatar_url,
        role: userRole,
        permissions: userRole.permissions,
        department: profile?.department || undefined,
        lastLogin: new Date().toISOString(),
        preferences: profile?.preferences || { theme: 'light' }
      };

      console.log('Setting user data in state');
      setUser(userData);
      console.log('User session created successfully');
    } catch (error) {
      console.error('Error creating user from session:', error);
      console.log('Setting user to null due to error');
      setUser(null);
      // Clear any potentially corrupted auth data
      try {
        console.log('Clearing potentially corrupted auth session');
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('Error during cleanup signOut:', signOutError);
      }
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      // Note: User will be automatically signed in after email confirmation
      // The onAuthStateChange listener will handle creating the user profile
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // User will be set via the onAuthStateChange listener
    } catch (error: any) {
      console.log('Sign in failed:', error.message || 'Invalid credentials');
      throw new Error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  };

  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    return user.permissions.some(permission => 
      permission.resource === resource && permission.action === action
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.role.name === roleName;
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Prepare the update object with Supabase column names
      const updateObject: any = {};
      
      if (updates.name !== undefined) {
        updateObject.full_name = updates.name;
      }
      if (updates.department !== undefined) {
        updateObject.department = updates.department;
      }
      if (updates.avatar !== undefined) {
        updateObject.avatar_url = updates.avatar;
      }
      if (updates.preferences !== undefined) {
        updateObject.preferences = updates.preferences;
      }
      
      // Always update the updated_at timestamp
      updateObject.updated_at = new Date().toISOString();

      // Update the user profile in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update(updateObject)
        .eq('id', user.id);

      if (error) throw error;

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error(error.message || 'Failed to update user profile');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    hasPermission,
    hasRole,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};