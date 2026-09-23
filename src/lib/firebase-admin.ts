import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const rawConfig = (firebaseAppletConfig || {}) as Record<string, string | undefined>;

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  rawConfig.projectId ||
  'platinum-totem-nlcf1';

if (!getApps().length) {
  try {
    initializeApp({
      projectId,
    });
  } catch (error) {
    console.warn('Firebase admin initialization warning:', error);
  }
}

export const adminAuth = getAuth();
