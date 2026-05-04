import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase (usar variables de entorno en producción)
const firebaseConfig = {
  apiKey: "AIzaSyD9fSFqT3AMgULhqSGxHkT19Oif_433e58",
  authDomain: "edu-metrics-pro.firebaseapp.com",
  projectId: "edu-metrics-pro",
  storageBucket: "edu-metrics-pro.firebasestorage.app",
  messagingSenderId: "1007579536656",
  appId: "1:1007579536656:web:ebf148b80815877d325995"
};

// Inicializar Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
