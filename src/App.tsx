import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { APP_VERSION, VERSION_CONFIG, isMajorVersionChange, clearOutdatedClientData } from './config/appConfig';
import { supabase } from './lib/supabase';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Parts from './components/Parts';
import Suppliers from './components/Suppliers';
import Analytics from './components/Analytics';
import StatusTracker from './components/StatusTracker';
import UserManagement from './components/UserManagement';
import Quotes from './components/Quotes';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isVersionChecked, setIsVersionChecked] = useState(false);

  // Ensure login screen always uses light theme
  React.useEffect(() => {
    if (!isAuthenticated) {
      // Force light theme for login screen
      document.documentElement.classList.remove('dark');
    }
  }, [isAuthenticated]);

  // Version check and client-side data management
  React.useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const lastAppVersion = localStorage.getItem(VERSION_CONFIG.VERSION_STORAGE_KEY);
        
        // Check if this is a new version
        if (lastAppVersion !== APP_VERSION) {
          console.log(`App version changed from ${lastAppVersion || 'unknown'} to ${APP_VERSION}`);
          
          // Determine if this is a major version change
          const isMajorChange = isMajorVersionChange(lastAppVersion, APP_VERSION);
          
          if (isMajorChange) {
            console.log('Major version change detected, clearing all client data');
            // For major version changes, clear client data and sign out user
            clearOutdatedClientData();
            
            // Sign out user to force fresh authentication flow
            console.log('Signing out user due to major version change');
            await supabase.auth.signOut();
          } else {
            console.log('Minor version change detected, clearing specific client data');
            // For minor version changes, just clear potentially problematic data
            clearOutdatedClientData();
          }
          
          // Update the stored version
          localStorage.setItem(VERSION_CONFIG.VERSION_STORAGE_KEY, APP_VERSION);
        }
        
        setIsVersionChecked(true);
      } catch (error) {
        console.error('Error during version check:', error);
        // If version check fails, still allow the app to continue
        setIsVersionChecked(true);
      }
    };
    
    checkAppVersion();
  }, []);

  // Handle theme changes from ThemeProvider
  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    if (user && user.preferences) {
      try {
        const updatedPreferences = {
          ...user.preferences,
          theme
        };
        await updateUserProfile({ preferences: updatedPreferences });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  // Show loading while checking version or authenticating
  if (isLoading || !isVersionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!isVersionChecked ? 'Checking for updates...' : 'Loading...'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            If this takes too long, please refresh the page
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'orders', action: 'read' }}>
            <Dashboard onTabChange={setActiveTab} />
          </ProtectedRoute>
        );
      case 'orders':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'orders', action: 'read' }}>
            <Orders />
          </ProtectedRoute>
        );
      case 'parts':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'parts', action: 'read' }}>
            <Parts />
          </ProtectedRoute>
        );
      case 'suppliers':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'suppliers', action: 'read' }}>
            <Suppliers />
          </ProtectedRoute>
        );
      case 'analytics':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'analytics', action: 'read' }}>
            <Analytics />
          </ProtectedRoute>
        );
      case 'tracking':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'orders', action: 'read' }}>
            <StatusTracker />
          </ProtectedRoute>
        );
      case 'users':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'users', action: 'manage' }}>
            <UserManagement />
          </ProtectedRoute>
        );
      case 'quotes':
        return (
          <ProtectedRoute requiredPermission={{ resource: 'quotes', action: 'read' }}>
            <Quotes />
          </ProtectedRoute>
        );
      default:
        return (
          <ProtectedRoute requiredPermission={{ resource: 'orders', action: 'read' }}>
            <Dashboard />
          </ProtectedRoute>
        );
    }
  };

  return (
    <ThemeProvider 
      initialTheme={user?.preferences?.theme}
      onThemeChange={handleThemeChange}
    >
      <div className="min-h-screen bg-gray-50">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderActiveComponent()}
        </main>
      </div>
    </ThemeProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;