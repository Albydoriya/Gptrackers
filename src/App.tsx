import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
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

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle theme changes from ThemeProvider
  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    if (user) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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