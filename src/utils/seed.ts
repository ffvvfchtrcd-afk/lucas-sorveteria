function iso(d: string) {
  return `${d}T12:00:00.000Z`
}

const PRECOS = [
  { itemId: 'acai-001', itemNome: 'Polpa de Açaí', precoCusto: 22, precoVenda: 38 },
  { itemId: 'sor-001', itemNome: 'Sorvete Creme 2L', precoCusto: 12, precoVenda: 25 },
  { itemId: 'sor-002', itemNome: 'Sorvete Chocolate 2L', precoCusto: 14, precoVenda: 28 },
  { itemId: 'sor-003', itemNome: 'Sorvete Morango 2L', precoCusto: 13, precoVenda: 26 },
  { itemId: 'sor-004', itemNome: 'Casquinha Crocante', precoCusto: 0.5, precoVenda: 1.5 },
  { itemId: 'sor-005', itemNome: 'Copo para Sorvete 300ml', precoCusto: 0.3, precoVenda: 1 },
  { itemId: 'mp-001', itemNome: 'Leite Integral 1L', precoCusto: 4.5, precoVenda: 7 },
  { itemId: 'mp-002', itemNome: 'Açúcar Refinado 5kg', precoCusto: 8, precoVenda: 12 },
  { itemId: 'mp-003', itemNome: 'Chocolate em Pó 200g', precoCusto: 6, precoVenda: 10 },
  { itemId: 'mp-004', itemNome: 'Leite em Pó 400g', precoCusto: 12, precoVenda: 18 },
  { itemId: 'mp-005', itemNome: 'Creme de Leite 200g', precoCusto: 3.5, precoVenda: 6 },
  { itemId: 'mp-006', itemNome: 'Essência de Baunilha', precoCusto: 5, precoVenda: 8 },
  { itemId: 'mp-007', itemNome: 'Corante Alimentício', precoCusto: 3, precoVenda: 5 },
  { itemId: 'mp-008', itemNome: 'Farinha de Trigo 1kg', precoCusto: 3, precoVenda: 5 },
  { itemId: 'mp-009', itemNome: 'Manteiga 200g', precoCusto: 5, precoVenda: 8 },
  { itemId: 'mp-010', itemNome: 'Ovos (bandeja 30un)', precoCusto: 8, precoVenda: 12 },
  { itemId: 'mp-011', itemNome: 'Glucose 1kg', precoCusto: 7, precoVenda: 11 },
  { itemId: 'mp-012', itemNome: 'Amido de Milho 500g', precoCusto: 4, precoVenda: 6 },
]

