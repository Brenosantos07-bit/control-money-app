// Importa funções do Auth e Firestore
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, onSnapshot, query, updateDoc, deleteDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
// Importa instâncias do Firebase
import { auth, db } from './firebase-init.js';
// Importa funções utilitárias (getLogo, formatCurrency, knownBanks)
import { getLogoForBankName, formatCurrency, knownBanks } from './utils.js';

document.addEventListener("DOMContentLoaded", function() {
    console.log("-> dashboard.js carregado");

    // --- Seletores de Elementos Globais ---
    const userGreeting = document.getElementById("user-greeting");
    const totalBalanceElement = document.querySelector(".total-balance");
    const visibilityBtn = document.querySelector(".visibility-btn");
    const visibilityIcon = document.getElementById("visibility-icon-img");
    const accountsListElement = document.querySelector(".accounts-list");
    // Modais e formulários de CONTAS
    const addAccountModal = document.getElementById("add-account-modal");
    const addAccountForm = document.getElementById("add-account-form");
    const closeAddAccountBtn = document.getElementById("modal-close-btn");
    const addAccountSelect = document.getElementById("account-name"); // ID do <select> no modal Adicionar
    const editAccountModal = document.getElementById("edit-account-modal");
    const editAccountForm = document.getElementById("edit-account-form");
    const closeEditAccountBtn = document.getElementById("edit-modal-close-btn");
    const deleteAccountBtn = document.getElementById("delete-account-btn");
    // Seletores para o Resumo de Gastos
    const fixedExpensesTotalElement = document.getElementById("fixed-expenses-total");
    const variableExpensesTotalElement = document.getElementById("variable-expenses-total");
    // Botão Ver Tudo
    const viewAllExpensesBtn = document.querySelector(".view-all-btn");

    // Verificação inicial se elementos essenciais existem
    if (!userGreeting || !totalBalanceElement || !accountsListElement || !addAccountModal || !editAccountModal || !fixedExpensesTotalElement || !variableExpensesTotalElement || !addAccountSelect) {
        console.error("ERRO CRÍTICO: Elementos essenciais do HTML do Dashboard não encontrados! Verifique os IDs.");
        if (!userGreeting) console.error("Elemento #user-greeting não encontrado.");
        if (!totalBalanceElement) console.error("Elemento .total-balance não encontrado.");
        if (!accountsListElement) console.error("Elemento .accounts-list não encontrado.");
        if (!addAccountModal) console.error("Elemento #add-account-modal não encontrado.");
        if (!editAccountModal) console.error("Elemento #edit-account-modal não encontrado.");
        if (!fixedExpensesTotalElement) console.error("Elemento #fixed-expenses-total não encontrado.");
        if (!variableExpensesTotalElement) console.error("Elemento #variable-expenses-total não encontrado.");
        if (!addAccountSelect) console.error("Elemento #account-name (o <select>) não encontrado no modal Adicionar.");
        return; // Impede a execução se algo essencial faltar
    }

    // --- Variáveis de Estado ---
    let currentUserId = null;
    let currentEditingAccountId = null; // Para editar contas
    let userAccounts = []; // Guarda as contas do utilizador
    let isBalanceVisible = true; // Estado do botão olho
    const hiddenPlaceholder = "R$ ••••••";
    let originalTotalBalance = "R$ 0,00"; // Será atualizado dinamicamente

    // --- LÓGICA DE AUTENTICAÇÃO E CARREGAMENTO INICIAL ---
    console.log("-> A verificar estado de autenticação...");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("-> Utilizador logado:", currentUserId);
            // Buscar nome do utilizador
            fetchUserName(currentUserId);
            // Escutar e mostrar contas bancárias
            listenToAccounts(currentUserId);
            // Escutar gastos e atualizar o resumo
            listenToExpensesAndUpdateSummary(currentUserId);
            // Preencher o seletor de bancos no modal de adicionar conta
            populateBankSelector();
        } else {
            console.log("-> Nenhum utilizador logado. Redirecionando...");
            window.location.href = "index.html";
        }
    });

    // --- FUNÇÃO PARA BUSCAR NOME DO UTILIZADOR (Firestore) ---
    async function fetchUserName(userId) {
        console.log("-> Buscando nome do utilizador...");
        const userDocRef = doc(db, "usuarios", userId);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                userGreeting.textContent = `Olá, ${userData.nome}!`;
                console.log("-> Nome encontrado no Firestore:", userData.nome);
            } else {
                const currentUser = auth.currentUser; // Plano B: usar o displayName
                if (currentUser && currentUser.displayName) {
                     userGreeting.textContent = `Olá, ${currentUser.displayName}!`;
                     console.warn("-> Documento do utilizador não encontrado no Firestore, usando displayName do Auth.");
                } else {
                     userGreeting.textContent = "Olá!";
                     console.warn("-> Documento do utilizador não encontrado e displayName indisponível.");
                }
            }
        } catch (error) {
            console.error("-> Erro ao buscar nome do utilizador:", error);
            userGreeting.textContent = "Olá!";
        }
    }

    // --- FUNÇÃO PARA ESCUTAR E MOSTRAR CONTAS BANCÁRIAS ---
    function listenToAccounts(userId) {
        if (!userId) return;
        console.log("-> A configurar listener para contas:", `usuarios/${userId}/contas`);
        const accountsCollectionRef = collection(db, "usuarios", userId, "contas");
        const q = query(accountsCollectionRef, orderBy("nome"));

        onSnapshot(q, (snapshot) => {
            console.log("-> Atualização das contas recebida. Número:", snapshot.size);
            let accountsHtml = "";
            let totalBalance = 0;
            userAccounts = []; // Limpa array local

            if (snapshot.empty) {
                console.log("-> Nenhuma conta encontrada.");
                accountsHtml = '<p class="empty-list-message">Nenhuma conta adicionada ainda.</p>';
            } else {
                snapshot.forEach((doc) => {
                    const account = doc.data();
                    const accountId = doc.id;
                    userAccounts.push({ id: accountId, ...account }); // Guarda localmente
                    const balance = parseFloat(account.saldo) || 0;
                    totalBalance += balance;

                    accountsHtml += `
                        <li class="account-item" data-account-id="${accountId}">
                            <img src="${account.caminhoDoLogo || '/assets/imagens/banco-generico-logo.png'}" alt="Logo ${account.nome}" class="bank-logo">
                            <div class="account-details">
                                <span class="account-name">${account.nome || 'Sem nome'}</span>
                                <span class="account-balance">${formatCurrency(balance)}</span>
                            </div>
                            <button class="icon-btn edit-item-btn">
                                <img src="./assets/imagens/Edit.svg" alt="Editar">
                            </button>
                        </li>`;
                });
            }

            accountsListElement.innerHTML = accountsHtml;
            console.log("-> Lista de contas HTML atualizada.");
            originalTotalBalance = formatCurrency(totalBalance); // Guarda o total calculado
            updateTotalBalanceVisibility(); // Atualiza o saldo total (considerando o botão 'olho')
            addAccountEditButtonListeners(); // Adiciona listeners aos botões de editar

        }, (error) => {
            console.error("-> Erro CRÍTICO ao escutar contas:", error);
            accountsListElement.innerHTML = '<p class="error-message">Erro ao carregar contas.</p>';
            totalBalanceElement.textContent = "Erro";
        });
    }

    // --- FUNÇÃO PARA ESCUTAR GASTOS E ATUALIZAR RESUMO ---
    function listenToExpensesAndUpdateSummary(userId) {
        if (!userId) return;
        console.log("-> A configurar listener para gastos (resumo):", `usuarios/${userId}/gastos`);
        const expensesCollectionRef = collection(db, "usuarios", userId, "gastos");

        onSnapshot(expensesCollectionRef, (snapshot) => {
            console.log("-> Atualização dos gastos recebida para resumo. Número:", snapshot.size);
            let fixedTotal = 0;
            let variableTotal = 0;

            if (!snapshot.empty) {
                snapshot.forEach((doc) => {
                    const expense = doc.data();
                    const value = parseFloat(expense.valor) || 0;

                    if (expense.categoria === 'fixed') {
                        fixedTotal += value;
                    } else if (expense.categoria === 'variable') {
                        variableTotal += value;
                    }
                });
            }

            fixedExpensesTotalElement.textContent = formatCurrency(fixedTotal);
            variableExpensesTotalElement.textContent = formatCurrency(variableTotal);
            console.log("-> Resumo de gastos atualizado: Fixos =", formatCurrency(fixedTotal), " Variáveis =", formatCurrency(variableTotal));

        }, (error) => {
            console.error("-> Erro CRÍTICO ao escutar gastos para resumo:", error);
            fixedExpensesTotalElement.textContent = "Erro";
            variableExpensesTotalElement.textContent = "Erro";
        });
    }


    // --- LÓGICA DO BOTÃO OLHO (SALDO TOTAL) ---
    function updateTotalBalanceVisibility() {
        if (isBalanceVisible) {
            totalBalanceElement.textContent = originalTotalBalance;
            if (visibilityIcon) visibilityIcon.src = "./assets/imagens/eye.svg";
        } else {
            totalBalanceElement.textContent = hiddenPlaceholder;
            if (visibilityIcon) visibilityIcon.src = "./assets/imagens/eye-off.svg";
        }
        console.log("-> Visibilidade do saldo total atualizada. Visível:", isBalanceVisible);
    }
    if (visibilityBtn) {
        visibilityBtn.addEventListener("click", function() {
            isBalanceVisible = !isBalanceVisible;
            updateTotalBalanceVisibility();
        });
    } else {
        console.warn("-> Botão de visibilidade não encontrado.");
    }


    // --- LÓGICA DO MODAL DE ADICIONAR CONTA ---
    const openAddAccountBtn = document.getElementById("add-account-btn");
    // Preenche o seletor de bancos ao carregar
    function populateBankSelector() {
        addAccountSelect.innerHTML = '<option value="">Selecione o banco</option>'; // Limpa
        knownBanks.forEach(bank => {
            const option = document.createElement('option');
            option.value = bank.name;
            option.textContent = bank.name;
            addAccountSelect.appendChild(option);
        });
        console.log("-> Seletor de bancos preenchido.");
    }
    // Abrir modal ADICIONAR CONTA
    if (openAddAccountBtn && addAccountModal) {
        openAddAccountBtn.addEventListener("click", () => {
            console.log("-> Botão + Adicionar Conta clicado.");
            if (addAccountForm) addAccountForm.reset();
            addAccountModal.classList.add("show");
        });
    } else console.warn("-> Botão #add-account-btn ou modal #add-account-modal não encontrados.");
    // Fechar modal ADICIONAR CONTA
    if (closeAddAccountBtn && addAccountModal) {
        closeAddAccountBtn.addEventListener("click", () => addAccountModal.classList.remove("show"));
    }
    if (addAccountModal) {
        addAccountModal.addEventListener("click", (event) => {
            if (event.target === addAccountModal) addAccountModal.classList.remove("show");
        });
    }
    // SUBMIT do formulário ADICIONAR CONTA
    if (addAccountForm && addAccountModal) {
        addAccountForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            if (!currentUserId) return alert("Erro: Utilizador não logado.");

            const accountBalanceInput = document.getElementById("account-balance");
            const selectedBankName = addAccountSelect.value;
            const balance = parseFloat(accountBalanceInput.value) || 0;

            if (!selectedBankName) {
                 alert("Por favor, selecione um banco ou tipo de conta.");
                 return;
            }
            if (isNaN(balance)) {
                 alert("Por favor, insira um saldo inicial válido (pode ser 0).");
                 return;
            }

            const logoPath = getLogoForBankName(selectedBankName);
            console.log("-> A adicionar conta:", { selectedBankName, balance, logoPath });
            const accountsCollectionRef = collection(db, "usuarios", currentUserId, "contas");

            try {
                await addDoc(accountsCollectionRef, {
                    nome: selectedBankName,
                    saldo: balance,
                    caminhoDoLogo: logoPath,
                    criadoEm: serverTimestamp()
                });
                console.log("-> Conta adicionada com sucesso!");
                addAccountForm.reset();
                addAccountModal.classList.remove("show");
            } catch (error) {
                console.error("-> Erro ao adicionar conta:", error);
                alert("Erro ao salvar a conta.");
            }
        });
    } else console.error("ERRO: Formulário #add-account-form ou modal #add-account-modal não encontrados.");


    // --- LÓGICA DO MODAL DE EDITAR CONTA ---
    // Adiciona listeners aos botões de editar (lápis) das contas
    function addAccountEditButtonListeners() {
        const editItemBtns = document.querySelectorAll(".account-item .edit-item-btn");
        console.log(`-> Adicionando/Re-adicionando listeners a ${editItemBtns.length} botões de editar conta.`);
        editItemBtns.forEach(btn => {
            btn.removeEventListener('click', handleAccountEditButtonClick);
            btn.addEventListener('click', handleAccountEditButtonClick);
        });
    }
    // Função chamada ao clicar no lápis de uma conta
    function handleAccountEditButtonClick() {
        if (!editAccountModal || !editAccountForm) {
            console.error("ERRO: Elementos do modal Editar Conta não encontrados.");
            return;
        }
        const accountItem = this.closest(".account-item");
        currentEditingAccountId = accountItem.dataset.accountId;
        console.log("-> Botão EDITAR CONTA clicado para ID:", currentEditingAccountId);

        const accountData = userAccounts.find(acc => acc.id === currentEditingAccountId);
        if (!accountData) {
            console.error("-> Conta não encontrada no array local para ID:", currentEditingAccountId);
            return alert("Erro ao carregar dados da conta.");
        }

        const nameInput = document.getElementById("edit-account-name");
        const balanceInput = document.getElementById("edit-account-balance");
        if (nameInput) nameInput.value = accountData.nome || '';
        if (balanceInput) balanceInput.value = accountData.saldo || 0;

        editAccountModal.classList.add("show");
    }
    // Fechar modal EDITAR CONTA
    if (closeEditAccountBtn && editAccountModal) {
        closeEditAccountBtn.addEventListener("click", () => editAccountModal.classList.remove("show"));
    }
    if (editAccountModal) {
        editAccountModal.addEventListener("click", (event) => {
            if (event.target === editAccountModal) editAccountModal.classList.remove("show");
        });
    }
    // SUBMIT do formulário EDITAR CONTA
    if (editAccountForm && editAccountModal) {
        editAccountForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            if (!currentUserId || !currentEditingAccountId) return alert("Erro: Conta inválida.");

            const nameInput = document.getElementById("edit-account-name");
            const balanceInput = document.getElementById("edit-account-balance");
            const newName = nameInput.value.trim();
            const newBalance = parseFloat(balanceInput.value) || 0;

            if (!newName) {
                 alert("O nome da conta não pode ficar vazio.");
                 return;
            }
             if (isNaN(newBalance)) {
                 alert("Por favor, insira um saldo válido.");
                 return;
             }

            console.log(`-> A salvar alterações para Conta ID ${currentEditingAccountId}:`, { newName, newBalance });
            const accountDocRef = doc(db, "usuarios", currentUserId, "contas", currentEditingAccountId);
            const logoPath = getLogoForBankName(newName);

            try {
                await updateDoc(accountDocRef, {
                    nome: newName,
                    saldo: newBalance,
                    caminhoDoLogo: logoPath
                });
                console.log("-> Alterações da conta salvas com sucesso!");
                editAccountModal.classList.remove("show");
                currentEditingAccountId = null;
            } catch (error) {
                console.error("-> Erro ao salvar alterações da conta:", error);
                alert("Erro ao salvar as alterações.");
            }
        });
    } else console.error("ERRO: Formulário #edit-account-form ou modal #edit-account-modal não encontrados.");
    // Botão EXCLUIR CONTA no modal de edição
    if (deleteAccountBtn && editAccountModal) {
        deleteAccountBtn.addEventListener("click", async function() {
            if (!currentUserId || !currentEditingAccountId) return alert("Erro: Conta inválida.");
            const accountNameInput = document.getElementById("edit-account-name");
            const accountName = accountNameInput ? accountNameInput.value : 'esta conta';

            if (confirm(`Tem certeza que deseja excluir a conta "${accountName}"?`)) {
                console.log(`-> A excluir Conta ID ${currentEditingAccountId}`);
                const accountDocRef = doc(db, "usuarios", currentUserId, "contas", currentEditingAccountId);
                try {
                    await deleteDoc(accountDocRef);
                    console.log("-> Conta excluída com sucesso!");
                    editAccountModal.classList.remove("show");
                    currentEditingAccountId = null;
                } catch (error) {
                    console.error("-> Erro ao excluir conta:", error);
                    alert("Erro ao excluir a conta.");
                }
            }
        });
    } else console.error("ERRO: Botão #delete-account-btn ou modal #edit-account-modal não encontrados.");


    // --- BOTÃO VER TUDO (GASTOS) ---
    if (viewAllExpensesBtn) {
        viewAllExpensesBtn.addEventListener("click", function() {
            console.log("-> Botão Ver Tudo (Gastos) clicado.");
            window.location.href = "gastos.html";
        });
    } else console.warn("-> Botão .view-all-btn não encontrado.");


}); // Fim do DOMContentLoaded