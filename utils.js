// --- LISTA DE BANCOS CONHECIDOS ---
// Adicione mais bancos aqui se desejar.
// Certifique-se que o 'logoPath' corresponde ao nome do ficheiro em assets/imagens/
export const knownBanks = [
    { name: "Nubank", logoPath: "./assets/imagens/Nubank_logo_2021.svg.png" },
    { name: "Itaú", logoPath: "./assets/imagens/Itaú_Unibanco_logo_2023.svg.png" },
    { name: "Bradesco", logoPath: "./assets/imagens/bradesco-logo.png" },
    { name: "Santander", logoPath: "./assets/imagens/santander-logo.png" },
    { name: "Caixa Econômica", logoPath: "./assets/imagens/caixa-economica-federal-logo-png_seeklogo-24768.png" },
    { name: "Banco do Brasil", logoPath: "./assets/imagens/banco-do-brasil-logo.png" },
    { name: "Inter", logoPath: "./assets/imagens/interlogo.png" },
    { name: "Carteira", logoPath: "./assets/imagens/dinheiro.png" },
    { name: "Outro Banco", logoPath: "./assets/imagens/banco-generico-logo.png" },
    { name: "Mercado Pago", logoPath: "./assets/imagens/mercado-pago-logo-png_seeklogo-342347.png" },
    { name: "Pag Bank", logoPath: "./assets/imagens/pag banck logo.png" },
];

// --- FUNÇÕES UTILITÁRIAS ---

// Função simplificada para obter o logo (agora procura na lista)
export function getLogoForBankName(selectedName) {
    console.log("-> getLogoForBankName chamado com:", selectedName);
    if (!selectedName) return "./assets/imagens/generic-bank.svg";

    const foundBank = knownBanks.find(bank => bank.name === selectedName);

    if (foundBank) {
        console.log("-> Logo encontrado:", foundBank.logoPath);
        return foundBank.logoPath;
    } else {
        console.log("-> Nenhum banco correspondente na lista, a usar genérico.");
        return "./assets/imagens/generic-bank.svg";
    }
}

// Função para formatar números como moeda brasileira (R$)
export function formatCurrency(value) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}
