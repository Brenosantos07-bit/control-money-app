// Importa funções do Auth e Firestore
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
// Removido 'orderBy' da importação aqui, pois não o estamos a usar na query principal
import { doc, getDoc, collection, addDoc, onSnapshot, query, updateDoc, deleteDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
// Importa instâncias do Firebase
import { auth, db } from './firebase-init.js';
// Importa funções de formatação
import { formatCurrency } from './utils.js';

document.addEventListener("DOMContentLoaded", function() {
    console.log("-> gastos.js carregado");

    // --- Seletores de Elementos Globais ---
    const tabFixed = document.getElementById("tab-fixed");
    const tabVariable = document.getElementById("tab-variable");
    const listFixed = document.getElementById("fixed-list");
    const listVariable = document.getElementById("variable-list");
    // Modais e formulários
    const addModal = document.getElementById("add-expense-modal");
    const addForm = document.getElementById("add-expense-form");
    const addCategorySelect = document.getElementById("expense-category");
    const addAccountSelect = document.getElementById("expense-account");
    const closeAddBtn = document.getElementById("expense-modal-close-btn");
    const editModal = document.getElementById("edit-expense-modal");
    const editForm = document.getElementById("edit-expense-form");
    const closeEditBtn = document.getElementById("edit-expense-close-btn");
    const deleteExpenseBtn = document.getElementById("delete-expense-btn");

    // Verificação inicial se os elementos existem
    if (!listFixed || !listVariable || !addModal || !editModal || !addAccountSelect) {
        console.error("ERRO CRÍTICO: Elementos essenciais do HTML não encontrados! Verifique os IDs.");
        // Adiciona mensagens de erro visíveis se os elementos não forem encontrados
        if (!listFixed) document.body.insertAdjacentHTML('afterbegin', '<p style="color:red; background:white; padding:10px;">Erro: #fixed-list não encontrado.</p>');
        if (!listVariable) document.body.insertAdjacentHTML('afterbegin', '<p style="color:red; background:white; padding:10px;">Erro: #variable-list não encontrado.</p>');
        if (!addModal) document.body.insertAdjacentHTML('afterbegin', '<p style="color:red; background:white; padding:10px;">Erro: #add-expense-modal não encontrado.</p>');
        if (!editModal) document.body.insertAdjacentHTML('afterbegin', '<p style="color:red; background:white; padding:10px;">Erro: #edit-expense-modal não encontrado.</p>');
        if (!addAccountSelect) console.error("Elemento #expense-account não encontrado no modal de adicionar."); // Log apenas para este
        return; // Impede a execução do resto do código se algo essencial faltar
    }

    let currentUserId = null;
    let currentEditingExpenseId = null;
    let userAccounts = []; // Guarda as contas do utilizador

    // --- LÓGICA DE AUTENTICAÇÃO ---
    console.log("-> A verificar estado de autenticação...");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("-> Utilizador logado:", currentUserId);
            // Iniciar a escuta pelos gastos
            listenToExpenses(currentUserId);
            // Iniciar a escuta pelas contas para preencher o seletor
            listenToAccountsAndPopulateSelector(currentUserId);
        } else {
            console.log("-> Nenhum utilizador logado. Redirecionando para index.html...");
            // Verifica se já está no index.html para evitar loop
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                console.log("-> Já está na página de login.");
            } else {
                window.location.href = "index.html";
            }
        }
    });

    // --- FUNÇÃO PARA ESCUTAR E MOSTRAR GASTOS ---
    function listenToExpenses(userId) {
        if (!userId) {
            console.error("-> listenToExpenses chamado sem userId!");
            return;
        }
        console.log("-> A configurar listener para coleção:", `usuarios/${userId}/gastos`);
        const expensesCollectionRef = collection(db, "usuarios", userId, "gastos");

        // !!! CORREÇÃO DEFINITIVA: Usar a referência da coleção diretamente !!!
        console.log("-> A escutar gastos (diretamente na coleção)...");
        onSnapshot(expensesCollectionRef, (snapshot) => {
            console.log("-> Atualização dos gastos recebida. Número de documentos:", snapshot.size);
            let fixedHtml = "";
            let variableHtml = "";

            if (snapshot.empty) {
                console.log("-> Nenhum gasto encontrado.");
                // Mensagens de lista vazia serão adicionadas depois dos botões
            } else {
                snapshot.forEach((doc) => {
                    const expense = doc.data();
                    const expenseId = doc.id;
                    console.log("-> Processando gasto:", expenseId, expense);
                    const value = parseFloat(expense.valor) || 0;
                    const isPaid = expense.pago || false;
                    let dateString = '';
                    try {
                        // Tenta formatar a data de vencimento ou de criação
                        if (expense.dataVencimento && typeof expense.dataVencimento === 'string') {
                             dateString = `Venc. ${formatDate(expense.dataVencimento)}`;
                        } else if (expense.criadoEm && expense.criadoEm.toDate) {
                             dateString = `Criado em ${formatDate(expense.criadoEm.toDate())}`;
                        } else {
                             dateString = 'Data indisponível'; // Fallback
                        }
                    } catch (e) {
                        console.warn("-> Erro ao formatar data para gasto", expenseId, expense.dataVencimento, expense.criadoEm, e);
                        dateString = 'Data inválida';
                    }

                    // Cria o HTML do item com validações
                    const itemHtml = `
                        <div class="expense-item ${isPaid ? 'paid' : ''}"
                             data-id="${expenseId}"
                             data-name="${expense.nome || ''}"
                             data-value="${value}"
                             data-date="${expense.dataVencimento || ''}"
                             data-category="${expense.categoria || ''}">
                            <input type="checkbox" class="expense-checkbox" id="expense-${expenseId}" ${isPaid ? 'checked' : ''}>
                            <label for="expense-${expenseId}" class="checkbox-label"></label>
                            <div class="expense-details">
                                <span class="expense-name">${expense.nome || 'Sem nome'}</span>
                                <span class="expense-date">${dateString}</span>
                            </div>
                            <span class="expense-value">${formatCurrency(value)}</span>
                            <button class="icon-btn edit-expense-btn">
                                <img src="./assets/imagens/Edit.svg" alt="Editar">
                            </button>
                        </div>`;

                    if (expense.categoria === 'fixed') fixedHtml += itemHtml;
                    else if (expense.categoria === 'variable') variableHtml += itemHtml;
                    else console.warn("-> Gasto com categoria desconhecida:", expenseId, expense.categoria);
                });
            }

            // Limpa listas existentes (exceto botões) e reinsere conteúdo
            listFixed.innerHTML = ` <button id="add-fixed-btn" class="add-expense-list-btn"> + Adicionar Gasto Fixo </button> `;
            listVariable.innerHTML = ` <button id="add-variable-btn" class="add-expense-list-btn"> + Adicionar Reserva Semanal </button> `;

            if (fixedHtml) {
                 listFixed.innerHTML += fixedHtml;
            } else {
                 const p = document.createElement('p');
                 p.className = 'empty-list-message';
                 p.textContent = 'Nenhum gasto fixo adicionado.';
                 listFixed.appendChild(p);
            }
             if (variableHtml) {
                 listVariable.innerHTML += variableHtml;
            } else {
                 const p = document.createElement('p');
                 p.className = 'empty-list-message';
                 p.textContent = 'Nenhuma reserva adicionada.';
                 listVariable.appendChild(p);
            }

            console.log("-> Listas HTML atualizadas.");
            // Re-adiciona listeners para os elementos recém-criados
            addCoreListeners();

        }, (error) => {
            console.error("-> Erro CRÍTICO ao escutar gastos:", error);
            const errorMsg = "Erro ao carregar dados. Verifique a consola para detalhes.";
            // Limpa as listas e mostra a mensagem de erro
            listFixed.innerHTML = `<p class="error-message">${errorMsg}</p>`;
            listVariable.innerHTML = `<p class="error-message">${errorMsg}</p>`;
        });
    }


    // --- FUNÇÃO PARA ESCUTAR CONTAS E PREENCHER SELETOR ---
    function listenToAccountsAndPopulateSelector(userId) {
        if (!userId) return;
        const accountsCollectionRef = collection(db, "usuarios", userId, "contas");
        // Ordena por nome para a lista suspensa ficar organizada
        const q = query(accountsCollectionRef, orderBy("nome"));

        console.log("-> A escutar contas para o seletor...");
        onSnapshot(q, (snapshot) => {
            userAccounts = []; // Limpa antes de preencher
            if (!snapshot.empty) {
                snapshot.forEach((doc) => {
                    userAccounts.push({ id: doc.id, ...doc.data() });
                });
            }
            console.log("-> Contas do utilizador carregadas:", userAccounts.length);
            populateAccountSelector(); // Atualiza o <select> no modal de adicionar
            // Poderíamos atualizar também o seletor no modal de editar aqui, se necessário
        }, (error) => {
            console.error("-> Erro ao escutar contas para o seletor:", error);
            addAccountSelect.innerHTML = '<option value="">Erro ao carregar contas</option>';
        });
    }

    // --- FUNÇÃO PARA PREENCHER O <select> DE CONTAS ---
    function populateAccountSelector() {
        if (!addAccountSelect) {
             console.warn("-> Seletor #expense-account não encontrado para preencher.");
             return;
        }
        const previouslySelected = addAccountSelect.value;
        addAccountSelect.innerHTML = '<option value="">Selecione a conta</option>'; // Limpa opções antigas

        userAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id; // O valor é o ID do documento no Firestore
            option.textContent = account.nome; // O texto visível é o nome da conta
            addAccountSelect.appendChild(option);
        });
        console.log("-> Seletor de contas preenchido com", userAccounts.length, "contas.");
        // Tenta manter a seleção anterior, se possível
        if (previouslySelected) {
            addAccountSelect.value = previouslySelected;
        }
    }


    // --- FUNÇÕES AUXILIARES (formatDate) ---
    // Formata data YYYY-MM-DD ou objeto Date para DD/MM/YYYY
    function formatDate(dateInput) {
        try {
            let date;
            if (dateInput instanceof Date) {
                date = dateInput;
            } else if (typeof dateInput === 'string' && dateInput.includes('-')) {
                // Assume formato YYYY-MM-DD
                const parts = dateInput.split('-');
                if (parts.length === 3) {
                     // Ajusta para UTC para evitar problemas de fuso horário
                     date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                } else {
                    throw new Error("Formato de string inválido");
                }
            } else {
                return "Data inválida"; // Ou retorna string vazia ''
            }

            const day = String(date.getUTCDate()).padStart(2, '0');
            const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Meses são 0-indexed
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            console.error("-> Erro ao formatar data:", dateInput, e);
            return "Data inválida";
        }
    }


    // --- ADICIONAR LISTENERS PRINCIPAIS ---
    // Esta função é chamada sempre que a lista de gastos é redesenhada
    function addCoreListeners() {
        console.log("-> Re-adicionando listeners...");

        // Listeners dos checkboxes
        const checkboxes = document.querySelectorAll(".expense-checkbox");
        checkboxes.forEach(cb => {
            cb.removeEventListener('change', handleCheckboxChange); // Remove listener antigo para evitar duplicação
            cb.addEventListener('change', handleCheckboxChange);
        });
        console.log("->", checkboxes.length, "listeners de checkbox adicionados.");

        // Listeners dos botões de editar (lápis)
        const editExpenseBtns = document.querySelectorAll(".edit-expense-btn");
        editExpenseBtns.forEach(btn => {
            btn.removeEventListener('click', handleEditButtonClick); // Remove listener antigo
            btn.addEventListener('click', handleEditButtonClick);
        });
        console.log("->", editExpenseBtns.length, "listeners de botão editar adicionados.");

        // Listeners dos botões de adicionar (precisam ser encontrados novamente)
        const openFixedBtn = document.getElementById("add-fixed-btn");
        const openVariableBtn = document.getElementById("add-variable-btn");

        if (openFixedBtn) {
            openFixedBtn.onclick = () => openAddModal('fixed'); // Atribuição direta para simplificar
            console.log("-> Listener do botão Adicionar Fixo adicionado.");
        } else console.warn("-> Botão #add-fixed-btn não encontrado após redesenhar.");

        if (openVariableBtn) {
            openVariableBtn.onclick = () => openAddModal('variable'); // Atribuição direta
            console.log("-> Listener do botão Adicionar Reserva adicionado.");
        } else console.warn("-> Botão #add-variable-btn não encontrado após redesenhar.");
    }


    // --- LÓGICA DAS ABAS (TABS) ---
    if (tabFixed && tabVariable && listFixed && listVariable) {
        tabFixed.addEventListener("click", function() {
            tabFixed.classList.add("active");
            tabVariable.classList.remove("active");
            listFixed.classList.add("active");
            listVariable.classList.remove("active");
            console.log("-> Separador 'Gastos Fixos' selecionado.");
        });

        tabVariable.addEventListener("click", function() {
            tabVariable.classList.add("active");
            tabFixed.classList.remove("active");
            listVariable.classList.add("active");
            listFixed.classList.remove("active");
            console.log("-> Separador 'Reserva Semanal' selecionado.");
        });
    } else {
         console.error("ERRO: Elementos dos separadores não encontrados!");
    }


    // --- LÓGICA DO CHECKBOX ---
    async function handleCheckboxChange() {
        if (!currentUserId) return;
        const checkbox = this;
        const item = checkbox.closest(".expense-item");
        const expenseId = item.dataset.id;
        const isPaid = checkbox.checked;

        console.log(`-> Checkbox alterado para Gasto ID ${expenseId}. Estado: ${isPaid}`);
        item.classList.toggle("paid", isPaid); // Atualiza visualmente

        // Salva o estado no Firestore
        const expenseDocRef = doc(db, "usuarios", currentUserId, "gastos", expenseId);
        try {
            await updateDoc(expenseDocRef, { pago: isPaid });
            console.log("-> Estado 'pago' atualizado no Firestore para", expenseId);
        } catch (error) {
            console.error("-> Erro ao atualizar estado 'pago':", error);
            // Reverte a mudança visual se falhar
            checkbox.checked = !isPaid;
            item.classList.toggle("paid", !isPaid);
            alert("Erro ao atualizar o estado do gasto.");
        }
    }


    // --- LÓGICA DO MODAL DE ADICIONAR GASTO ---
    function openAddModal(category) {
        if (!addForm || !addCategorySelect || !addModal) {
             console.error("ERRO: Elementos do modal ADICIONAR não encontrados.");
             return;
        }
        console.log("-> Abrindo modal ADICIONAR para categoria:", category);
        addForm.reset(); // Limpa o formulário
        addCategorySelect.value = category; // Pré-seleciona a categoria
        populateAccountSelector(); // Garante que as contas estão atualizadas
        addModal.classList.add("show"); // Mostra o modal
    }
    // Fechar modal ADICIONAR
    if (closeAddBtn && addModal) {
        closeAddBtn.addEventListener("click", () => {
             addModal.classList.remove("show");
             if(addForm) addForm.reset();
             console.log("-> Modal ADICIONAR fechado pelo botão X.");
        });
    }
    if (addModal) {
        addModal.addEventListener("click", (event) => {
            if (event.target === addModal) {
                addModal.classList.remove("show");
                if(addForm) addForm.reset();
                console.log("-> Modal ADICIONAR fechado pelo clique fora.");
            }
        });
    }
    // SUBMIT do formulário ADICIONAR
    if (addForm && addModal) {
        addForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            if (!currentUserId) return alert("Erro: Utilizador não logado.");

            const nameInput = document.getElementById("expense-name");
            const amountInput = document.getElementById("expense-amount");
            const categoryInput = document.getElementById("expense-category");
            const accountInput = document.getElementById("expense-account");

            if (!nameInput || !amountInput || !categoryInput || !accountInput) {
                console.error("ERRO: Campos do formulário ADICIONAR não encontrados.");
                return alert("Erro interno no formulário.");
            }

            const name = nameInput.value.trim();
            const amount = parseFloat(amountInput.value) || 0;
            const category = categoryInput.value;
            const accountOriginId = accountInput.value;
            const dateInput = document.getElementById("edit-expense-date"); // Usamos o ID do modal de edição temporariamente se precisar de data aqui
            const dateValue = dateInput ? dateInput.value : null; // Pega a data se o campo existir

            if (!name || !category || !accountOriginId || isNaN(amount) || amount <= 0) {
                 alert("Por favor, preencha nome, valor válido, categoria e conta de origem.");
                 return;
            }

            console.log("-> A adicionar gasto:", { name, amount, category, accountOriginId, dateValue });
            const expensesCollectionRef = collection(db, "usuarios", currentUserId, "gastos");

            try {
                await addDoc(expensesCollectionRef, {
                    nome: name,
                    valor: amount,
                    categoria: category,
                    contaOrigemId: accountOriginId,
                    dataVencimento: dateValue || null, // Salva a data se houver, senão null
                    pago: false,
                    criadoEm: serverTimestamp()
                });
                console.log("-> Gasto adicionado com sucesso!");
                addForm.reset();
                addModal.classList.remove("show");
                // O onSnapshot vai atualizar a lista
            } catch (error) {
                console.error("-> Erro ao adicionar gasto:", error);
                alert("Erro ao salvar o gasto.");
            }
        });
    } else {
         console.error("ERRO: Formulário #add-expense-form ou modal #add-expense-modal não encontrados.");
    }


    // --- LÓGICA DO MODAL DE EDITAR GASTO ---
    function handleEditButtonClick() {
        if (!editModal || !editForm) {
            console.error("ERRO: Elementos do modal EDITAR não encontrados.");
            return;
        }
        const expenseItem = this.closest(".expense-item");
        currentEditingExpenseId = expenseItem.dataset.id; // Guarda o ID do gasto a ser editado

        console.log("-> Botão EDITAR clicado para Gasto ID:", currentEditingExpenseId);

        // Pega os dados do item
        const name = expenseItem.dataset.name;
        const value = expenseItem.dataset.value;
        const date = expenseItem.dataset.date; // Formato YYYY-MM-DD
        const category = expenseItem.dataset.category;

        // Preenche o formulário de edição
        const nameInput = document.getElementById("edit-expense-name");
        const amountInput = document.getElementById("edit-expense-amount");
        const dateInput = document.getElementById("edit-expense-date");
        const categoryInput = document.getElementById("edit-expense-category");

        if(nameInput) nameInput.value = name;
        if(amountInput) amountInput.value = value;
        if(dateInput) dateInput.value = date; // Input type="date" aceita YYYY-MM-DD
        if(categoryInput) categoryInput.value = category;

        editModal.classList.add("show");
    }
    // Fechar modal EDITAR
    if (closeEditBtn && editModal) {
        closeEditBtn.addEventListener("click", () => {
             editModal.classList.remove("show");
             console.log("-> Modal EDITAR fechado pelo botão X.");
        });
    }
    if (editModal) {
        editModal.addEventListener("click", (event) => {
            if (event.target === editModal) {
                editModal.classList.remove("show");
                console.log("-> Modal EDITAR fechado pelo clique fora.");
            }
        });
    }
    // SUBMIT do formulário EDITAR
    if (editForm && editModal) {
        editForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            if (!currentUserId || !currentEditingExpenseId) {
                 return alert("Erro: Não foi possível identificar o gasto a ser editado.");
            }

            const nameInput = document.getElementById("edit-expense-name");
            const amountInput = document.getElementById("edit-expense-amount");
            const dateInput = document.getElementById("edit-expense-date");
            const categoryInput = document.getElementById("edit-expense-category");

            if (!nameInput || !amountInput || !dateInput || !categoryInput) {
                 console.error("ERRO: Campos do formulário EDITAR não encontrados.");
                 return alert("Erro interno no formulário de edição.");
            }

            const newName = nameInput.value.trim();
            const newAmount = parseFloat(amountInput.value) || 0;
            const newDate = dateInput.value; // YYYY-MM-DD
            const newCategory = categoryInput.value;

            if (!newName || !newCategory || isNaN(newAmount) || newAmount <= 0) {
                 alert("Por favor, preencha nome, valor válido e categoria.");
                 return;
            }

            console.log(`-> A salvar alterações para Gasto ID ${currentEditingExpenseId}:`, { newName, newAmount, newDate, newCategory });
            const expenseDocRef = doc(db, "usuarios", currentUserId, "gastos", currentEditingExpenseId);

            try {
                await updateDoc(expenseDocRef, {
                    nome: newName,
                    valor: newAmount,
                    dataVencimento: newDate || null, // Guarda null se a data for limpa
                    categoria: newCategory
                });
                console.log("-> Alterações salvas com sucesso!");
                editModal.classList.remove("show");
                currentEditingExpenseId = null; // Limpa o ID após salvar
                // O onSnapshot vai atualizar a lista
            } catch (error) {
                console.error("-> Erro ao salvar alterações:", error);
                alert("Erro ao salvar as alterações.");
            }
        });
    } else {
         console.error("ERRO: Formulário #edit-expense-form ou modal #edit-expense-modal não encontrados.");
    }
    // Botão EXCLUIR no modal de edição
    if (deleteExpenseBtn && editModal) {
        deleteExpenseBtn.addEventListener("click", async function() {
            if (!currentUserId || !currentEditingExpenseId) {
                return alert("Erro: Não foi possível identificar o gasto a ser excluído.");
            }
            const expenseNameInput = document.getElementById("edit-expense-name");
            const expenseName = expenseNameInput ? expenseNameInput.value : 'este gasto';

            if (confirm(`Tem certeza que deseja excluir o gasto "${expenseName}"?`)) {
                console.log(`-> A excluir Gasto ID ${currentEditingExpenseId}`);
                const expenseDocRef = doc(db, "usuarios", currentUserId, "gastos", currentEditingExpenseId);
                try {
                    await deleteDoc(expenseDocRef);
                    console.log("-> Gasto excluído com sucesso!");
                    editModal.classList.remove("show");
                    currentEditingExpenseId = null; // Limpa o ID
                    // O onSnapshot vai atualizar a lista
                } catch (error) {
                    console.error("-> Erro ao excluir gasto:", error);
                    alert("Erro ao excluir o gasto.");
                }
            }
        });
    } else {
         console.error("ERRO: Botão #delete-expense-btn ou modal #edit-expense-modal não encontrados.");
    }

}); // Fim do DOMContentLoaded

