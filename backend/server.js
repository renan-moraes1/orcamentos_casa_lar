// backend/server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001; // Usaremos a porta 3001 para o backend

// Middlewares
app.use(cors()); // Permite que o frontend (em outra porta) acesse esta API
app.use(express.json()); // Permite que o servidor entenda JSON

/**
 * @route   POST /api/orcamento
 * @desc    Recebe uma lista de itens, calcula os totais e retorna um relatório
 */
app.post('/api/orcamento', (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Formato de dados inválido. Esperava um array de "items".' });
  }

  let totalGeral = 0;
  const itensProcessados = [];

  try {
    for (const item of items) {
      const quantidade = parseFloat(item.quantidade);
      const valorUnitario = parseFloat(item.valorUnitario);

      // Validação
      if (isNaN(quantidade) || isNaN(valorUnitario) || quantidade <= 0 || valorUnitario < 0) {
         throw new Error(`Item "${item.produto}" possui valores inválidos.`);
      }

      const totalItem = quantidade * valorUnitario;
      totalGeral += totalItem;

      itensProcessados.push({
        produto: item.produto,
        marca: item.marca,
        quantidade: quantidade,
        valorUnitario: valorUnitario,
        total: totalItem, // O total calculado no backend
      });
    }

    // Resposta de sucesso com o relatório detalhado
    res.json({
      relatorio: {
        itens: itensProcessados,
        totalGeral: totalGeral,
        data: new Date().toISOString(),
      },
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando em http://localhost:${PORT}`);
});