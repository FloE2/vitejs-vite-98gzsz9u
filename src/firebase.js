import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// REMPLACEZ par votre vraie configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC9cBQwq588hqge_OfR5a1YUp1sTMDl8bE",
  authDomain: "eps-sante-ydm.firebaseapp.com",
  projectId: "eps-sante-ydm",
  storageBucket: "eps-sante-ydm.firebasestorage.app",
  messagingSenderId: "440447077345",
  appId: "1:440447077345:web:91092d2899c1cdbe6b60a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;