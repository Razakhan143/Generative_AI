// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCtD77j8itJQUHvMtKg_HAnhgz6wO7khmw",
  authDomain: "ai-resume-job-insight.firebaseapp.com",
  projectId: "ai-resume-job-insight",
  storageBucket: "ai-resume-job-insight.firebasestorage.app",
  messagingSenderId: "676401966782",
  appId: "1:676401966782:web:e39ab509eac150b10878ef",
  measurementId: "G-L5HYDW2R45"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const db = getFirestore(app);
