import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD7d2chbxs8C2b55tIyV2MGAEqEQp2rv_k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pureureun-siktak.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pureureun-siktak",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pureureun-siktak.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1096919953860",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1096919953860:web:03f2c38cf4fbea38317491"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
