import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CE0505]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/dynaton-logo.png"
            alt="Dynaton Data"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Leads Dashboard</h1>
          <p className="text-gray-500 mt-2">Sign in to manage your leads</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome</h2>
            <p className="text-sm text-gray-500 mb-6">
              Please sign in with your <span className="font-medium">@dynatondata.com</span> Google account
            </p>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-center">
              {isLoggingIn ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#CE0505]"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    setError(null);
                    if (!credentialResponse.credential) {
                      setError('Failed to get credentials from Google');
                      return;
                    }
                    setIsLoggingIn(true);
                    try {
                      const result = await login({ credential: credentialResponse.credential });
                      if (!result.success && result.error) {
                        setError(result.error);
                      }
                    } finally {
                      setIsLoggingIn(false);
                    }
                  }}
                  onError={() => {
                    setError('Google sign-in failed. Please try again.');
                  }}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Access is restricted to Dynaton Data team members only
        </p>
      </div>
    </div>
  );
}
