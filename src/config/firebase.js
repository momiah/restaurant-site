// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD3ehzE8DkNklEK5f3X_mZvSm7ULTcqtdY",
  authDomain: "tacomonster-a73fa.firebaseapp.com",
  projectId: "tacomonster-a73fa",
  storageBucket: "tacomonster-a73fa.appspot.com",
  messagingSenderId: "772366282257",
  appId: "1:772366282257:web:260eea70453f26aefb4bb0",
  measurementId: "G-F7GS8X2PC2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export default app;
