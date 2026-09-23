/* Type declarations for firebase-admin modular subpaths */

declare module 'firebase-admin/app' {
  export interface App {
    name: string;
    options: Record<string, any>;
  }

  export interface AppOptions {
    credential?: any;
    databaseURL?: string;
    storageBucket?: string;
    projectId?: string;
    [key: string]: any;
  }

  export function initializeApp(options?: AppOptions, name?: string): App;
  export function getApps(): App[];
  export function getApp(name?: string): App;
  export function deleteApp(app: App): Promise<void>;
}

declare module 'firebase-admin/auth' {
  import type { App } from 'firebase-admin/app';

  export interface DecodedIdToken {
    aud: string;
    auth_time: number;
    email?: string;
    email_verified?: boolean;
    exp: number;
    firebase: {
      identities: {
        [key: string]: any;
      };
      sign_in_provider: string;
      sign_in_attributes?: {
        [key: string]: any;
      };
      [key: string]: any;
    };
    iat: number;
    iss: string;
    phone_number?: string;
    picture?: string;
    sub: string;
    uid: string;
    [key: string]: any;
  }

  export interface UserRecord {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
    photoURL?: string;
    phoneNumber?: string;
    disabled?: boolean;
    [key: string]: any;
  }

  export interface Auth {
    app: App;
    verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
    getUser(uid: string): Promise<UserRecord>;
    getUserByEmail(email: string): Promise<UserRecord>;
    createCustomToken(uid: string, developerClaims?: object): Promise<string>;
    revokeRefreshTokens(uid: string): Promise<void>;
    [key: string]: any;
  }

  export function getAuth(app?: App): Auth;
}
