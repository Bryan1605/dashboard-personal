// ========================================
// Firebase Configuration
// ========================================

const firebaseConfig = {
  apiKey: "AIzaSyDz0M6Hr6rkkjC7gOxproG3cA317CHEJfg",
  authDomain: "dashboard-personal-e2bdf.firebaseapp.com",
  projectId: "dashboard-personal-e2bdf",
  storageBucket: "dashboard-personal-e2bdf.firebasestorage.app",
  messagingSenderId: "369711648563",
  appId: "1:369711648563:web:98dab33ede643771bb3846"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
