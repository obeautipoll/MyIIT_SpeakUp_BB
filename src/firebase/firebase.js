import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 


const firebaseConfig = {
  apiKey: "AIzaSyDqRfeSLKkuykc-vNkKLbvQHUIpZ9IaSU0",
  authDomain: "bb-speakup.firebaseapp.com",
  projectId: "bb-speakup",
  storageBucket: "bb-speakup.firebasestorage.app",
  messagingSenderId: "609466283176",
  appId: "1:609466283176:web:2069d8971593fd0ab03e9d",
  measurementId: "G-6L0J9Z5PS0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db , storage, firebaseConfig};

