// Importa as funções do Auth e Firestore
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Importa 'auth', 'db' e a nossa nova função 'checkAuth'
import { auth, db, checkAuth } from './firebase-init.js';

document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. VERIFICA SE O UTILIZADOR ESTÁ LOGADO ---
    // (Esta função vai redirecionar para 'index.html' se não estiver)
    // checkAuth(); // Vamos chamar isso de outra forma mais robusta

    // Seleciona os elementos da página
    const userNameElement = document.getElementById("user-name");
    const userEmailElement = document.getElementById("user-email");
    const logoutBtn = document.getElementById("logout-btn");
    const deleteLink = document.getElementById("delete-account-link");

    // --- 2. OBSERVA MUDANÇAS NO LOGIN ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // UTILIZADOR ESTÁ LOGADO!
            console.log("Utilizador logado:", user.uid);
            
            // Agora, vamos buscar os dados dele no Firestore
            loadUserProfile(user);

        } else {
            // UTILIZADOR NÃO ESTÁ LOGADO
            // Redireciona para a página de login
            console.log("Nenhum utilizador logado. Redirecionando...");
            window.location.href = "index.html";
        }
    });

    // --- 3. FUNÇÃO PARA CARREGAR OS DADOS ---
    async function loadUserProfile(user) {
        // Pega o email da 'auth' (é mais fiável)
        userEmailElement.textContent = user.email;

        // Tenta buscar o documento com o nome no Firestore
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // Encontrou o documento! Pega o nome.
            userNameElement.textContent = docSnap.data().nome;
        } else {
            // Não encontrou (talvez seja um utilizador antigo do Google Login)
            // Usa o 'displayName' da 'auth' como alternativa
            userNameElement.textContent = user.displayName || "Utilizador";
        }
    }


    // --- LÓGICA DO BOTÃO DE SAIR (LOGOUT) ---
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            if (confirm("Tem certeza que deseja sair?")) {
                // Função do Firebase para fazer logout
                auth.signOut().then(() => {
                    console.log("Utilizador deslogado!");
                    window.location.href = "index.html";
                }).catch((error) => {
                    console.error("Erro ao sair:", error);
                });
            }
        });
    }

    // --- LÓGICA DE EXCLUIR CONTA (Simulação) ---
    // (O código de exclusão real é mais complexo, mantemos a simulação por agora)
    if (deleteLink) {
        deleteLink.addEventListener("click", function(event) {
            event.preventDefault(); 
            if (confirm("Tem certeza? Esta ação é irreversível.")) {
                if (confirm("Confirmação final: Excluir permanentemente sua conta?")) {
                    alert("Conta excluída (simulação).");
                    // (Aqui entraria a lógica de exclusão do Firebase)
                    auth.signOut().then(() => {
                        window.location.href = "index.html";
                    });
                }
            }
        });
    }

    // --- LÓGICA DOS BOTÕES DE ALTERNÂNCIA (TOGGLES) ---
    // (Mantida igual)
    const toggles = document.querySelectorAll(".toggle-switch");
    toggles.forEach(toggle => {
        toggle.addEventListener("click", function() {
            toggle.classList.toggle("active");
            const isChecked = toggle.classList.contains("active");
            toggle.setAttribute("aria-checked", isChecked);
            // ... (simulação de console.log) ...
        });
    });

});
