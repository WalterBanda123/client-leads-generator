import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#CE0505]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-gray-100">
        {/* Logo */}
        <div>
          <img
            src="/dynaton-logo.png"
            alt="Dynaton Data"
            className="h-10 w-auto"
          />
        </div>

        {/* Center Content */}
        <div className="max-w-md">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Leads Management Platform
          </h1>
          <p className="text-xl text-gray-500 leading-relaxed">
            Track, organize, and manage your business leads in one place.
          </p>

          {/* Stats */}
          <div className="flex gap-12 mt-12">
            <div>
              <p className="text-4xl font-bold text-[#CE0505]">1,000+</p>
              <p className="text-sm text-gray-500 mt-1">Active Leads</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">98%</p>
              <p className="text-sm text-gray-500 mt-1">Data Accuracy</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-400">
          Internal Tool · Dynaton Data
        </p>
      </div>

      {/* Right Panel - Login */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Top Bar */}
        <div className="flex justify-end items-center p-6 lg:p-8">
          <div className="lg:hidden absolute left-6">
            <img
              src="/dynaton-logo.png"
              alt="Dynaton Data"
              className="h-8 w-auto"
            />
          </div>
        </div>

        {/* Login Form - Centered */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h2>
              <p className="text-gray-500">
                Access your leads dashboard
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 text-[#CE0505] text-sm bg-red-50 px-4 py-3 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Login */}
            <div className="space-y-4">
              {isLoggingIn ? (
                <div className="flex items-center justify-center gap-3 text-gray-600 py-4 border border-gray-200 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-[#CE0505]"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex justify-center">
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
                    text="continue_with"
                    shape="rectangular"
                    width="320"
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 text-center">
                Only <span className="font-semibold text-gray-900">@dynatondata.com</span> accounts
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="p-6 text-center">
          <p className="text-xs text-gray-400">
            Secured by Google
          </p>
        </div>
      </div>
    </div>
  );
}
