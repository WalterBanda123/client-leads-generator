import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCdrnzkdvRC8TGXvKqEQ5roai7XxPbBvNM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "leads-generator-3a10e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "leads-generator-3a10e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "leads-generator-3a10e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "75890273146",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:75890273146:web:bea09eef52ef3c617d04c3",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XR12VNYCT1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
