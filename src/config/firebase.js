// Firebase is a PLATFORM-level resource: one project holds every restaurant's data,
// scoped by restaurantId. Config comes from build-time env vars (see .env.example)
// so nothing restaurant- or project-specific is baked into source. The fallback
// values keep local development working when no .env is present.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD3ehzE8DkNklEK5f3X_mZvSm7ULTcqtdY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "tacomonster-a73fa.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "tacomonster-a73fa",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "tacomonster-a73fa.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "772366282257",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:772366282257:web:260eea70453f26aefb4bb0",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-F7GS8X2PC2",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export default app;
