import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA76p4YAoQMlZBzslEC5iWKOUA8o_y7YxQ",
  authDomain: "expensetracker-7b99a.firebaseapp.com",
  projectId: "expensetracker-7b99a",
  storageBucket: "expensetracker-7b99a.appspot.com",
  messagingSenderId: "420173425953",
  appId: "1:420173425953:web:889ed3d14598d1b2352260"
};


export const FIREBASE_APP = initializeApp(firebaseConfig);

export const FIREBASE_STORAGE =  getStorage(FIREBASE_APP);

export const FIREBASE_FIRESTORE = getFirestore(FIREBASE_APP);
