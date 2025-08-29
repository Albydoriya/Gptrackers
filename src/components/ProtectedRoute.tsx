import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Lock, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  requiredRole?: string;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  fallback
}) => {
  const { user, hasPermission, hasRole, checkAndRefreshSession } = useAuth();
  const [isSessionChecking, setIsSessionChecking] = useState(true);

  // Check session validity when component mounts
  useEffect(() => {
    const validateSession = async () => {
      try {
        await checkAndRefreshSession();
      } catch (error) {
        console.error('Session validation failed:', error);
        // Error is already handled in checkAndRefreshSession
      } finally {
        setIsSessionChecking(false);
      }
    };

    validateSession();
  }, [checkAndRefreshSession]);

  // Show loading while checking session
  if (isSessionChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Validating Session</h3>
          <p className="text-gray-600 dark:text-gray-400">Checking your authentication status...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // User session is invalid, the AuthContext will handle redirecting to login
    return null;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
          <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h3>
          <p className="text-red-700 mb-4">
            You need the <strong>{requiredRole}</strong> role to access this feature.
          </p>
          <p className="text-sm text-red-600">
            Your current role: <strong>{user.role.displayName}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-yellow-50 rounded-lg border border-yellow-200 max-w-md">
          <div className="p-3 bg-yellow-100 rounded-full w-fit mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Insufficient Permissions</h3>
          <p className="text-yellow-700 mb-4">
            You don't have permission to <strong>{requiredPermission.action}</strong> on <strong>{requiredPermission.resource}</strong>.
          </p>
          <p className="text-sm text-yellow-600">
            Contact your administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;