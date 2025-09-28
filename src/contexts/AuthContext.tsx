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
  checkAndRefreshSession: () => Promise<boolean>;
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
      { id: 'quotes.create', name: 'Create Quotes', resource: 'quotes', action: 'create', description: 'Can create new quotes' },
      { id: 'quotes.read', name: 'View Quotes', resource: 'quotes', action: 'read', description: 'Can view all quotes' },
      { id: 'quotes.update', name: 'Update Quotes', resource: 'quotes', action: 'update', description: 'Can modify quotes' },
      { id: 'quotes.delete', name: 'Delete Quotes', resource: 'quotes', action: 'delete', description: 'Can delete quotes' },
      { id: 'quotes.convert', name: 'Convert Quotes', resource: 'quotes', action: 'convert', description: 'Can convert quotes to orders' },
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
      { id: 'quotes.create', name: 'Create Quotes', resource: 'quotes', action: 'create', description: 'Can create new quotes' },
      { id: 'quotes.read', name: 'View Quotes', resource: 'quotes', action: 'read', description: 'Can view all quotes' },
      { id: 'quotes.update', name: 'Update Quotes', resource: 'quotes', action: 'update', description: 'Can modify quotes' },
      { id: 'quotes.convert', name: 'Convert Quotes', resource: 'quotes', action: 'convert', description: 'Can convert quotes to orders' },
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
      { id: 'quotes.create', name: 'Create Quotes', resource: 'quotes', action: 'create', description: 'Can create new quotes' },
      { id: 'quotes.read', name: 'View Quotes', resource: 'quotes', action: 'read', description: 'Can view quotes' },
      { id: 'quotes.update', name: 'Update Quotes', resource: 'quotes', action: 'update', description: 'Can modify own quotes' },
      { id: 'quotes.convert', name: 'Convert Quotes', resource: 'quotes', action: 'convert', description: 'Can convert quotes to orders' },
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
      { id: 'quotes.read', name: 'View Quotes', resource: 'quotes', action: 'read', description: 'Can view quotes' },
      { id: 'analytics.read', name: 'View Analytics', resource: 'analytics', action: 'read', description: 'Can view analytics' },
    ]
  }
];

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
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('refresh_token_not_found') ||
          error.code === 'refresh_token_not_found'
        )) {
          console.log('Invalid or expired refresh token detected, clearing session...');
          // Clear any stored auth data
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Handle other authentication errors
        if (error) {
          console.error('Session retrieval error:', error);
          // Clear potentially corrupted auth data for any auth error
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
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
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
            await supabase.auth.signOut();
            setUser(null);
            setIsLoading(false);
          }
        } else {
          setUser(null);
          setIsLoading(false);
        }
      } catch (sessionError) {
        // Check if this is a refresh token error (expected scenario)
        if (sessionError instanceof Error && (
          sessionError.message.includes('Refresh Token Not Found') || 
          sessionError.message.includes('refresh_token_not_found') ||
          sessionError.message.includes('Invalid Refresh Token') ||
          (sessionError as any).code === 'refresh_token_not_found'
        )) {
          console.log('Session recovery failed due to invalid/expired refresh token, user will need to sign in again');
          // Clear any stored auth data
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          await supabase.auth.signOut();
        } else {
          console.error('Error getting initial session:', sessionError);
        }
        setUser(null);
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
        } else if (event === 'TOKEN_REFRESHED' && !session) {
          // Handle case where token refresh failed
          console.log('Token refresh failed, signing out user');
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          setUser(null);
          setIsLoading(false);
        }
      } catch (authChangeError) {
        console.error('Error handling auth state change:', authChangeError);
        // Clear auth data on any auth change error
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createUserFromSession = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('Starting createUserFromSession for user:', supabaseUser.id);
      
      // Try to get existing user profile with timeout
      console.log('Attempting to fetch user profile from database...');
      const profileResult = await Promise.race([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single()
          .then(result => ({ type: 'success', ...result })),
        new Promise(resolve =>
          setTimeout(() => resolve({ type: 'timeout', data: null, error: { message: 'Profile fetch timeout' } }), 8000)
        )
      ]) as any;
      
      const { data: profile, error: profileError } = profileResult.type === 'timeout' 
        ? { data: null, error: profileResult.error }
        : profileResult;
      
      console.log('Profile fetch completed. Error:', profileError, 'Data exists:', !!profile, 'Timeout:', profileResult.type === 'timeout');

      let userRole: UserRole;
      let fullName = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User';

      // If profile exists, use the data from the profile
      if (profile && !profileError) {
        console.log('Using existing profile data');
        const roleFromProfile = mockRoles.find(role => role.name === profile.role);
        if (!roleFromProfile) {
          console.error('Invalid role found in profile:', profile.role);
          throw new Error('Invalid user role in database profile');
        }
        userRole = roleFromProfile;
        
        if (profile.full_name) {
          fullName = profile.full_name;
        }
        
        // Update last login for existing profile
        console.log('Updating last login timestamp (non-blocking)');
        supabase
          .from('user_profiles')
          .update({ 
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', supabaseUser.id)
          .then(() => console.log('Last login updated successfully'))
          .catch(err => console.warn('Failed to update last login (non-critical):', err));
      } else if (profileError?.code === 'PGRST116' || profileResult.type === 'timeout') {
        // Profile doesn't exist (PGRST116 = no rows found) or fetch timed out
        if (profileResult.type === 'timeout') {
          console.error('Profile fetch timed out, cannot establish user session safely');
          throw new Error('Unable to verify user profile - session timeout');
        }
        
        console.log('Profile not found, creating new profile with default viewer role...');
        
        // For new users, start with viewer role - admin can upgrade later
        userRole = mockRoles.find(role => role.name === 'viewer') || mockRoles[3];
        
        // Use upsert to handle potential race conditions
        const profileDataToUpsert = {
          id: supabaseUser.id,
          full_name: fullName,
          email: supabaseUser.email,
          role: userRole.name as 'admin' | 'manager' | 'buyer' | 'viewer',
          preferences: {},
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Wrap profile creation in timeout to prevent application freeze
        const insertResult = await Promise.race([
          supabase
            .from('user_profiles')
            .upsert(profileDataToUpsert, { onConflict: 'id' })
            .select('*')
            .single()
            .then(result => ({ type: 'success', ...result })),
          new Promise(resolve =>
            setTimeout(() => resolve({ type: 'timeout', data: null, error: { message: 'Profile creation timeout' } }), 8000)
          )
        ]) as any;
        
        const { data: upsertedProfile, error: insertError } = insertResult.type === 'timeout' 
          ? { data: null, error: insertResult.error }
          : insertResult;
        
        console.log('Profile creation completed. Error:', insertError, 'Timeout:', insertResult.type === 'timeout');

        if (insertError || insertResult.type === 'timeout') {
          console.error('Profile creation failed or timed out:', insertError || 'timeout');
          throw new Error('Unable to create user profile - please try signing in again');
        }
        
        if (upsertedProfile) {
          console.log('Successfully created new user profile');
          const roleFromProfile = mockRoles.find(role => role.name === upsertedProfile.role);
          if (!roleFromProfile) {
            console.error('Invalid role in created profile:', upsertedProfile.role);
            throw new Error('Profile creation resulted in invalid role');
          }
          userRole = roleFromProfile;
          
          if (upsertedProfile.full_name) {
            fullName = upsertedProfile.full_name;
          }
        } else {
          console.error('Profile creation succeeded but no data returned');
          throw new Error('Profile creation failed - no data returned');
        }
      } else if (profileError) {
        console.error('Critical profile fetch error:', profileError);
        throw new Error(`Unable to fetch user profile: ${profileError.message}`);
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
        preferences: profile?.preferences || { theme: 'light' },
      };

      console.log('Setting user data in state');
      setUser(userData);
      console.log('User session created successfully');
    } catch (error) {
      console.error('Error creating user from session:', error);
      console.log('Critical error - signing out user and clearing session');
      
      // Clear any potentially corrupted auth data and force sign out
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('Error during cleanup signOut:', signOutError);
      }
      
      setUser(null);
      throw error; // Re-throw to ensure calling code knows the session creation failed
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

  const checkAndRefreshSession = async (): Promise<boolean> => {
    try {
      console.log('Checking session validity...');
      
      // Check session with timeout
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: { message: 'Session check timeout' } }), 8000)
        )
      ]) as any;
      
      const { data: { session }, error } = sessionResult;
      
      // Handle timeout gracefully
      if (error && error.message === 'Session check timeout') {
        console.log('Session check timed out, treating as invalid session');
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        await supabase.auth.signOut();
        setUser(null);
        return false;
      }
      
      // Handle refresh token errors or missing session
      if (error && (
        error.message.includes('Refresh Token Not Found') || 
        error.message.includes('refresh_token_not_found') ||
        error.message.includes('Invalid Refresh Token') ||
        error.code === 'refresh_token_not_found'
      )) {
        console.log('Invalid refresh token detected during session check, signing out...');
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        await supabase.auth.signOut();
        setUser(null);
        return false;
      }
      
      // If no session or other auth error, sign out
      if (!session || error) {
        console.log('No valid session found or auth error:', error?.message || 'No session');
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        await supabase.auth.signOut();
        setUser(null);
        return false;
      }
      
      // Session exists, verify user profile is still accessible
      if (session.user && !user) {
        console.log('Session valid but no user data, attempting to recreate user from session...');
        try {
          await createUserFromSession(session.user);
          console.log('User data successfully recreated from valid session');
          return true;
        } catch (userCreationError) {
          console.error('Failed to recreate user from valid session:', userCreationError);
          // If we can't recreate the user, the session is effectively invalid
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          await supabase.auth.signOut();
          setUser(null);
          return false;
        }
      }
      
      console.log('Session and user data are valid');
      return true;
      
    } catch (error) {
      console.error('Error during session check:', error);
      // On any error, assume session is invalid and sign out
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.removeItem('supabase.auth.token');
      await supabase.auth.signOut();
      setUser(null);
      return false;
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
    updateUserProfile,
    checkAndRefreshSession
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