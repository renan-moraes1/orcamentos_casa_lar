// frontend/script.js

// Configuração da API
// Se estiver rodando no servidor use '/api/orcamento'
// Se estiver rodando local (arquivo puro) use 'http://localhost:3001/api/orcamento'
const API_URL = '/api/orcamento'; 
//Testar Local Renan
//const API_URL = 'http://localhost:3001/api/orcamento'; 
// Estado da aplicação
let orcamentoItens = [];
let ultimoRelatorio = null;

// =================================================================
// ▼▼▼ COLE SUA LOGO BASE64 AQUI (Substitua a string abaixo) ▼▼▼
// =================================================================
let logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAABDElEQVR42mP4X8bAwIB2MyYGEshgAOMyFobvQJ0OIMQyQGcE05UaGBgYGJj4//8/AxMTEwNjyGgHxGRkE9EBsxmbgZEBiqGQAFf7W48gPZmBgYHhH0g6EIdTQEEYyDYy/wM5d4GYGBQBNv+BhBOMYwYmQpTBYA8y8EcwCDIyMv5nZGBg4HBl4uB/EBEjQOxDLoHwG9lY+L+BieE/QCEfE4M2CIMXg2EwhmEQxGAQxGAQxGAQxGAQxGAQxGAQxGCIKdgBBP4n/4P+VzCGYBjkP0AWY/g/mL9gGNAJAhkMYBhGgJkM0NlNGMTgYxjsPwlGOA+G/Ge4/w/m/wAYcZABAOyvLhvoKk0GAAAAAElFTkSuQmCC";
// =================================================================

// --- FUNÇÕES DE FORMATAÇÃO ---

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarQuantidade(valor) {
    // Se for decimal (tem resto na divisão), usa 3 casas e "kg"
    if (valor % 1 !== 0) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg';
    } else {
        // Se for inteiro, usa "un"
        return valor.toLocaleString('pt-BR') + ' un';
    }
}

// --- FUNÇÃO PRINCIPAL: ADICIONAR ITEM ---

window.adicionarItem = function(event) {
  if(event) event.preventDefault();

  // Seleciona os elementos
  const produtoInput = document.getElementById('produto');
  const marcaInput = document.getElementById('marca');
  const quantidadeInput = document.getElementById('quantidade');
  const valorInput = document.getElementById('valor');

  // Verifica se os elementos existem
  if (!produtoInput || !quantidadeInput || !valorInput) {
      alert("Erro: Campos do formulário não encontrados.");
      return;
  }

  // Converte valores (aceita ponto ou vírgula)
  let qtdVal = parseFloat(quantidadeInput.value.replace(',', '.'));
  let vlrVal = parseFloat(valorInput.value.replace(',', '.'));

  // Validação
  if (isNaN(qtdVal) || isNaN(vlrVal)) {
      alert("Preencha Quantidade e Valor corretamente.");
      return;
  }
  if (qtdVal <= 0) {
      alert("A quantidade deve ser maior que zero.");
      return;
  }

  // Cria o item
  const item = {
    id: Date.now(),
    produto: produtoInput.value,
    marca: marcaInput.value || 'N/A',
    quantidade: qtdVal,
    valorUnitario: vlrVal,
  };

  // Salva e Atualiza
  orcamentoItens.push(item);
  atualizarTabela();

  // Limpa campos
  produtoInput.value = '';
  marcaInput.value = '';
  quantidadeInput.value = '';
  valorInput.value = '';
  produtoInput.focus();
};

// --- ATUALIZAR TABELA ---

