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

export interface CustomItemInput {
  id: string;
  nome: string;
  categoria: CategoriaSlug;
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: UnidadeMedida;
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

export const CATEGORIAS: { slug: CategoriaSlug; nome: string; icone: string; cor: string }[] = [
  { slug: 'acai', nome: 'Açaí', icone: '🟣', cor: '#7B2D8E' },
  { slug: 'sorvetes', nome: 'Sorvetes', icone: '🟠', cor: '#E07B39' },
  { slug: 'materias_primas', nome: 'Matérias-Primas', icone: '🔵', cor: '#2E86AB' },
];

export const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: 'L', label: 'Litros (L)' },
  { value: 'mL', label: 'Mililitros (mL)' },
  { value: 'g', label: 'Gramas (g)' },
  { value: 'kg', label: 'Quilos (kg)' },
  { value: 'un', label: 'Unidades (un)' },
  { value: 'cx', label: 'Caixas (cx)' },
  { value: 'pct', label: 'Pacotes (pct)' },
  { value: 'fardo', label: 'Fardos (fardo)' },
];
