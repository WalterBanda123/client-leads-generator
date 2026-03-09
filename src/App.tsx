import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LogOut, AlertTriangle, X } from 'lucide-react';

function SignOutDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-dynaton-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-dynaton-red" />
            </div>
            <h3 className="font-display font-bold text-gray-900">Sign out</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-dynaton-gray text-dynaton-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            Are you sure you want to sign out? You'll need to sign in again to access the dashboard.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-dynaton-gray border-t border-dynaton-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-dynaton-border rounded-xl hover:bg-gray-50 transition-colors"
          >
            Stay signed in
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-dynaton-red hover:bg-dynaton-red-dark rounded-xl transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, logout } = useAuth();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleConfirmSignOut = async () => {
    setShowSignOutDialog(false);
    await logout();
  };

  return (
    <div className="min-h-screen bg-dynaton-gray">
      {/* Red accent top bar */}
      <div className="h-0.75 bg-dynaton-red w-full" />

      {/* Header */}
      <header className="bg-white border-b border-dynaton-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/dynaton-logo.png" alt="Dynaton Data" className="h-8 w-auto" />
              <span className="hidden sm:block text-xs font-mono font-medium tracking-[0.15em] text-dynaton-red uppercase opacity-70 group-hover:opacity-100 transition-opacity">
                Leads Platform
              </span>
            </Link>

            {user && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-dynaton-gray border border-dynaton-border">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full ring-2 ring-dynaton-red/20" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-dynaton-red/10 flex items-center justify-center text-dynaton-red text-xs font-bold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-800 hidden sm:block">{user.name}</span>
                </div>

                <button
                  onClick={() => setShowSignOutDialog(true)}
                  className="flex items-center gap-1.5 text-sm text-dynaton-muted hover:text-dynaton-red font-medium"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {showSignOutDialog && (
        <SignOutDialog
          onConfirm={handleConfirmSignOut}
          onCancel={() => setShowSignOutDialog(false)}
        />
      )}
    </div>
  );
}

export default App;