const MOVIMENTACOES = [
  // ── Entradas de mercadoria ──
  { id: 'log_seed_e1', itemId: 'mp-001', itemNome: 'Leite Integral 1L', tipo: 'entrada' as const, quantidade: 10, data: iso('2026-05-28'), origem: 'Seed' },
  { id: 'log_seed_e2', itemId: 'acai-001', itemNome: 'Polpa de Açaí', tipo: 'entrada' as const, quantidade: 5, data: iso('2026-05-29'), origem: 'Seed' },
  { id: 'log_seed_e3', itemId: 'sor-001', itemNome: 'Sorvete Creme 2L', tipo: 'entrada' as const, quantidade: 4, data: iso('2026-05-30'), origem: 'Seed' },
  { id: 'log_seed_e4', itemId: 'sor-003', itemNome: 'Sorvete Morango 2L', tipo: 'entrada' as const, quantidade: 3, data: iso('2026-05-31'), origem: 'Seed' },
  { id: 'log_seed_e5', itemId: 'mp-005', itemNome: 'Creme de Leite 200g', tipo: 'entrada' as const, quantidade: 6, data: iso('2026-05-31'), origem: 'Seed' },

  // ── Vendas (30/05 a 02/06) ──
  { id: 'log_seed_v1', itemId: 'sor-001', itemNome: 'Sorvete Creme 2L', tipo: 'venda' as const, quantidade: 2, data: iso('2026-05-30'), origem: 'PDV' },
  { id: 'log_seed_v2', itemId: 'sor-002', itemNome: 'Sorvete Chocolate 2L', tipo: 'venda' as const, quantidade: 1, data: iso('2026-05-30'), origem: 'PDV' },
  { id: 'log_seed_v3', itemId: 'sor-004', itemNome: 'Casquinha Crocante', tipo: 'venda' as const, quantidade: 15, data: iso('2026-05-30'), origem: 'PDV' },
  { id: 'log_seed_v4', itemId: 'acai-001', itemNome: 'Polpa de Açaí', tipo: 'venda' as const, quantidade: 2, data: iso('2026-05-31'), origem: 'PDV' },
  { id: 'log_seed_v5', itemId: 'sor-003', itemNome: 'Sorvete Morango 2L', tipo: 'venda' as const, quantidade: 1, data: iso('2026-05-31'), origem: 'PDV' },
  { id: 'log_seed_v6', itemId: 'sor-001', itemNome: 'Sorvete Creme 2L', tipo: 'venda' as const, quantidade: 1, data: iso('2026-05-31'), origem: 'PDV' },
  { id: 'log_seed_v7', itemId: 'sor-004', itemNome: 'Casquinha Crocante', tipo: 'venda' as const, quantidade: 20, data: iso('2026-05-31'), origem: 'PDV' },
  { id: 'log_seed_v8', itemId: 'sor-005', itemNome: 'Copo para Sorvete 300ml', tipo: 'venda' as const, quantidade: 10, data: iso('2026-05-31'), origem: 'PDV' },
  { id: 'log_seed_v9', itemId: 'acai-001', itemNome: 'Polpa de Açaí', tipo: 'venda' as const, quantidade: 1, data: iso('2026-06-01'), origem: 'PDV' },
  { id: 'log_seed_v10', itemId: 'sor-002', itemNome: 'Sorvete Chocolate 2L', tipo: 'venda' as const, quantidade: 1, data: iso('2026-06-01'), origem: 'PDV' },
  { id: 'log_seed_v11', itemId: 'sor-003', itemNome: 'Sorvete Morango 2L', tipo: 'venda' as const, quantidade: 2, data: iso('2026-06-01'), origem: 'PDV' },
  { id: 'log_seed_v12', itemId: 'sor-004', itemNome: 'Casquinha Crocante', tipo: 'venda' as const, quantidade: 30, data: iso('2026-06-01'), origem: 'PDV' },
  { id: 'log_seed_v13', itemId: 'sor-005', itemNome: 'Copo para Sorvete 300ml', tipo: 'venda' as const, quantidade: 15, data: iso('2026-06-01'), origem: 'PDV' },
  { id: 'log_seed_v14', itemId: 'acai-001', itemNome: 'Polpa de Açaí', tipo: 'venda' as const, quantidade: 1, data: iso('2026-06-02'), origem: 'PDV' },
  { id: 'log_seed_v15', itemId: 'sor-001', itemNome: 'Sorvete Creme 2L', tipo: 'venda' as const, quantidade: 2, data: iso('2026-06-02'), origem: 'PDV' },
  { id: 'log_seed_v16', itemId: 'sor-004', itemNome: 'Casquinha Crocante', tipo: 'venda' as const, quantidade: 25, data: iso('2026-06-02'), origem: 'PDV' },
  { id: 'log_seed_v17', itemId: 'sor-005', itemNome: 'Copo para Sorvete 300ml', tipo: 'venda' as const, quantidade: 12, data: iso('2026-06-02'), origem: 'PDV' },

  // ── Perdas ──
  { id: 'log_seed_p1', itemId: 'mp-010', itemNome: 'Ovos (bandeja 30un)', tipo: 'perda' as const, quantidade: 1, data: iso('2026-05-29'), origem: 'Seed', motivo: 'Ovos quebrados' },
  { id: 'log_seed_p2', itemId: 'mp-012', itemNome: 'Amido de Milho 500g', tipo: 'perda' as const, quantidade: 1, data: iso('2026-05-30'), origem: 'Seed', motivo: 'Produto vencido' },
  { id: 'log_seed_p3', itemId: 'mp-003', itemNome: 'Chocolate em Pó 200g', tipo: 'perda' as const, quantidade: 1, data: iso('2026-06-01'), origem: 'Seed', motivo: 'Embalagem rasgada' },

  // ── Produção ──
  { id: 'log_seed_pr1', itemId: 'sor-001', itemNome: 'Sorvete Creme 2L', tipo: 'producao' as const, quantidade: 2, data: iso('2026-05-31'), origem: 'Produção' },
]

