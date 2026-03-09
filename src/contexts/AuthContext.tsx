import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { usersAPI } from '../services/api';

const ALLOWED_DOMAIN = 'dynatondata.com';

interface User {
  id?: string;
  google_id?: string;
  email: string;
  name: string;
  picture?: string;
  firstName: string;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleJwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentialResponse: GoogleCredentialResponse) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signupWithEmail: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'dynaton_auth_user';

function getStoredUser(): User | null {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      const parsedUser = JSON.parse(stored);
      if (parsedUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return parsedUser;
      }
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
  return null;
}

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    default: return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        const storedUser = getStoredUser();
        if (storedUser && storedUser.email === firebaseUser.email) {
          setUser(storedUser);
        } else {
          const userData: User = {
            google_id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email,
            picture: firebaseUser.photoURL || undefined,
            firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
          };
          setUser(userData);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
        }
      } else {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Google login ──────────────────────────────────────────────────────────
  const login = async (credentialResponse: GoogleCredentialResponse): Promise<{ success: boolean; error?: string }> => {
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);

      if (!decoded.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return { success: false, error: `Access restricted to @${ALLOWED_DOMAIN} accounts only` };
      }

      const credential = GoogleAuthProvider.credential(credentialResponse.credential);
      await signInWithCredential(auth, credential);

      let dbUserId: string | undefined;
      try {
        const response = await usersAPI.saveGoogleUser({
          google_id: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          given_name: decoded.given_name,
          family_name: decoded.family_name,
          picture: decoded.picture,
        });
        if (response.data.success) dbUserId = response.data.data._id;
      } catch (apiError) {
        console.error('Failed to save user to database:', apiError);
      }

      const userData: User = {
        id: dbUserId,
        google_id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        firstName: decoded.given_name || decoded.name.split(' ')[0],
      };

      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Failed to process login' };
    }
  };

  // ── Email / password login ────────────────────────────────────────────────
  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return { success: false, error: `Only @${ALLOWED_DOMAIN} email addresses are allowed.` };
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

      const userData: User = {
        google_id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: firebaseUser.displayName || email.split('@')[0],
        picture: firebaseUser.photoURL || undefined,
        firstName: firebaseUser.displayName?.split(' ')[0] || email.split('@')[0],
      };

      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      return { success: false, error: mapFirebaseError(code) };
    }
  };

  // ── Email / password signup ───────────────────────────────────────────────
  const signupWithEmail = async (email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return { success: false, error: `Only @${ALLOWED_DOMAIN} email addresses are allowed.` };
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });

      const userData: User = {
        google_id: result.user.uid,
        email: result.user.email!,
        name: displayName,
        firstName: displayName.split(' ')[0],
      };

      setUser(userData);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      return { success: false, error: mapFirebaseError(code) };
    }
  };

  // ── Password reset ────────────────────────────────────────────────────────
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return { success: false, error: `Only @${ALLOWED_DOMAIN} email addresses are allowed.` };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      return { success: false, error: mapFirebaseError(code) };
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithEmail, signupWithEmail, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
