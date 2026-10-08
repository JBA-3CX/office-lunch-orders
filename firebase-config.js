import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsqwJNqVHp7moMHka8dT0xllkEYioa2hg",
  authDomain: "office-lunch-orders.firebaseapp.com",
  databaseURL: "https://office-lunch-orders-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "office-lunch-orders",
  storageBucket: "office-lunch-orders.firebasestorage.app",
  messagingSenderId: "186331905102",
  appId: "1:186331905102:web:b876c0fb394d4c36ad971f",
  measurementId: "G-VGZV5SSE6Z"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.db = db;
window.dbRef = ref;
window.dbSet = set;
window.dbOnValue = onValue;
window.dbPush = push;
window.dbRemove = remove;
