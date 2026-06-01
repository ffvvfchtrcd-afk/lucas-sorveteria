import { ItemEstoque, ResumoCategoria, EstoqueData, LimitesItem, AlertaNivel } from '../types';
import acaiData from '../data/acai.json';
import sorvetesData from '../data/sorvetes.json';
import materiasPrimasData from '../data/materias_primas.json';

export function carregarDados(): EstoqueData {
  return {
    acai: (acaiData as ItemEstoque[]).map(i => ({ ...i, alerta: 'ok' })),
    sorvetes: (sorvetesData as ItemEstoque[]).map(i => ({ ...i, alerta: 'ok' })),
    materias_primas: (materiasPrimasData as ItemEstoque[]).map(i => ({ ...i, alerta: 'ok' })),
  };
}

export function calcularAlerta(quantidadeAtual: number, limites: LimitesItem): AlertaNivel {
  if (quantidadeAtual <= limites.critico) return 'critico';
  if (quantidadeAtual <= limites.minimo) return 'baixo';
  return 'ok';
}

export function aplicarLimites(itens: ItemEstoque[], getLimites: (id: string, defaults: { minimo: number }) => LimitesItem): ItemEstoque[] {
  return itens.map(item => ({
    ...item,
    alerta: calcularAlerta(item.quantidadeAtual, getLimites(item.id, { minimo: item.quantidadeMinima })),
  }))
}

export function calcularResumo(itens: ItemEstoque[]): { ok: number; baixo: number; critico: number } {
  return {
    ok: itens.filter(i => i.alerta === 'ok').length,
    baixo: itens.filter(i => i.alerta === 'baixo').length,
    critico: itens.filter(i => i.alerta === 'critico').length,
  };
}

export function getResumoCategorias(data: EstoqueData): ResumoCategoria[] {
  const categorias: { nome: string; slug: string; itens: ItemEstoque[]; cor: string; icone: string }[] = [
    { nome: 'Açaí', slug: 'acai', itens: data.acai, cor: '#7B2D8E', icone: '🟣' },
    { nome: 'Sorvetes', slug: 'sorvetes', itens: data.sorvetes, cor: '#E07B39', icone: '🟠' },
    { nome: 'Matérias-Primas', slug: 'materias_primas', itens: data.materias_primas, cor: '#2E86AB', icone: '🔵' },
  ];

  return categorias.map(cat => {
    const resumo = calcularResumo(cat.itens);
    return {
      nome: cat.nome,
      slug: cat.slug,
      totalItens: cat.itens.length,
      itensOk: resumo.ok,
      itensBaixo: resumo.baixo,
      itensCritico: resumo.critico,
      cor: cat.cor,
      icone: cat.icone,
    };
  });
}

export function getItensCriticos(data: EstoqueData): ItemEstoque[] {
  return [
    ...data.acai.filter(i => i.alerta === 'critico'),
    ...data.sorvetes.filter(i => i.alerta === 'critico'),
    ...data.materias_primas.filter(i => i.alerta === 'critico'),
  ];
}

export function getItensBaixo(data: EstoqueData): ItemEstoque[] {
  return [
    ...data.acai.filter(i => i.alerta === 'baixo'),
    ...data.sorvetes.filter(i => i.alerta === 'baixo'),
    ...data.materias_primas.filter(i => i.alerta === 'baixo'),
  ];
}

export function getTotalGeral(data: EstoqueData): { total: number; ok: number; baixo: number; critico: number } {
  const todos = [...data.acai, ...data.sorvetes, ...data.materias_primas];
  return {
    total: todos.length,
    ok: todos.filter(i => i.alerta === 'ok').length,
    baixo: todos.filter(i => i.alerta === 'baixo').length,
    critico: todos.filter(i => i.alerta === 'critico').length,
  };
}

export function formatarUnidade(valor: number, unidade: string): string {
  return `${valor} ${unidade}`;
}
