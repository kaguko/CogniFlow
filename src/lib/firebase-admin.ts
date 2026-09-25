import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let rawConfig: Record<string, string | undefined> = {};

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch {
  // Ignore missing or malformed config
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  rawConfig.projectId ||
  'symflowage-app';

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
