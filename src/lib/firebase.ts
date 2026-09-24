import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
const firebaseAppletConfigModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });

const rawConfig =
  ((firebaseAppletConfigModules['../../firebase-applet-config.json'] as { default?: Record<string, string | undefined> } | undefined)?.default || {}) as Record<string, string | undefined>;

const clientConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    rawConfig.apiKey ||
    '',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    rawConfig.authDomain ||
    'platinum-totem-nlcf1.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    rawConfig.projectId ||
    'platinum-totem-nlcf1',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    rawConfig.storageBucket ||
    undefined,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    rawConfig.messagingSenderId ||
    undefined,
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    rawConfig.appId ||
    undefined,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    rawConfig.measurementId ||
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
