import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const clientConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    firebaseAppletConfig.apiKey ||
    '',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    firebaseAppletConfig.authDomain ||
    'platinum-totem-nlcf1.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    firebaseAppletConfig.projectId ||
    'platinum-totem-nlcf1',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseAppletConfig.storageBucket ||
    undefined,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseAppletConfig.messagingSenderId ||
    undefined,
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    firebaseAppletConfig.appId ||
    undefined,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    firebaseAppletConfig.measurementId ||
    undefined,
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let isConfigured = false;

try {
  if (!clientConfig.apiKey || clientConfig.apiKey === 'YOUR_FIREBASE_WEB_API_KEY') {
    console.warn(
      'Firebase apiKey is missing or using placeholder. Set VITE_FIREBASE_API_KEY or configure firebase-applet-config.json.'
    );
  } else {
    app = getApps().length === 0 ? initializeApp(clientConfig) : getApps()[0];
    authInstance = getAuth(app);
    isConfigured = true;
  }
} catch (error) {
  console.warn('Firebase Auth initialization encountered an error:', error);
}

// Fallback dummy auth object to safely satisfy TypeScript and onAuthStateChanged listeners without uncaught throws
export const auth: Auth =
  authInstance ??
  ({
    onAuthStateChanged: () => () => {},
    currentUser: null,
  } as unknown as Auth);

export const isFirebaseConfigured = isConfigured;
export const googleAuthProvider = new GoogleAuthProvider();
