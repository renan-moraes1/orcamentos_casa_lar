// frontend/script.js

// URL da API (ajusta automaticamente se for local ou servidor)
// Se estiver dando erro 404 localmente, troque para 'http://localhost:3001/api/orcamento'
//const API_URL = 'http://localhost:3001/api/orcamento';
const API_URL = '/api/orcamento'; 

// Estado da aplicação
let orcamentoItens = [];
let ultimoRelatorio = null;
let orcamentoIdAtual = null;

// --- FUNÇÕES DE FORMATAÇÃO ---

function formatarMoeda(valor) {
  if (valor === undefined || valor === null || isNaN(valor)) return "R$ 0,00";
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarQuantidade(valor) {
    if (valor === undefined || valor === null || isNaN(valor)) return "0 un";
    // Se for decimal (tem resto na divisão), usa 3 casas e "kg"
    if (valor % 1 !== 0) {
        return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg';
    }
    // Se for inteiro, usa "un"
    return parseFloat(valor).toLocaleString('pt-BR') + ' un';
}

// --- AÇÕES DO FORMULÁRIO ---

window.novoOrcamento = function() {
    orcamentoItens = [];
    orcamentoIdAtual = null;
    ultimoRelatorio = null;
    
    document.getElementById('input-fornecedor').value = '';
    document.getElementById('produto').value = '';
    document.getElementById('marca').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('valor').value = '';
    
    document.getElementById('relatorio-container').classList.add('d-none');
    
    atualizarTabela();
    
    const btn = document.getElementById('gerar-relatorio');
    if(btn) btn.innerHTML = '<i class="bi bi-lightning-fill"></i> Gerar Relatório Detalhado';
};

window.adicionarItem = function(event) {
  if(event) event.preventDefault();

  const produtoInput = document.getElementById('produto');
  const marcaInput = document.getElementById('marca');
  const quantidadeInput = document.getElementById('quantidade');
  const valorInput = document.getElementById('valor');

  if (!produtoInput || !quantidadeInput || !valorInput) {
      return alert("Erro: Campos do formulário não encontrados.");
  }

  let qtdVal = parseFloat(quantidadeInput.value.replace(',', '.'));
  let vlrVal = parseFloat(valorInput.value.replace(',', '.'));

  if (isNaN(qtdVal) || isNaN(vlrVal) || qtdVal <= 0) {
      return alert("Preencha Quantidade e Valor corretamente.");
  }

  const item = {
    id: Date.now(),
    produto: produtoInput.value,
    marca: marcaInput.value || 'N/A',
    quantidade: qtdVal,
    valorUnitario: vlrVal,
  };

  orcamentoItens.push(item);
  atualizarTabela();

  produtoInput.value = '';
  marcaInput.value = '';
  quantidadeInput.value = '';
  valorInput.value = '';
  produtoInput.focus();
};

window.removerItem = function(id) {
    orcamentoItens = orcamentoItens.filter(item => item.id !== id);
    atualizarTabela();
};

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
    const total = item.quantidade * item.valorUnitario;
    const tr = document.createElement('tr');
    tr.className = 'align-middle';
    tr.innerHTML = `
      <td class="text-start">${item.produto}</td>
      <td class="text-start">${item.marca}</td>
      <td class="text-center">${formatarQuantidade(item.quantidade)}</td>
      <td class="text-end">${formatarMoeda(item.valorUnitario)}</td>
      <td class="text-end fw-bold">${formatarMoeda(total)}</td>
      <td class="text-center">
        <button class="btn btn-danger btn-sm" onclick="removerItem(${item.id})">
            <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- API: SALVAR / ATUALIZAR ---

window.gerarRelatorio = async function() {
    if (orcamentoItens.length === 0) return alert("Adicione itens.");
    
    const btn = document.getElementById('gerar-relatorio');
    const fornecedor = document.getElementById('input-fornecedor').value || "Não Informado";
    
    try {
        if(btn) {
            var textoOriginal = btn.innerHTML;
            btn.innerHTML = "Salvando..."; 
            btn.disabled = true;
        }
        
        const payload = { 
            items: orcamentoItens, 
            fornecedor: fornecedor,
            id: orcamentoIdAtual
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error((await response.json()).error || "Erro no servidor");
        
        const data = await response.json();
        
        orcamentoIdAtual = data.relatorio.id;
        ultimoRelatorio = data.relatorio;
        
        mostrarRelatorio(data.relatorio);
        
        if(btn) {
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Salvo!';
            setTimeout(() => {
                 btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Atualizar Relatório'; 
                 btn.disabled = false;
            }, 1500);
        }

    } catch (e) {
        alert("Erro: " + e.message);
        if(btn) { btn.innerHTML = '<i class="bi bi-lightning-fill"></i> Gerar Relatório'; btn.disabled = false; }
    }
};

function mostrarRelatorio(rel) {
    const container = document.getElementById('relatorio-container');
    const detalhes = document.getElementById('relatorio-detalhes');
    
    container.classList.remove('d-none');
    
    let dataFormatada = "Data Inválida";
    try { dataFormatada = new Date(rel.data).toLocaleString('pt-BR'); } catch(e){}

    let html = `
        <div class="alert alert-info d-flex justify-content-between align-items-center">
            <div>
                <span class="badge bg-primary me-2">Orçamento #${rel.id}</span>
                <span><strong>Data:</strong> ${dataFormatada}</span>
            </div>
            <span><strong>Fornecedor:</strong> ${rel.fornecedor}</span>
        </div>
        <div class="table-responsive">
        <table class="table table-bordered table-striped">
            <thead class="table-dark"><tr><th>Produto</th><th>Marca</th><th class="text-center">Qtd</th><th class="text-end">Valor</th><th class="text-end">Total</th></tr></thead>
            <tbody>`;
            
    rel.itens.forEach(i => {
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
            <h4 class="text-primary mb-0">Total Geral: ${formatarMoeda(rel.totalGeral)}</h4>
        </div>
    </div>`;
    
    detalhes.innerHTML = html;
    container.scrollIntoView({behavior:"smooth"});
}

