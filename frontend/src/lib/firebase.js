import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB9KhEYyY4JstCGwq-PJJtw8xxEwktkR2A",
  authDomain: "gstu-portal.firebaseapp.com",
  projectId: "gstu-portal",
  storageBucket: "gstu-portal.firebasestorage.app",
  messagingSenderId: "416446593799",
  appId: "1:416446593799:web:11115ba5e9923e933ea3a2",
  measurementId: "G-QD89RP4JE8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Ensure persistence is set
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Firebase persistence error:", err));
