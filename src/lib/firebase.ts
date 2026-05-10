import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBT7Cag4jABSmA9oxser58rCFAsPaxeL84",
  authDomain: "approve-project-scope.firebaseapp.com",
  projectId: "approve-project-scope",
  storageBucket: "approve-project-scope.firebasestorage.app",
  messagingSenderId: "55321678405",
  appId: "1:55321678405:web:25262921416626792f892c",
  measurementId: "G-LQXQJWYJJ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, analytics, auth, db, functions };