// --- API: LISTAR, CARREGAR E DELETAR ---

window.abrirModalOrcamentos = async function() {
    const modalEl = document.getElementById('modalOrcamentos');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    
    const tbody = document.getElementById('lista-orcamentos-salvos');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

    try {
        const response = await fetch(API_URL + 's'); 
        if(!response.ok) throw new Error("Erro ao buscar lista.");
        
        const lista = await response.json();
        tbody.innerHTML = lista.length ? '' : '<tr><td colspan="5" class="text-center">Nenhum salvo.</td></tr>';

        lista.forEach(o => {
            let dataF = new Date(o.data).toLocaleDateString('pt-BR');
            const tr = document.createElement('tr');
            
            // ATUALIZADO: Adicionado o botão de Excluir na última coluna
            tr.innerHTML = `
                <td>#${o.id}</td>
                <td>${o.fornecedor}</td>
                <td>${dataF}</td>
                <td class="fw-bold">${formatarMoeda(o.total_geral)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-primary" onclick="carregarOrcamento(${o.id})" title="Abrir/Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletarOrcamento(${o.id})" title="Excluir">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (e) { 
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${e.message}</td></tr>`; 
    }
};

// NOVA FUNÇÃO: DELETAR
window.deletarOrcamento = async function(id) {
    // 1. Confirmação para evitar acidentes
    if (!confirm(`Tem certeza que deseja excluir o orçamento #${id}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}s/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error("Erro ao excluir.");

        alert("Orçamento excluído!");
        
        // Fecha o modal atual para forçar a atualização da lista (gambiarra segura)
        // Ou simplesmente recarrega a lista se o modal ainda estiver aberto
        // Aqui vamos fechar e reabrir visualmente é mais simples de codar agora:
        const modalEl = document.getElementById('modalOrcamentos');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        
        // Reabre o modal para atualizar a lista
        setTimeout(() => {
            window.abrirModalOrcamentos();
        }, 300);

    } catch (e) {
        alert("Erro: " + e.message);
    }
};

window.carregarOrcamento = async function(id) {
    try {
        const response = await fetch(`${API_URL}s/${id}`);
        const data = await response.json();
        
        const modalEl = document.getElementById('modalOrcamentos');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
        
        const rel = data.relatorio;
        orcamentoIdAtual = rel.id;
        
        document.getElementById('input-fornecedor').value = rel.fornecedor;
        orcamentoItens = rel.itens.map(i => ({ ...i, id: Date.now() + Math.random() }));
        
        atualizarTabela();
        ultimoRelatorio = rel;
        mostrarRelatorio(rel);
        
        const btn = document.getElementById('gerar-relatorio');
        if(btn) btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Atualizar Relatório';

    } catch (e) { alert("Erro ao abrir: " + e.message); }
};


// --- GERAR PDF (SOMENTE TÍTULO FIXO) ---

window.gerarPDF = function() {
  if (!ultimoRelatorio) return alert("Gere o relatório antes.");
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // 1. LOGO (Lê do HTML)
  const imgHtml = document.querySelector('.navbar-brand img');
  if (imgHtml && imgHtml.src.includes("data:image")) {
      try {
          const logoDados = imgHtml.src; 
          const formato = logoDados.split(';')[0].split('/')[1].toUpperCase();
          if(['PNG', 'JPEG', 'JPG'].includes(formato)) {
             doc.addImage(logoDados, formato, 15, 10, 30, 30);
          }
      } catch (e) { console.error("Erro logo:", e); }
  }

  // 2. TÍTULO (AGORA SÓ TEM O FIXO)
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text("Orçamento Casa Lar", 105, 25, { align: 'center' }); 

  // --- REMOVIDO: A linha que mostrava "Orçamento #ID" foi apagada aqui ---

  // 3. DADOS (Data e Fornecedor)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  let dataF = new Date(ultimoRelatorio.data).toLocaleString('pt-BR');
  doc.text(`Data: ${dataF}`, 15, 50);
  doc.text(`Fornecedor: ${ultimoRelatorio.fornecedor}`, 15, 56);

  // 4. TABELA
  const body = (ultimoRelatorio.itens || []).map(i => [
    i.produto, i.marca, 
    { content: formatarQuantidade(i.quantidade), styles: { halign: 'right' } },
    { content: formatarMoeda(i.valorUnitario), styles: { halign: 'right' } },
    { content: formatarMoeda(i.total), styles: { halign: 'right' } }
  ]);

  doc.autoTable({ 
      startY: 62, 
      head: [['Produto', 'Marca', 'Qtd', 'Vl. Unit.', 'Total']], 
      body: body, 
      headStyles: { fillColor: [44, 62, 80] }, 
      columnStyles: { 2: {halign:'right'}, 3: {halign:'right'}, 4: {halign:'right'} } 
  });

  // 5. TOTAIS E ASSINATURAS
  const finalY = doc.autoTable.previous.finalY;
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${formatarMoeda(ultimoRelatorio.totalGeral)}`, 195, finalY + 15, { align: 'right' });

  const signatureY = finalY > 220 ? 280 : finalY + 50; 
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  const signatureWidth = 80;
  const signatureMargin = (doc.internal.pageSize.getWidth() - (signatureWidth * 2)) / 3;

  const x1 = signatureMargin;
  doc.line(x1, signatureY, x1 + signatureWidth, signatureY);
  doc.text("Assinatura Responsável", x1 + signatureWidth / 2, signatureY + 5, { align: 'center' });

  const x2 = signatureMargin * 2 + signatureWidth;
  doc.line(x2, signatureY, x2 + signatureWidth, signatureY);
  doc.text("Assinatura Diretoria", x2 + signatureWidth / 2, signatureY + 5, { align: 'center' });

  doc.save(`orcamento_casa_lar.pdf`);
};
// ... (resto do código) ...

// --- INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-item');
    if(form) form.addEventListener('submit', window.adicionarItem);
    
    const btnGerar = document.getElementById('gerar-relatorio');
    if(btnGerar) btnGerar.addEventListener('click', window.gerarRelatorio);
    
    const btnPdf = document.getElementById('baixar-pdf');
    if(btnPdf) btnPdf.addEventListener('click', window.gerarPDF);

    atualizarTabela();
});