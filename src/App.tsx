import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import {
  LogOut,
  AlertTriangle,
  X,
  LayoutDashboard,
  Plus,
  ListTodo,
} from 'lucide-react';

function SignOutDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#CE0505]" />
            </div>
            <h3 className="font-semibold text-gray-900">Sign out</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-500 leading-relaxed">
            Are you sure you want to sign out? You'll need to sign in again to access the dashboard.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Stay signed in
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold text-white bg-[#CE0505] hover:bg-[#b00404] rounded-xl transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}

function NavItem({ to, icon, label, exact }: NavItemProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <button
      onClick={() => navigate(to)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group ${
        isActive
          ? 'bg-[#CE0505]/8 text-[#CE0505]'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#CE0505] rounded-r-full" />
      )}
      <span className={`shrink-0 ${isActive ? 'text-[#CE0505]' : 'text-gray-400 group-hover:text-gray-600'}`}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function App() {
  const { user, logout } = useAuth();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleConfirmSignOut = async () => {
    setShowSignOutDialog(false);
    await logout();
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col z-40 bg-white border-r border-gray-200">
        {/* Logo area */}
        <div className="px-5 pt-6 pb-5 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-3 mb-3">
            <img
              src="/dynaton-logo.png"
              alt="Dynaton Data"
              className="h-7 w-auto"
            />
          </Link>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#CE0505]/10 text-[#CE0505]">
            Leads Platform
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
            Main Menu
          </p>
          <NavItem
            to="/leads/new"
            icon={<Plus className="w-4 h-4" />}
            label="Add Business"
          />
          <NavItem
            to="/"
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Leads"
            exact
          />
          <NavItem
            to="/tasks"
            icon={<ListTodo className="w-4 h-4" />}
            label="Tasks"
          />
        </nav>

        {/* User footer */}
        {user && (
          <div className="px-3 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-50 mb-2">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full shrink-0 ring-2 ring-gray-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#CE0505]/10 flex items-center justify-center text-[#CE0505] text-xs font-bold shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSignOutDialog(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="ml-[240px] flex-1 min-h-screen bg-[#F7F8FA]">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <Outlet />
        </div>
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
