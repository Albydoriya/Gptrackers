import React, { useState } from 'react';
import {
  Package,
  Shield,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Chrome
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  // Check for auth errors from OAuth flow
  React.useEffect(() => {
    const authError = sessionStorage.getItem('auth_error');
    if (authError) {
      setError(authError);
      sessionStorage.removeItem('auth_error');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signin') {
        await signIn(formData.email, formData.password);
      } else if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        await signUp(formData.email, formData.password, formData.fullName);
        setSuccess('Account created successfully! Please check your email to confirm your account.');
        setMode('signin');
        setFormData({ email: formData.email, password: '', confirmPassword: '', fullName: '' });
      } else if (mode === 'reset') {
        await resetPassword(formData.email);
        setSuccess('Password reset email sent! Please check your inbox.');
        setMode('signin');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@company.com', role: 'System Administrator', color: 'text-red-600' },
    { email: 'manager@company.com', role: 'Procurement Manager', color: 'text-blue-600' },
    { email: 'buyer@company.com', role: 'Procurement Buyer', color: 'text-green-600' },
    { email: 'viewer@company.com', role: 'Read-Only User', color: 'text-gray-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding & Features */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
              <img
                src="https://libaopwjoduzlkvhtukb.supabase.co/storage/v1/object/public/company-assets//GoParts.png"
                alt="GoParts Logo"
                className="h-12 w-auto object-contain"
              />
              <h1 className="text-3xl font-bold text-gray-900">GoParts</h1>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Internal Parts Ordering & Status Tracking System
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Streamline your procurement process with advanced order management, 
              real-time tracking, and comprehensive analytics.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Order Management</h3>
                <p className="text-sm text-gray-600">Create, track, and manage orders with real-time status updates</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Analytics & Insights</h3>
                <p className="text-sm text-gray-600">Comprehensive reporting and cost analysis tools</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Supplier Management</h3>
                <p className="text-sm text-gray-600">Maintain supplier relationships and performance metrics</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Role-Based Access</h3>
                <p className="text-sm text-gray-600">Secure access control with granular permissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
                </h3>
                <p className="text-gray-600">
                  {mode === 'signin' ? 'Sign in to access your procurement dashboard' :
                   mode === 'signup' ? 'Create your account to get started' :
                   'Enter your email to receive a password reset link'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-700 font-medium">
                        {error === 'Invalid login credentials'
                          ? 'Incorrect email or password. Please try again.'
                          : error}
                      </p>
                      {error.includes('Access denied') && (
                        <p className="text-xs text-red-600 mt-2">
                          Only pre-approved users can sign in with Google. If you need access, please contact your system administrator.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Confirm your password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' && <Shield className="h-4 w-4" />}
                      {mode === 'signup' && <User className="h-4 w-4" />}
                      {mode === 'reset' && <Mail className="h-4 w-4" />}
                      <span>
                        {mode === 'signin' ? 'Sign In' :
                         mode === 'signup' ? 'Create Account' :
                         'Send Reset Email'}
                      </span>
                    </>
                  )}
                </button>
              </form>

              {/* Google Sign In - Only show for sign in mode */}
              {mode === 'signin' && (
                <>
                  <div className="mt-6 relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className={`mt-4 w-full flex items-center justify-center space-x-3 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium transition-all ${
                      isLoading
                        ? 'bg-gray-100 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    }`}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-gray-700">Sign in with Google</span>
                  </button>
                </>
              )}

              {/* Mode Switching */}
              <div className="mt-6 text-center space-y-2">
                {mode === 'signin' && (
                  <>
                    <button
                      onClick={() => setMode('reset')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Forgot your password?
                    </button>
                    <div className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <button
                        onClick={() => setMode('signup')}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Sign up
                      </button>
                    </div>
                  </>
                )}
                
                {mode === 'signup' && (
                  <div className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      onClick={() => setMode('signin')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Sign in
                    </button>
                  </div>
                )}
                
                {mode === 'reset' && (
                  <div className="text-sm text-gray-600">
                    Remember your password?{' '}
                    <button
                      onClick={() => setMode('signin')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Sign in
                    </button>
                  </div>
                )}
              </div>

              {mode === 'signin' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center mb-4">
                    Demo accounts for testing (password: demo123):
                  </p>
                  <div className="space-y-2">
                    {demoAccounts.map((account, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, email: account.email, password: 'demo123' }));
                          }}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {account.email}
                        </button>
                        <span className={`font-medium ${account.color}`}>{account.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-center space-x-2 text-xs text-gray-500">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Secure authentication with Supabase</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;