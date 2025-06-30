import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC9cBQwq588hqge_OfR5a1YUp1sTMDl8bE",
  authDomain: "eps-sante-ydm.firebaseapp.com",
  projectId: "eps-sante-ydm",
  storageBucket: "eps-sante-ydm.firebasestorage.app",
  messagingSenderId: "440447077345",
  appId: "1:440447077345:web:91092d2899c1cdbe6b60a0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);