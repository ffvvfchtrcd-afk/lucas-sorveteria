export type UnidadeMedida = 'L' | 'mL' | 'g' | 'kg' | 'un' | 'cx' | 'pct' | 'fardo';
export type AlertaNivel = 'ok' | 'baixo' | 'critico';
export type CategoriaSlug = 'acai' | 'sorvetes' | 'materias_primas';

export interface ItemEstoque {
  id: string;
  nome: string;
  categoria: CategoriaSlug;
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: UnidadeMedida;
  alerta: AlertaNivel;
  ultimaAtualizacao: string;
}

export interface LimitesItem {
  minimo: number;
  critico: number;
}

export interface EstoqueData {
  acai: ItemEstoque[];
  sorvetes: ItemEstoque[];
  materias_primas: ItemEstoque[];
}

export interface ResumoCategoria {
  nome: string;
  slug: string;
  totalItens: number;
  itensOk: number;
  itensBaixo: number;
  itensCritico: number;
  cor: string;
  icone: string;
}
