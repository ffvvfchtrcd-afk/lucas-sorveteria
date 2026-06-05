import { useState, useEffect, useRef } from 'react'
import { useStock } from '../context/StockContext'
import { useConfig } from '../context/ConfigContext'
import { CategoriaSlug, LimitesItem, ItemEstoque } from '../types'
import { carregarDadosExemplo } from '../utils/seed'
import { exportarBackup, importarBackup, downloadBackup } from '../services/backup'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'

type FiltroCategoria = CategoriaSlug | 'todas';

const categorias: { slug: FiltroCategoria; nome: string }[] = [
  { slug: 'todas', nome: 'Todas' },
  { slug: 'acai', nome: 'Açaí' },
  { slug: 'sorvetes', nome: 'Sorvetes' },
  { slug: 'materias_primas', nome: 'Matérias-Primas' },
];

interface ItemFormState {
  id: string;
  nome: string;
  categoria: string;
  quantidadeAtual: number;
  minimo: number;
  critico: number;
  unidade: string;
}

function LinhaItem({
  item,
  onSalvar,
  onResetar,
}: {
  item: ItemFormState;
  onSalvar: (id: string, limites: LimitesItem) => void;
  onResetar: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [minimo, setMinimo] = useState(item.minimo);
  const [critico, setCritico] = useState(item.critico);

  useEffect(() => {
    setMinimo(item.minimo);
    setCritico(item.critico);
  }, [item.minimo, item.critico]);

  function salvar() {
    onSalvar(item.id, { minimo, critico });
    setEditando(false);
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-800 dark:text-gray-200">{item.nome}</td>
      <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-gray-500">{item.quantidadeAtual} {item.unidade}</td>
      <td className="px-2 md:px-4 py-2 md:py-3">
        {editando ? (
          <div className="flex items-center gap-1 md:gap-2">
            <input
              type="number"
              value={minimo}
              onChange={e => setMinimo(Number(e.target.value))}
              className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        ) : (
          <span className={`text-xs md:text-sm font-medium ${item.quantidadeAtual <= item.critico ? 'text-red-600 dark:text-red-400' : item.quantidadeAtual <= item.minimo ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {item.minimo}
          </span>
        )}
      </td>
      <td className="px-2 md:px-4 py-2 md:py-3">
        {editando ? (
          <div className="flex items-center gap-1 md:gap-2">
            <input
              type="number"
              value={critico}
              onChange={e => setCritico(Number(e.target.value))}
              className="w-16 md:w-20 px-1 md:px-2 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        ) : (
          <span className={`text-xs md:text-sm font-medium ${item.quantidadeAtual <= item.critico ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {item.critico}
          </span>
        )}
      </td>
      <td className="px-2 md:px-4 py-2 md:py-3">
        {editando ? (
          <div className="flex items-center gap-1">
            <button onClick={salvar} className="px-2 md:px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">✓</button>
            <button onClick={() => setEditando(false)} className="px-2 md:px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => setEditando(true)} className="px-2 md:px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 rounded-md hover:bg-indigo-100">Editar</button>
            <button onClick={() => { onResetar(item.id); setEditando(false); }} className="px-2 md:px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">↺</button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function ConfiguracoesPage() {
  const { getLimites, salvarLimite, resetarLimite, salvarLimitesMultiplos } = useConfig();
  const { data: stockData, version: stockVersion } = useStock();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<ItemFormState[]>([]);
  const [filtro, setFiltro] = useState<FiltroCategoria>('todas');
  const [salvo, setSalvo] = useState(false);

  function handleExportar() {
    const res = exportarBackup(user?.username);
    if (res.ok && res.json && res.filename) {
      downloadBackup(res.json, res.filename);
      toast.sucesso('Backup gerado!', `${res.keysIncluded} chaves exportadas (${(res.size ?? 0 / 1024).toFixed(1)} KB)`);
    } else {
      toast.erro('Falha ao gerar backup', res.error);
    }
  }

  async function handleImportar(file: File) {
    const ok = await confirm({
      title: 'Restaurar backup?',
      message: `Isto vai SOBRESCREVER todos os dados atuais com o conteúdo de "${file.name}". Deseja continuar?`,
      confirmText: 'Restaurar',
      variant: 'danger',
      icon: '⚠️',
    });
    if (!ok) return;
    const text = await file.text();
    const res = importarBackup(text);
    if (res.ok) {
      toast.sucesso('Backup restaurado!', `${res.keysImported} chaves importadas. Recarregando…`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast.erro('Falha ao restaurar', res.error);
    }
  }

  useEffect(() => {
    const todos = [...(stockData.acai || []), ...(stockData.sorvetes || []), ...(stockData.materias_primas || []), ...(stockData.personalizados || [])];
    const formatados: ItemFormState[] = todos.map(item => {
      const limites = getLimites(item.id, { minimo: item.quantidadeMinima });
      return {
        id: item.id,
        nome: item.nome,
        categoria: item.categoria,
        quantidadeAtual: item.quantidadeAtual,
        minimo: limites.minimo,
        critico: limites.critico,
        unidade: item.unidade,
      };
    });
    setItens(formatados);
  }, [getLimites, stockVersion, stockData]);

  function handleSalvar(id: string, limites: LimitesItem) {
    salvarLimite(id, limites);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  function handleResetar(id: string) {
    resetarLimite(id);
    setItens(prev => prev.map(i => {
      if (i.id !== id) return i;
      const itemOriginal = [...stockData.acai, ...stockData.sorvetes, ...stockData.materias_primas].find(x => x.id === id);
      const minimoPadrao = itemOriginal?.quantidadeMinima ?? i.minimo;
      return { ...i, minimo: minimoPadrao, critico: Math.max(1, Math.round(minimoPadrao * 0.4)) };
    }));
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  function aplicarTodas() {
    const updates = itens.map(i => ({
      id: i.id,
      limites: { minimo: i.minimo, critico: i.critico } as LimitesItem,
    }));
    salvarLimitesMultiplos(updates);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  const filtrados = filtro === 'todas' ? itens : itens.filter(i => i.categoria === filtro);
  const linhasEditadas = itens.filter(i => i.critico >= i.minimo);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">⚙️ Limites de Estoque</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Defina os limites de cada item: o <strong>mínimo</strong> (alerta amarelo — "está acabando") e o <strong>crítico</strong> (alerta vermelho — "precisa comprar URGENTE"). Os alertas aparecem no Dashboard e na lista de compras sugerida.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {salvo && (
            <span className="text-sm text-green-600 font-medium animate-pulse">✓ Salvo!</span>
          )}
          <button
            onClick={aplicarTodas}
            className="px-3 md:px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Salvar Todas
          </button>
        </div>
      </div>

      {linhasEditadas.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="font-medium">{linhasEditadas.length} item(ns) com limite crítico maior ou igual ao mínimo.</p>
            <p className="text-xs mt-0.5">O valor <strong>crítico</strong> deve ser menor que o <strong>mínimo</strong> para o alerta funcionar corretamente. Ex: mínimo=10, crítico=4.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
        {categorias.map(cat => (
          <button
            key={cat.slug}
            onClick={() => setFiltro(cat.slug)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filtro === cat.slug
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-2 md:px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs md:text-sm">Item</th>
                <th className="text-left px-2 md:px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs md:text-sm">Atual</th>
                <th className="text-left px-2 md:px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                  <span className="hidden md:inline">Mínimo </span><span className="text-yellow-500">(baixo)</span>
                </th>
                <th className="text-left px-2 md:px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                  <span className="hidden md:inline">Crítico </span><span className="text-red-500">(repor)</span>
                </th>
                <th className="text-left px-2 md:px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs md:text-sm">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(item => (
                <LinhaItem
                  key={item.id}
                  item={item}
                  onSalvar={handleSalvar}
                  onResetar={handleResetar}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && (
          <div className="text-center py-12 text-gray-400">Nenhum item encontrado</div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">ℹ️ Como funciona</h3>
        <p className="text-sm text-blue-700 dark:text-blue-200">
          <strong>Mínimo:</strong> quando o estoque atual chegar neste valor, o item fica <span className="text-yellow-600">amarelo (baixo)</span>.<br />
          <strong>Crítico:</strong> quando o estoque atual chegar neste valor, o item fica <span className="text-red-600">vermelho (crítico)</span> e precisa ser reposto com urgência.<br />
          Os valores salvos ficam armazenados no navegador (localStorage).
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">📦 Dados de Exemplo</h3>
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          Clique abaixo para preencher preços, vendas, despesas e perdas fictícias — assim você vê o sistema funcionando completo. Seus dados atuais não serão perdidos.
        </p>
        <button onClick={carregarDadosExemplo}
          className="px-4 py-2.5 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 active:bg-amber-800 transition-colors">
          🔄 Carregar Dados de Exemplo
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">💾 Backup & Restore</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
          Exporte todos os dados (estoque, vendas, preços, despesas, lotes, usuários, etc.) em um arquivo JSON.
          Guarde em local seguro — pode restaurar depois ou migrar para outro navegador.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportar}
            className="px-4 py-2.5 text-sm font-bold text-white bg-slate-700 dark:bg-slate-600 rounded-xl hover:bg-slate-800 active:bg-slate-900 transition-colors"
            aria-label="Baixar arquivo de backup">
            ⬇️ Baixar backup
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 transition-colors"
            aria-label="Selecionar arquivo de backup para restaurar">
            ⬆️ Restaurar de arquivo…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImportar(f)
              e.target.value = ''
            }}
          />
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-3">
          ⚠️ Restaurar <strong>sobrescreve</strong> todos os dados atuais. Faça um backup antes se quiser manter o estado atual.
        </p>
      </div>
    </div>
  )
}