const DESPESAS = [
  { id: 'desp_seed_1', tipo: 'aluguel' as const, valor: 1500, descricao: 'Aluguel do ponto comercial', data: '2026-05-05' },
  { id: 'desp_seed_2', tipo: 'energia' as const, valor: 420, descricao: 'Conta de luz maio', data: '2026-05-10' },
  { id: 'desp_seed_3', tipo: 'agua' as const, valor: 180, descricao: 'Conta de água maio', data: '2026-05-12' },
  { id: 'desp_seed_4', tipo: 'internet' as const, valor: 120, descricao: 'Internet maio', data: '2026-05-15' },
  { id: 'desp_seed_5', tipo: 'salario' as const, valor: 1800, descricao: 'Salário funcionário maio', data: '2026-05-20' },
  { id: 'desp_seed_6', tipo: 'imposto' as const, valor: 380, descricao: 'ISS/Simples Nacional', data: '2026-05-22' },
  { id: 'desp_seed_7', tipo: 'manutencao' as const, valor: 200, descricao: 'Conserto freezers', data: '2026-05-18' },
  { id: 'desp_seed_8', tipo: 'outros' as const, valor: 85, descricao: 'Material de limpeza', data: '2026-05-25' },
  // Junho
  { id: 'desp_seed_9', tipo: 'aluguel' as const, valor: 1500, descricao: 'Aluguel do ponto comercial', data: '2026-06-05' },
  { id: 'desp_seed_10', tipo: 'energia' as const, valor: 380, descricao: 'Conta de luz junho', data: '2026-06-08' },
  { id: 'desp_seed_11', tipo: 'agua' as const, valor: 160, descricao: 'Conta de água junho', data: '2026-06-09' },
  { id: 'desp_seed_12', tipo: 'internet' as const, valor: 120, descricao: 'Internet junho', data: '2026-06-10' },
  { id: 'desp_seed_13', tipo: 'salario' as const, valor: 1800, descricao: 'Salário funcionário junho', data: '2026-06-10' },
  { id: 'desp_seed_14', tipo: 'perda' as const, valor: 35, descricao: 'Produtos vencidos descartados', data: '2026-06-01' },
]

export function carregarDadosExemplo() {
  const pricesKey = 'estoque_precos'
  const logsKey = 'estoque_movimentacoes'
  const despesasKey = 'estoque_despesas'

  const existingPrices = JSON.parse(localStorage.getItem(pricesKey) || '[]')
  const existingLogs = JSON.parse(localStorage.getItem(logsKey) || '[]')
  const existingDespesas = JSON.parse(localStorage.getItem(despesasKey) || '[]')

  if (existingPrices.length > 0 && existingLogs.length > 0 && existingDespesas.length > 0) {
    const mergedPrices = existingPrices
    for (const p of PRECOS) {
      if (!mergedPrices.find((x: any) => x.itemId === p.itemId)) mergedPrices.push({ ...p, dataAtualizacao: '2026-05-30' })
    }
    localStorage.setItem(pricesKey, JSON.stringify(mergedPrices))
    localStorage.setItem(logsKey, JSON.stringify([...MOVIMENTACOES, ...existingLogs]))
    localStorage.setItem(despesasKey, JSON.stringify([...DESPESAS, ...existingDespesas]))
  } else {
    localStorage.setItem(pricesKey, JSON.stringify(PRECOS.map(p => ({ ...p, dataAtualizacao: '2026-05-30' }))))
    localStorage.setItem(logsKey, JSON.stringify(MOVIMENTACOES))
    localStorage.setItem(despesasKey, JSON.stringify(DESPESAS))
  }

  window.location.reload()
}
