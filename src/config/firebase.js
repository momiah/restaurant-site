// Firebase is a PLATFORM-level resource: one project holds every restaurant's data,
// scoped by restaurantId. Config comes from build-time env vars (see .env.example)
// so nothing restaurant- or project-specific is baked into source. The fallback
// values keep local development working when no .env is present.
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAm1bPTxm9csx2HYISUm35xlwUahGKxg8Q",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "menudock-platform.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "menudock-platform",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "menudock-platform.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "824146300662",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:824146300662:web:9b55170f16fd98bb62e6d7",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-6V9SW20WHC",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export default app;
