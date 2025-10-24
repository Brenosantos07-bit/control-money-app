// Importa a função de criação de utilizador
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
// Importa as funções do Firestore (banco de dados)
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Importa 'auth' E 'db' (banco de dados) do nosso ficheiro de inicialização
import { auth, db } from './firebase-init.js';

document.addEventListener("DOMContentLoaded", function() {

    const signupForm = document.getElementById("signup-form");
    const errorMessage = document.getElementById("error-message");

    signupForm.addEventListener("submit", function(event) {
        
        event.preventDefault(); 
        errorMessage.textContent = "";
        errorMessage.style.display = "none";

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm-password").value;

        if (password !== confirmPassword) {
            errorMessage.textContent = "As senhas não conferem. Tente novamente.";
            errorMessage.style.display = "block";
            return; 
        }

        // --- INÍCIO DA ATUALIZAÇÃO ---
        
        // 1. Tenta criar o utilizador no Firebase (como antes)
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Sucesso!
                const user = userCredential.user;
                
                // 2. ATUALIZAÇÃO: Salva o nome no "perfil" da Autenticação
                // (Isso ajuda o Firebase a saber o nome do utilizador)
                return updateProfile(user, {
                    displayName: name
                }).then(() => {
                    
                    // 3. ATUALIZAÇÃO: Salva os dados no BANCO DE DADOS (Firestore)
                    // Nós criamos um "documento" para este utilizador na coleção "usuarios"
                    // O ID do documento será o mesmo ID do utilizador (user.uid)
                    return setDoc(doc(db, "usuarios", user.uid), {
                        nome: name,
                        email: email,
                        uid: user.uid
                    });
                });
            })
            .then(() => {
                // 4. Se tudo (criar conta E salvar dados) deu certo:
                console.log("Conta criada e dados salvos!", email);
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                // ERRO!
                console.error("Erro ao criar conta:", error.code, error.message);
                
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage.textContent = "Este email já está em uso por outra conta.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage.textContent = "A senha é muito fraca. Deve ter pelo menos 6 caracteres.";
                } else {
                    errorMessage.textContent = "Ocorreu um erro ao criar a conta.";
                }
                errorMessage.style.display = "block";
            });
        
        // --- FIM DA ATUALIZAÇÃO ---
    });
});

