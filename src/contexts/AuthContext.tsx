import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { signInWithCredential, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import { usersAPI } from '../services/api';

const ALLOWED_DOMAIN = 'dynatondata.com';

interface User {
  id?: string;
  google_id: string;
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
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'dynaton_auth_user';

// Helper to get initial user from localStorage
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  // Listen for Firebase auth state changes to restore session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        // Firebase user is authenticated, restore from localStorage if available
        const storedUser = getStoredUser();
        if (storedUser && storedUser.email === firebaseUser.email) {
          setUser(storedUser);
        } else {
          // Build user from Firebase auth
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
        // Not authenticated or wrong domain
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentialResponse: GoogleCredentialResponse): Promise<{ success: boolean; error?: string }> => {
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);

      // Check if email is from allowed domain
      if (!decoded.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return {
          success: false,
          error: `Access restricted to @${ALLOWED_DOMAIN} accounts only`
        };
      }

      // Sign in with Firebase using the Google credential
      const credential = GoogleAuthProvider.credential(credentialResponse.credential);
      await signInWithCredential(auth, credential);

      // Save user to database
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

        if (response.data.success) {
          dbUserId = response.data.data._id;
          console.log(`User ${response.data.isNew ? 'created' : 'updated'} in database:`, response.data.data.email);
        }
      } catch (apiError) {
        console.error('Failed to save user to database:', apiError);
        // Continue with login even if DB save fails
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
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
