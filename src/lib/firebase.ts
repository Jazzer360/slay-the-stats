import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCFRT9eSAWdDGP74mB8Zb4tXiFoUwlEOlc",
  authDomain: "slay-the-stats.firebaseapp.com",
  projectId: "slay-the-stats",
  storageBucket: "slay-the-stats.firebasestorage.app",
  messagingSenderId: "973938765208",
  appId: "1:973938765208:web:d48b0b58449131eb684fed",
  measurementId: "G-5T9NRST648",
};

const app = initializeApp(firebaseConfig);

export const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6Le2da0sAAAAANNYCtM-_e2CPS0OeL4tYmznwij-'),
  isTokenAutoRefreshEnabled: true,
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
