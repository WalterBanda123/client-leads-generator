import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDoyKuszZ1PaXau1Gsk41Um29J2NnnBCXY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "leads-generator-6e370.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "leads-generator-6e370",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "leads-generator-6e370.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "723209232480",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:723209232480:web:287803eb9b92b926c06305",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-H82X24FJXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
