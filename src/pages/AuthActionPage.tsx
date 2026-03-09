import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode, applyActionCode } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type PageState = 'loading' | 'resetPassword' | 'success' | 'error' | 'emailVerified';

export default function AuthActionPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode) { setPageState('error'); return; }

    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => { setEmail(email); setPageState('resetPassword'); })
        .catch(() => { setPageState('error'); });
    } else if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => setPageState('emailVerified'))
        .catch(() => setPageState('error'));
    } else {
      setPageState('error');
    }
  }, [mode, oobCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!oobCode) return;
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPageState('success');
    } catch {
      setError('Failed to reset password. The link may have expired — request a new one.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dynaton-gray flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/dynaton-logo.png" alt="Dynaton Data" className="h-8 w-auto" />
          <span className="text-xs font-mono font-medium tracking-[0.15em] text-dynaton-red uppercase opacity-70">
            Leads Platform
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-dynaton-border overflow-hidden">
          <div className="h-1 bg-dynaton-red w-full" />

          {/* Loading */}
          {pageState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 px-8 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-dynaton-red" />
              <p className="text-sm text-dynaton-muted font-mono">Verifying your link...</p>
            </div>
          )}

          {/* Reset password form */}
          {pageState === 'resetPassword' && (
            <div className="p-8">
              <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Set new password</h1>
              {email && (
                <p className="text-sm text-dynaton-muted mb-6">
                  For <span className="font-semibold text-gray-700 font-mono">{email}</span>
                </p>
              )}
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dynaton-muted pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    autoFocus
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-dynaton-border rounded-xl bg-dynaton-gray focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red focus:bg-white"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dynaton-muted hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dynaton-muted pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-dynaton-border rounded-xl bg-dynaton-gray focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red focus:bg-white"
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dynaton-muted hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && (
                  <div className="flex items-start gap-2.5 text-dynaton-red text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-sm font-bold text-white bg-dynaton-red hover:bg-dynaton-red-dark rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Set New Password
                </button>
              </form>
            </div>
          )}

          {/* Success */}
          {pageState === 'success' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="font-display text-xl font-bold text-gray-900 mb-2">Password updated</h1>
              <p className="text-sm text-dynaton-muted mb-6">Your password has been reset successfully.</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-2.5 text-sm font-bold text-white bg-dynaton-red hover:bg-dynaton-red-dark rounded-xl transition-colors"
              >
                Sign in to your account
              </Link>
            </div>
          )}

          {/* Email verified */}
          {pageState === 'emailVerified' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="font-display text-xl font-bold text-gray-900 mb-2">Email verified</h1>
              <p className="text-sm text-dynaton-muted mb-6">Your email has been verified. You can now sign in.</p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-2.5 text-sm font-bold text-white bg-dynaton-red hover:bg-dynaton-red-dark rounded-xl transition-colors"
              >
                Sign in
              </Link>
            </div>
          )}

          {/* Error */}
          {pageState === 'error' && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-dynaton-red" />
              </div>
              <h1 className="font-display text-xl font-bold text-gray-900 mb-2">Link expired or invalid</h1>
              <p className="text-sm text-dynaton-muted mb-6">
                This link may have already been used or has expired. Request a new one from the sign-in page.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-2.5 text-sm font-bold text-white bg-dynaton-red hover:bg-dynaton-red-dark rounded-xl transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-dynaton-muted font-mono mt-6">
          © {new Date().getFullYear()} Dynaton Data · Internal Platform
        </p>
      </div>
    </div>
  );
}
