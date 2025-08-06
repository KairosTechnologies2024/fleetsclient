import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD8uGqzqokt3i354ZgBZoZb5TywYwhGG_E",
  authDomain: "ksdiv-3ba17.firebaseapp.com",
  projectId: "ksdiv-3ba17",
  storageBucket: "ksdiv-3ba17.appspot.com",
  messagingSenderId: "672014659899",
  appId: "1:672014659899:web:106b0385022b8e1f79471e"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
