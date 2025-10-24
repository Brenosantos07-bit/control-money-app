// Função para determinar o logo com base no nome da conta
export function getLogoForBankName(name) {
    if (!name) return "assets/imagens/generic-bank.svg"; // Retorna genérico se o nome for vazio

    const lowerCaseName = name.toLowerCase();

    // Verifique se os nomes dos seus ficheiros estão corretos aqui!
    if (lowerCaseName.includes("nubank")) return "/assets/imagens/Nubank_logo_2021.svg.png";
    if (lowerCaseName.includes("itaú") || lowerCaseName.includes("itau")) return "/assets/imagens/Itaú_Unibanco_logo_2023.svg.png";
    if (lowerCaseName.includes("bradesco")) return "/assets/imagens/bradesco-logo.png";
    if (lowerCaseName.includes("santander")) return "/assets/imagens/santander-logo.png";
    if (lowerCaseName.includes("caixa")) return "/assets/imagens/caixa-economica-federal-logo-png_seeklogo-24768.png";
    if (lowerCaseName.includes("banco do brasil") || lowerCaseName.includes(" bb ")) return "/assets/imagens/banco-do-brasil-logo.png";
    if (lowerCaseName.includes("inter")) return "/assets/imagens/interlogo.png";
    if (lowerCaseName.includes("Mercado Pago")) return "/assets/imagens/mercado-pago-logo-png_seeklogo-342347.png"

    // Se não encontrar nenhum, retorna o genérico
    return "/assets/imagens/banco-generico-logo.png";
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
