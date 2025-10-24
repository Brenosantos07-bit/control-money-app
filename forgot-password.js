// Importa a função de redefinição de senha
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Importa a instância 'auth' do nosso ficheiro de inicialização
import { auth } from './firebase-init.js';

document.addEventListener("DOMContentLoaded", function() {

    // 1. Seleciona os elementos
    const forgotForm = document.getElementById("forgot-password-form");
    const emailInput = document.getElementById("email");
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");

    // 2. Adiciona um "ouvinte" de SUBMIT (envio) ao formulário
    forgotForm.addEventListener("submit", function(event) {
        
        event.preventDefault(); // Impede o recarregamento da página
        
        // Limpa mensagens anteriores
        errorMessage.textContent = "";
        errorMessage.style.display = "none";
        successMessage.textContent = "";
        successMessage.style.display = "none";

        // 3. Pega o email
        const email = emailInput.value;

        // 4. Envia o email de redefinição
        sendPasswordResetEmail(auth, email)
            .then(() => {
                // SUCESSO!
                successMessage.textContent = "Email enviado! Verifique sua caixa de entrada (e a pasta de spam) para redefinir sua senha.";
                successMessage.style.display = "block";
                forgotForm.reset(); // Limpa o campo de email

            })
            .catch((error) => {
                // ERRO!
                console.error("Erro ao enviar email de redefinição:", error.code, error.message);
                
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                    errorMessage.textContent = "Nenhuma conta encontrada com este email.";
                } else {
                    errorMessage.textContent = "Ocorreu um erro. Tente novamente.";
                }
                errorMessage.style.display = "block";
            });
    });
});
  