// backend/server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

/**
 * @route   POST /api/orcamento
 */
app.post('/api/orcamento', (req, res) => {
const { items, fornecedor } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Formato de dados inválido.' });
  }

  let totalGeral = 0;
  const itensProcessados = [];

  try {
    for (const item of items) {
      const quantidade = parseFloat(item.quantidade);
      const valorUnitario = parseFloat(item.valorUnitario);

      if (quantidade <= 0 || valorUnitario < 0) {
         throw new Error(`Item "${item.produto}" possui valores inválidos.`);
      }

      const calculoBruto = quantidade * valorUnitario;
      const totalItem = parseFloat(calculoBruto.toFixed(2));
      totalGeral += totalItem;

      itensProcessados.push({
        produto: item.produto,
        marca: item.marca,
        quantidade: quantidade,
        valorUnitario: valorUnitario,
        total: totalItem,
      });
    }

    totalGeral = parseFloat(totalGeral.toFixed(2));

    res.json({
      relatorio: {
        // DEVOLVE O FORNECEDOR NO RELATÓRIO FINAL
        fornecedor: fornecedor || 'Não Informado', 
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