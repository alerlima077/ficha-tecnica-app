// src/db/firebase.js

// Importando SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Configuração do Firebase (substitua pelos dados do seu projeto)
const firebaseConfig = {
  apiKey: "AIzaSyD3GRJ9f-5xU0vWWU3Mm9GcUz5txMWfIho",
  authDomain: "ficha-tecnica-app-893e1.firebaseapp.com",
  projectId: "ficha-tecnica-app-893e1",
  storageBucket: "ficha-tecnica-app-893e1.appspot.com", // corrigido
  messagingSenderId: "797049112443",
  appId: "1:797049112443:web:f65bf7699493eb565c1fde"
};

// Inicializando Firebase
const app = initializeApp(firebaseConfig);

// Conectando ao Firestore
const db = getFirestore(app);

// Conectando ao Auth (login/usuários)
const auth = getAuth(app);

// Exportando para uso em outros arquivos
export { db, auth };
