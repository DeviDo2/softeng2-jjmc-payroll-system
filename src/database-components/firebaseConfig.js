// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// DO NOT SHARE THIS. KEEP PRIVATE
const firebaseConfig = {
  apiKey: "AIzaSyAL0cRx0PVJJzQoMCsjEd7Uivw1tgWPThU",
  authDomain: "database-test-34eff.firebaseapp.com",
  projectId: "database-test-34eff",
  storageBucket: "database-test-34eff.appspot.com",
  messagingSenderId: "164578632191",
  appId: "1:164578632191:web:b6819b648fab96e007c7ca",
  measurementId: "G-JD6LLGHHYY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

// Initialize Cloud Functions
const functions = getFunctions(app);

export { app, functions };
export { firebaseConfig };

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);