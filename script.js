// Importa a nova função de autenticação que precisamos
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Importa a instância 'auth' que inicializamos no firebase-init.js
// Este ficheiro 'firebase-init.js' TEM de existir
import { auth } from './firebase-init.js';

document.addEventListener("DOMContentLoaded", function() {

    // 1. Seleciona o formulário e a mensagem de erro
    const loginForm = document.getElementById("login-form");
    const errorMessage = document.getElementById("error-message");

    // 2. Adiciona um "ouvinte" de SUBMIT (envio) ao formulário
    loginForm.addEventListener("submit", function(event) {
        
        // Impede o recarregamento padrão da página
        event.preventDefault(); 
        
        // Esconde mensagens de erro antigas
        errorMessage.textContent = "";
        errorMessage.style.display = "none";

        // 3. Pega os valores dos campos de email e senha
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        // 4. Tenta fazer o login com o Firebase
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // SUCESSO! O usuário fez o login.
                const user = userCredential.user;
                console.log("Login bem-sucedido!", user.email);
                
                // Redireciona para o dashboard
                window.location.href = "dashboard.html";

            })
            .catch((error) => {
                // ERRO! Algo deu errado.
                console.error("Erro na autenticação:", error.code, error.message);
                
                // Mostra uma mensagem de erro amigável para o usuário
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                    errorMessage.textContent = "Email ou senha incorretos. Tente novamente.";
                } else {
                    errorMessage.textContent = "Ocorreu um erro. Tente novamente mais tarde.";
                }
                errorMessage.style.display = "block";
            });
    });
});

