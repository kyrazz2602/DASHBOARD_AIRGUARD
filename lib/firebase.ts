import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, off, set, get } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (only once)
let app = null;
try {
  // Only initialize if we have at least the API config
  if (firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
} catch (error) {
  console.warn("Firebase initialization skipped or failed (likely during build):", error);
}

let database = {} as any;
let auth = {} as any;

try {
  if (app) {
    database = getDatabase(app);
    auth = getAuth(app);
  }
} catch (error) {
  console.warn("Firebase services init error:", error);
}

const googleProvider = new GoogleAuthProvider();

export { database, ref, onValue, off, set, get, auth, googleProvider };
