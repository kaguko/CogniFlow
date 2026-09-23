/* Ambient type definitions for configuration JSON files */
declare module '*/firebase-applet-config.json' {
  const config: {
    projectId?: string;
    appId?: string;
    storageBucket?: string;
    apiKey?: string;
    authDomain?: string;
    messagingSenderId?: string;
    measurementId?: string;
    [key: string]: any;
  };
  export default config;
}
