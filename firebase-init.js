// Importa as funções necessárias
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Sua configuração (mantida)
const firebaseConfig = {
    apiKey: "AIzaSyAwRDWwF7G6lnpeOJug2lGaFVyWSWZLWcg",
    authDomain: "control-money-ca7cd.firebaseapp.com",
    projectId: "control-money-ca7cd",
    storageBucket: "control-money-ca7cd.firebasestorage.app",
    messagingSenderId: "744543437219",
    appId: "1:744543437219:web:045c9f6219abf85ab49a16"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Disponibiliza os serviços
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- NOVA FUNÇÃO DE GUARDA ---
// Esta função verifica se o utilizador está logado
// Se não estiver, redireciona para o index.html
export const checkAuth = () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Utilizador não está logado
            console.log("Utilizador não logado. Redirecionando para login...");
            // Verifica se já não estamos no login para evitar loop
            // NOTA: Ajuste '/index.html' se o seu caminho for diferente no GitHub Pages
            if (window.location.pathname.endsWith('/index.html') === false && window.location.pathname.endsWith('/') === false) {
                 window.location.href = 'index.html';
            }
        }
    });
};

