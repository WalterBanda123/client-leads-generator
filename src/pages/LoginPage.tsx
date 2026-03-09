import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, Database, Mail, Lock, Eye, EyeOff, ArrowLeft, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type View = 'login' | 'signup' | 'reset';

const DOMAIN = 'dynatondata.com';

export default function LoginPage() {
  const { user, isLoading, login, loginWithEmail, signupWithEmail, resetPassword } = useAuth();

  const [view, setView] = useState<View>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-dynaton-red" />
      </div>
    );
  }

  const resetForm = () => {
    setEmail(''); setPassword(''); setConfirmPassword('');
    setDisplayName(''); setError(null); setSuccess(null);
    setShowPassword(false); setShowConfirm(false);
  };
  const switchView = (v: View) => { resetForm(); setView(v); };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setIsSubmitting(true);
    const result = await loginWithEmail(email, password);
    if (!result.success) setError(result.error ?? 'Login failed.');
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!displayName.trim()) { setError('Please enter your full name.'); return; }
    if (!email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (!email.endsWith(`@${DOMAIN}`)) { setError(`Only @${DOMAIN} addresses are allowed.`); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setIsSubmitting(true);
    const result = await signupWithEmail(email, password, displayName.trim());
    if (!result.success) setError(result.error ?? 'Signup failed.');
    setIsSubmitting(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!email) { setError('Please enter your email address.'); return; }
    if (!email.endsWith(`@${DOMAIN}`)) { setError(`Only @${DOMAIN} addresses are allowed.`); return; }
    setIsSubmitting(true);
    const result = await resetPassword(email);
    if (result.success) setSuccess('Password reset email sent. Check your inbox.');
    else setError(result.error ?? 'Failed to send reset email.');
    setIsSubmitting(false);
  };

  // ── Shared sub-components ─────────────────────────────────────────────────
  const ErrorBanner = ({ msg }: { msg: string }) => (
    <div className="flex items-start gap-2.5 text-dynaton-red text-sm bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );

  const SuccessBanner = ({ msg }: { msg: string }) => (
    <div className="flex items-start gap-2.5 text-green-700 text-sm bg-green-50 border border-green-100 px-4 py-3 rounded-xl">
      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );

  const InputField = ({
    type, value, onChange, placeholder, icon, showToggle, onToggle, autoFocus,
  }: {
    type: string; value: string; onChange: (v: string) => void;
    placeholder: string; icon: React.ReactNode;
    showToggle?: boolean; onToggle?: () => void; autoFocus?: boolean;
  }) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dynaton-muted pointer-events-none">{icon}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-10 py-2.5 text-sm border border-dynaton-border rounded-xl bg-dynaton-gray focus:outline-none focus:ring-2 focus:ring-dynaton-red/20 focus:border-dynaton-red focus:bg-white"
      />
      {showToggle && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-dynaton-muted hover:text-gray-600"
        >
          {type === 'password' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      )}
    </div>
  );

  const SubmitButton = ({ label, loading }: { label: string; loading: boolean }) => (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 text-sm font-bold text-white bg-dynaton-red hover:bg-dynaton-red-dark rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
    >
      {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
      {label}
    </button>
  );

  // ── Right panel views ─────────────────────────────────────────────────────
  const renderRight = () => {
    if (view === 'signup') return (
      <div className="w-full max-w-sm">
        <button onClick={() => switchView('login')} className="flex items-center gap-1.5 text-sm text-dynaton-muted hover:text-gray-800 mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to sign in
        </button>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Create account</h2>
        <p className="text-sm text-dynaton-muted mb-6">
          Only <span className="font-semibold text-gray-700">@{DOMAIN}</span> emails are accepted.
        </p>
        <form onSubmit={handleSignup} className="space-y-3">
          <InputField type="text" value={displayName} onChange={setDisplayName}
            placeholder="Full name" icon={<User className="w-4 h-4" />} autoFocus />
          <InputField type="email" value={email} onChange={setEmail}
            placeholder={`you@${DOMAIN}`} icon={<Mail className="w-4 h-4" />} />
          <InputField type={showPassword ? 'text' : 'password'} value={password} onChange={setPassword}
            placeholder="Password (min 6 chars)" icon={<Lock className="w-4 h-4" />}
            showToggle onToggle={() => setShowPassword(p => !p)} />
          <InputField type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword}
            placeholder="Confirm password" icon={<Lock className="w-4 h-4" />}
            showToggle onToggle={() => setShowConfirm(p => !p)} />
          {error && <ErrorBanner msg={error} />}
          <SubmitButton label="Create Account" loading={isSubmitting} />
        </form>
        <p className="text-sm text-center text-dynaton-muted mt-5">
          Already have an account?{' '}
          <button onClick={() => switchView('login')} className="text-dynaton-red font-semibold hover:underline">Sign in</button>
        </p>
      </div>
    );

    if (view === 'reset') return (
      <div className="w-full max-w-sm">
        <button onClick={() => switchView('login')} className="flex items-center gap-1.5 text-sm text-dynaton-muted hover:text-gray-800 mb-6 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to sign in
        </button>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Reset password</h2>
        <p className="text-sm text-dynaton-muted mb-6">
          Enter your <span className="font-semibold text-gray-700">@{DOMAIN}</span> email and we'll send a reset link.
        </p>
        <form onSubmit={handleReset} className="space-y-3">
          <InputField type="email" value={email} onChange={setEmail}
            placeholder={`you@${DOMAIN}`} icon={<Mail className="w-4 h-4" />} autoFocus />
          {error && <ErrorBanner msg={error} />}
          {success && <SuccessBanner msg={success} />}
          {!success && <SubmitButton label="Send Reset Email" loading={isSubmitting} />}
        </form>
      </div>
    );

    // Default: login
    return (
      <div className="w-full max-w-sm">
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
        <p className="text-sm text-dynaton-muted mb-6">Access your leads dashboard</p>

        {/* Email / password form */}
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <InputField type="email" value={email} onChange={setEmail}
            placeholder={`you@${DOMAIN}`} icon={<Mail className="w-4 h-4" />} autoFocus />
          <InputField type={showPassword ? 'text' : 'password'} value={password} onChange={setPassword}
            placeholder="Password" icon={<Lock className="w-4 h-4" />}
            showToggle onToggle={() => setShowPassword(p => !p)} />
          {error && <ErrorBanner msg={error} />}
          <SubmitButton label="Sign In" loading={isSubmitting} />
          <div className="flex items-center justify-between text-sm pt-1">
            <button type="button" onClick={() => switchView('reset')} className="text-dynaton-muted hover:text-dynaton-red">
              Forgot password?
            </button>
            <button type="button" onClick={() => switchView('signup')} className="text-dynaton-red font-semibold hover:underline">
              Create account
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-dynaton-border" />
          <span className="text-xs text-dynaton-muted font-mono">or continue with</span>
          <div className="flex-1 h-px bg-dynaton-border" />
        </div>

        {/* Google — always at bottom */}
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-3 text-gray-600 py-4 border border-dynaton-border rounded-xl bg-dynaton-gray">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-dynaton-red" />
            <span className="text-sm font-medium">Signing in...</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (cr) => {
                setError(null);
                if (!cr.credential) { setError('Failed to get credentials from Google'); return; }
                setIsSubmitting(true);
                const result = await login({ credential: cr.credential });
                if (!result.success && result.error) setError(result.error);
                setIsSubmitting(false);
              }}
              onError={() => setError('Google sign-in failed. Please try again.')}
              theme="outline" size="large" text="continue_with" shape="rectangular" width="320"
            />
          </div>
        )}

        <div className="mt-5 bg-dynaton-gray rounded-xl p-3.5 border border-dynaton-border">
          <p className="text-xs text-gray-500 text-center font-mono">
            Only <span className="font-semibold text-gray-800">@{DOMAIN}</span> accounts are permitted
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left dark panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-dynaton-dark relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #CE0505 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #CE0505 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <img src="/dynaton-logo.png" alt="Dynaton Data" className="h-9 w-auto brightness-0 invert" />
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-6">
            <Database className="w-3.5 h-3.5 text-dynaton-red" />
            <span className="text-xs font-mono text-white/60 tracking-widest uppercase">Internal Tool</span>
          </div>
          <h1 className="font-display text-5xl font-bold text-white leading-[1.1] mb-5 tracking-tight">
            Leads<br />
            <span className="text-dynaton-red">Management</span><br />
            Platform
          </h1>
          <p className="text-base text-white/50 leading-relaxed">
            Track, organize, and manage your business leads in one place.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/20 font-mono">© {new Date().getFullYear()} Dynaton Data</p>
      </div>

      {/* Right white panel */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        <div className="lg:hidden flex items-center p-6">
          <img src="/dynaton-logo.png" alt="Dynaton Data" className="h-8 w-auto" />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          {renderRight()}
        </div>
        <div className="p-6 text-center border-t border-dynaton-border">
          <p className="text-xs text-dynaton-muted font-mono tracking-wide">
            Secured by Google · Dynaton Data Internal
          </p>
        </div>
      </div>
    </div>
  );
}