function atualizarTabela() {
  const tbody = document.getElementById('lista-itens');
  const btnGerar = document.getElementById('gerar-relatorio');
  
  if (!tbody) return;

  tbody.innerHTML = ''; 

  if (orcamentoItens.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Nenhum item adicionado.</td></tr>';
      if(btnGerar) btnGerar.disabled = true;
      return;
  }

  if(btnGerar) btnGerar.disabled = false;

  orcamentoItens.forEach(item => {
    // Cálculo visual simples
    const totalVisual = item.quantidade * item.valorUnitario;

    const tr = document.createElement('tr');
    tr.className = 'align-middle';
    tr.innerHTML = `
      <td class="text-start">${item.produto}</td>
      <td class="text-start">${item.marca}</td>
      <td class="text-center">${formatarQuantidade(item.quantidade)}</td>
      <td class="text-end">${formatarMoeda(item.valorUnitario)}</td>
      <td class="text-end fw-bold">${formatarMoeda(totalVisual)}</td>
      <td class="text-center">
        <button class="btn btn-danger btn-sm" onclick="removerItem(${item.id})">
            <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.removerItem = function(id) {
    orcamentoItens = orcamentoItens.filter(item => item.id !== id);
    atualizarTabela();
};

// --- GERAR RELATÓRIO (BACKEND) ---

window.gerarRelatorio = async function() {
    if (orcamentoItens.length === 0) return alert("Lista vazia!");
    
    const btn = document.getElementById('gerar-relatorio');
    // Pega o fornecedor do input
    const fornecedorInput = document.getElementById('input-fornecedor');
    const fornecedorNome = fornecedorInput ? fornecedorInput.value : "Não Informado";
    
    try {
        if(btn) { 
            var textoOriginal = btn.innerHTML;
            btn.innerHTML = "Gerando..."; 
            btn.disabled = true; 
        }
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Envia itens E fornecedor
            body: JSON.stringify({ items: orcamentoItens, fornecedor: fornecedorNome })
        });
        
        if (!response.ok) throw new Error((await response.json()).error || "Erro no servidor");
        
        const data = await response.json();
        ultimoRelatorio = data.relatorio;
        mostrarRelatorio(data.relatorio);
        
    } catch (e) {
        alert("Erro: " + e.message);
    } finally {
        if(btn) { 
            btn.innerHTML = textoOriginal || '<i class="bi bi-lightning-fill"></i> Gerar Relatório Detalhado'; 
            btn.disabled = false; 
        }
    }
};

function mostrarRelatorio(relatorio) {
    const container = document.getElementById('relatorio-container');
    const detalhes = document.getElementById('relatorio-detalhes');
    
    // Remove a classe d-none do Bootstrap
    container.classList.remove('d-none');
    
    let html = `
        <div class="alert alert-info">
            <div class="row">
                <div class="col-md-6"><strong>Data:</strong> ${new Date(relatorio.data).toLocaleString('pt-BR')}</div>
                <div class="col-md-6 text-md-end"><strong>Fornecedor:</strong> ${relatorio.fornecedor}</div>
            </div>
        </div>
        <div class="table-responsive">
        <table class="table table-bordered table-striped">
            <thead class="table-dark">
                <tr>
                    <th>Produto</th>
                    <th>Marca</th>
                    <th class="text-center">Qtd</th>
                    <th class="text-end">Valor Unit.</th>
                    <th class="text-end">Total</th>
                </tr>
            </thead>
            <tbody>`;
            
    relatorio.itens.forEach(i => {
        html += `<tr>
            <td>${i.produto}</td>
            <td>${i.marca}</td>
            <td class="text-center">${formatarQuantidade(i.quantidade)}</td>
            <td class="text-end">${formatarMoeda(i.valorUnitario)}</td>
            <td class="text-end fw-bold">${formatarMoeda(i.total)}</td>
        </tr>`;
    });
    
    html += `</tbody></table></div>
        <div class="d-flex justify-content-end mt-3">
            <div class="bg-light p-3 border rounded">
                <h4 class="text-primary mb-0">Total Geral: ${formatarMoeda(relatorio.totalGeral)}</h4>
            </div>
        </div>`;
        
    detalhes.innerHTML = html;
    container.scrollIntoView({behavior: "smooth"});
}

// --- GERAR PDF (RESTAURADO) ---

window.gerarPDF = function() {
  if (!ultimoRelatorio) {
    alert("Gere o relatório detalhado primeiro.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. Logo
  if (logoBase64) {
    try {
       // Detecta formato simples
       const format = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
       doc.addImage(logoBase64, format, 15, 10, 30, 30);
    } catch (e) { 
        console.error("Erro ao adicionar logo no PDF. Verifique a string Base64.", e); 
    }
  }

  // 2. Título
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("Relatório de Orçamento", pageWidth / 2, 25, { align: 'center' });

  // 3. Dados do Cabeçalho (Data e Fornecedor)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const dataFormatada = new Date(ultimoRelatorio.data).toLocaleString('pt-BR');
  doc.text(`Data de Geração: ${dataFormatada}`, 15, 50);
  
  // Adiciona o Fornecedor logo abaixo da data
  doc.setFont('helvetica', 'bold');
  doc.text(`Fornecedor: ${ultimoRelatorio.fornecedor}`, 15, 56);

  // 4. Tabela
  const head = [['Produto', 'Marca', 'Qtd.', 'Vl. Unitário', 'Total Item']];
  const body = ultimoRelatorio.itens.map(item => [
    item.produto,
    item.marca,
    { content: formatarQuantidade(item.quantidade), styles: { halign: 'right' } },
    { content: formatarMoeda(item.valorUnitario), styles: { halign: 'right' } },
    { content: formatarMoeda(item.total), styles: { halign: 'right' } }
  ]);

  doc.autoTable({
    startY: 62, // Ajustado para caber o fornecedor
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

  const finalY = doc.autoTable.previous.finalY;
  
  // 5. Total Geral
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const totalFormatado = formatarMoeda(ultimoRelatorio.totalGeral);
  doc.text(`Total Geral: ${totalFormatado}`, pageWidth - 15, finalY + 15, { align: 'right' });

  // 6. Assinaturas
  const signatureY = finalY > 220 ? 280 : finalY + 50; 
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const signatureWidth = 80;
  const signatureMargin = (pageWidth - (signatureWidth * 2)) / 3;

  // Assinatura 1
  const x1 = signatureMargin;
  doc.line(x1, signatureY, x1 + signatureWidth, signatureY);
  doc.text("Assinatura Responsável", x1 + signatureWidth / 2, signatureY + 5, { align: 'center' });

  // Assinatura 2
  const x2 = signatureMargin * 2 + signatureWidth;
  doc.line(x2, signatureY, x2 + signatureWidth, signatureY);
  doc.text("Assinatura Diretoria", x2 + signatureWidth / 2, signatureY + 5, { align: 'center' });

  doc.save('orcamento_casa_lar.pdf');
};

// --- INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema iniciado.");
    
    const form = document.getElementById('form-item');
    const btnGerar = document.getElementById('gerar-relatorio');
    const btnPdf = document.getElementById('baixar-pdf');

    // Listeners globais
    if(form) form.addEventListener('submit', window.adicionarItem);
    if(btnGerar) btnGerar.addEventListener('click', window.gerarRelatorio);
    if(btnPdf) btnPdf.addEventListener('click', window.gerarPDF);

    atualizarTabela();
});