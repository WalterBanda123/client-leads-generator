import { createContext, useContext, useState, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
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
  const [isLoading] = useState(false);

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
    } catch {
      return { success: false, error: 'Failed to process login' };
    }
  };

  const logout = () => {
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
