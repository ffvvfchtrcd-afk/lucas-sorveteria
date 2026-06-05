export type UnidadeMedida = 'L' | 'mL' | 'g' | 'kg' | 'un' | 'cx' | 'pct' | 'fardo';
export type AlertaNivel = 'ok' | 'baixo' | 'critico';
export type CategoriaSlug = 'acai' | 'sorvetes' | 'materias_primas';
export type TipoMovimentacao = 'entrada' | 'saida' | 'venda' | 'producao' | 'perda' | 'ajuste';
export type TipoItem = 'venda' | 'producao' | 'ambos';

export const PAPEIS = {
  admin: { value: 'admin', label: 'Administrador', short: 'Admin', icon: '🔑' },
  funcionario: { value: 'funcionario', label: 'Funcionário', short: 'Func.', icon: '👤' },
} as const

export type Papel = keyof typeof PAPEIS

export const getPapelLabel = (papel: Papel): string => PAPEIS[papel]?.label ?? papel
export const getPapelIcon = (papel: Papel): string => PAPEIS[papel]?.icon ?? '👤'

export interface GestaoItem {
  permiteEntrada: boolean;
  permiteSaida: boolean;
  permiteVenda: boolean;
  permiteProducao: boolean;
  receitaId?: string;
}

export const GESTAO_PADRAO: GestaoItem = {
  permiteEntrada: true,
  permiteSaida: true,
  permiteVenda: true,
  permiteProducao: true,
};

export function gestaoFromTipo(tipo?: TipoItem): GestaoItem {
  if (tipo === 'venda') return { permiteEntrada: true, permiteSaida: true, permiteVenda: true, permiteProducao: false };
  if (tipo === 'producao') return { permiteEntrada: true, permiteSaida: true, permiteVenda: false, permiteProducao: true };
  return { ...GESTAO_PADRAO };
}

export interface ItemEstoque {
  id: string;
  nome: string;
  categoria: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: UnidadeMedida;
  alerta: AlertaNivel;
  ultimaAtualizacao: string;
  tipo?: TipoItem;
  gestao?: GestaoItem;
}

export interface CustomItemInput {
  id: string;
  nome: string;
  categoria: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: UnidadeMedida;
  tipo?: TipoItem;
  gestao?: GestaoItem;
}

export interface LimitesItem {
  minimo: number;
  critico: number;
}

export interface LogMovimentacao {
  id?: string;
  tipo: TipoMovimentacao;
  itemId: string;
  itemNome?: string;
  quantidade: number;
  data: string;
  origem?: string;
  motivo?: string;
  usuario?: string;
}

export interface EstoqueData {
  acai: ItemEstoque[];
  sorvetes: ItemEstoque[];
  materias_primas: ItemEstoque[];
  personalizados: ItemEstoque[];
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

export interface Movimentacao {
  id: string;
  itemId: string;
  itemNome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  data: string;
  motivo?: string;
  origem?: string;
  usuario?: string;
}

export interface PrecoItem {
  itemId: string;
  itemNome: string;
  precoCusto: number;
  precoVenda: number;
  dataAtualizacao: string;
  custoAuto?: boolean;
}

export interface LoteValidade {
  id: string;
  itemId: string;
  itemNome: string;
  quantidade: number;
  dataValidade: string;
  dataEntrada: string;
  observacao?: string;
  unidade?: UnidadeMedida;
}

export interface VendaItem {
  itemId: string;
  itemNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Venda {
  id: string;
  itens: VendaItem[];
  total: number;
  data: string;
}

export interface Receita {
  id: string;
  nome: string;
  produtoId: string;
  itens: { itemId: string; itemNome: string; quantidade: number; unidade: UnidadeMedida }[];
  rendimento: number;
  dataCriacao: string;
}

export interface ProducaoRegistro {
  id: string;
  nome: string;
  ingredientes: { itemId: string; itemNome: string; quantidade: number }[];
  resultados: { itemId: string; itemNome: string; quantidade: number }[];
  data: string;
}

export const CATEGORIAS_BASE: { slug: string; nome: string; icone: string; cor: string }[] = [
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

export type DespesaTipo = 'aluguel' | 'energia' | 'agua' | 'internet' | 'perda' | 'manutencao' | 'salario' | 'imposto' | 'outros';

export interface Despesa {
  id: string;
  tipo: DespesaTipo;
  valor: number;
  descricao: string;
  data: string;
  observacao?: string;
}

export const DESPESA_TIPOS: { value: DespesaTipo; label: string; icone: string }[] = [
  { value: 'aluguel', label: 'Aluguel', icone: '🏠' },
  { value: 'energia', label: 'Conta de Luz', icone: '⚡' },
  { value: 'agua', label: 'Conta de Água', icone: '💧' },
  { value: 'internet', label: 'Internet', icone: '🌐' },
  { value: 'salario', label: 'Salário/Funcionários', icone: '👥' },
  { value: 'manutencao', label: 'Manutenção', icone: '🔧' },
  { value: 'imposto', label: 'Impostos/Taxas', icone: '📄' },
  { value: 'perda', label: 'Perda de Produtos', icone: '🗑️' },
  { value: 'outros', label: 'Outros', icone: '📌' },
];

export function getIconeCategoria(slug: string): string {
  const found = CATEGORIAS_BASE.find(c => c.slug === slug)
  return found ? found.icone : '📂'
}
