const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- BANCO DE DADOS ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Erro SQLite:', err.message);
    else console.log('💾 Banco de dados conectado.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orcamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fornecedor TEXT,
        data TEXT,
        total_geral REAL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orcamento_id INTEGER,
        produto TEXT,
        marca TEXT,
        quantidade REAL,
        valor_unitario REAL,
        total REAL,
        FOREIGN KEY(orcamento_id) REFERENCES orcamentos(id)
    )`);
});

// --- ROTAS ---

// 1. SALVAR OU ATUALIZAR (Inteligente)
app.post('/api/orcamento', (req, res) => {
    // Agora aceitamos o 'id' também
    const { items, fornecedor, id } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: 'Sem itens.' });

    // Cálculos
    let totalGeral = 0;
    const itensProcessados = items.map(item => {
        const total = parseFloat((item.quantidade * item.valorUnitario).toFixed(2));
        totalGeral += total;
        return { ...item, total };
    });
    totalGeral = parseFloat(totalGeral.toFixed(2));
    const dataHoje = new Date().toISOString();

    // LÓGICA DE DECISÃO: ATUALIZAR OU CRIAR?
    if (id) {
        // --- MODO ATUALIZAÇÃO (UPDATE) ---
        // 1. Atualiza o cabeçalho
        const sqlUpdate = `UPDATE orcamentos SET fornecedor = ?, data = ?, total_geral = ? WHERE id = ?`;
        
        db.run(sqlUpdate, [fornecedor, dataHoje, totalGeral, id], function(err) {
            if (err) return res.status(400).json({ error: err.message });

            // 2. Apaga os itens antigos deste orçamento (para inserir os novos atualizados)
            db.run(`DELETE FROM itens WHERE orcamento_id = ?`, [id], (err) => {
                if (err) return res.status(400).json({ error: err.message });

                // 3. Insere os itens novamente
                const stmt = db.prepare(`INSERT INTO itens (orcamento_id, produto, marca, quantidade, valor_unitario, total) VALUES (?, ?, ?, ?, ?, ?)`);
                itensProcessados.forEach(i => stmt.run(id, i.produto, i.marca, i.quantidade, i.valorUnitario, i.total));
                stmt.finalize();

                res.json({ 
                    message: "Atualizado com sucesso!", 
                    relatorio: { id: id, fornecedor, itens: itensProcessados, totalGeral, data: dataHoje } 
                });
            });
        });

    } else {
        // --- MODO CRIAÇÃO (INSERT) - Como era antes ---
        db.run(`INSERT INTO orcamentos (fornecedor, data, total_geral) VALUES (?, ?, ?)`, 
            [fornecedor, dataHoje, totalGeral], 
            function(err) {
                if (err) return res.status(400).json({ error: err.message });
                const orcamentoId = this.lastID;

                const stmt = db.prepare(`INSERT INTO itens (orcamento_id, produto, marca, quantidade, valor_unitario, total) VALUES (?, ?, ?, ?, ?, ?)`);
                itensProcessados.forEach(i => stmt.run(orcamentoId, i.produto, i.marca, i.quantidade, i.valorUnitario, i.total));
                stmt.finalize();

                res.json({ 
                    message: "Criado com sucesso!", 
                    relatorio: { id: orcamentoId, fornecedor, itens: itensProcessados, totalGeral, data: dataHoje } 
                });
            }
        );
    }
});

// 2. LISTAR TODOS
app.get('/api/orcamentos', (req, res) => {
    db.all(`SELECT * FROM orcamentos ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

// 3. BUSCAR UM
app.get('/api/orcamentos/:id', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM orcamentos WHERE id = ?`, [id], (err, orcamento) => {
        if (err || !orcamento) return res.status(404).json({ error: "Não encontrado" });
        
        db.all(`SELECT * FROM itens WHERE orcamento_id = ?`, [id], (err, itens) => {
            if (err) return res.status(400).json({ error: err.message });
            
            const itensFormatados = itens.map(i => ({
                produto: i.produto, marca: i.marca, quantidade: i.quantidade, valorUnitario: i.valor_unitario, total: i.total
            }));

            res.json({ relatorio: { ...orcamento, itens: itensFormatados } });
        });
    });
});
// ... (outras rotas get/post acima) ...

// 4. DELETAR ORÇAMENTO (DELETE)
app.delete('/api/orcamentos/:id', (req, res) => {
    const id = req.params.id;

    // 1. Apaga os itens vinculados a este orçamento
    db.run(`DELETE FROM itens WHERE orcamento_id = ?`, [id], (err) => {
        if (err) return res.status(400).json({ error: err.message });

        // 2. Apaga o orçamento (cabeçalho)
        db.run(`DELETE FROM orcamentos WHERE id = ?`, [id], function(err) {
            if (err) return res.status(400).json({ error: err.message });
            
            // Verifica se algo foi realmente apagado
            if (this.changes === 0) {
                return res.status(404).json({ error: "Orçamento não encontrado." });
            }

            res.json({ message: "Orçamento excluído com sucesso!" });
        });
    });
});

// ... (app.listen no final) ...
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});