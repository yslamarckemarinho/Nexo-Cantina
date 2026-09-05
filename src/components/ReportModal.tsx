import React, { useState, useMemo } from 'react';
import { BackupSnapshot, CantinaTenant } from '../types';
import { 
  exportSnapshotSpreadsheet, 
  printSnapshotReport, 
  getTriggerLabel, 
  formatCurrencyBR 
} from '../utils/exportHelpers';
import { 
  X, 
  Printer, 
  FileSpreadsheet, 
  Building2, 
  Calendar, 
  DollarSign, 
  Users, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Receipt,
  FileText
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot?: BackupSnapshot | null;
  cantinaFallback?: CantinaTenant | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  cantinaFallback
}) => {
  const [activeTab, setActiveTab] = useState<'resumo' | 'produtos' | 'vendas' | 'fiados'>('resumo');

  const targetData: CantinaTenant | null = useMemo(() => {
    if (snapshot?.data) return snapshot.data;
    if (cantinaFallback) return cantinaFallback;
    return null;
  }, [snapshot, cantinaFallback]);

  const triggerLabel = useMemo(() => {
    return getTriggerLabel(snapshot?.trigger);
  }, [snapshot]);

  const dateStr = snapshot?.formattedDate || new Date().toLocaleDateString('pt-BR');
  const timeStr = snapshot?.formattedTime || new Date().toLocaleTimeString('pt-BR');

  // Métricas calculadas
  const metrics = useMemo(() => {
    if (!targetData) return null;

    const totalSales = (targetData.sales || []).reduce((acc, s) => acc + s.totalAmount, 0);
    const totalCost = (targetData.sales || []).reduce((acc, s) => acc + (s.totalCost || 0), 0);
    const totalLucro = totalSales - totalCost;

    let totalDinheiro = 0;
    let totalPix = 0;
    let totalCartao = 0;
    let totalFiado = 0;

    (targetData.sales || []).forEach(s => {
      const method = s.paymentMethod as string;
      if (method === 'dinheiro') totalDinheiro += s.totalAmount;
      else if (method === 'pix') totalPix += s.totalAmount;
      else if (method === 'cartao' || method === 'debito' || method === 'credito') totalCartao += s.totalAmount;
      else if (method === 'fiado' || method === 'a_prazo') totalFiado += s.totalAmount;
    });

    const totalPendingFiado = (targetData.customers || []).reduce((acc, c) => {
      return acc + (c.items || []).filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0);
    }, 0);

    const customersWithDebt = (targetData.customers || []).filter(c => {
      return (c.items || []).some(i => !i.paid);
    });

    return {
      totalSales,
      totalCost,
      totalLucro,
      totalDinheiro,
      totalPix,
      totalCartao,
      totalFiado,
      totalPendingFiado,
      customersWithDebt
    };
  }, [targetData]);

  if (!isOpen || !targetData || !metrics) return null;

  const handlePrint = () => {
    if (snapshot) {
      printSnapshotReport(snapshot);
    } else {
      printSnapshotReport({
        data: targetData,
        trigger: 'manual',
        formattedDate: dateStr,
        formattedTime: timeStr
      });
    }
  };

  const handleExportSpreadsheet = () => {
    if (snapshot) {
      exportSnapshotSpreadsheet(snapshot);
    } else {
      exportSnapshotSpreadsheet({
        data: targetData,
        trigger: 'manual',
        formattedDate: dateStr,
        formattedTime: timeStr
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Relatório do Turno & Fechamento
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    snapshot?.trigger === 'turno_11h'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : snapshot?.trigger === 'turno_17h'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : snapshot?.trigger === 'fechamento_caixa'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {triggerLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                  <span className="font-semibold text-slate-200">{targetData.name}</span>
                  {targetData.schoolName && <span>• {targetData.schoolName}</span>}
                  <span>• {dateStr} às {timeStr}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSpreadsheet}
              className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Baixar Planilha formatada para Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Planilha Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-800 flex-shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('resumo')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'resumo' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Resumo Financeiro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('produtos')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'produtos' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Estoque & Produtos ({(targetData.products || []).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendas')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'vendas' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Registro de Vendas ({(targetData.sales || []).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fiados')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'fiados' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Fiados Pendentes ({metrics.customersWithDebt.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {activeTab === 'resumo' && (
            <div className="space-y-4">
              {/* Cards Grid 1 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Total Faturado</span>
                  <div className="text-lg font-black text-white mt-1">
                    R$ {formatCurrencyBR(metrics.totalSales)}
                  </div>
                  <span className="text-[10px] text-emerald-300/80">{(targetData.sales || []).length} vendas registradas</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Dinheiro em Caixa</span>
                  <div className="text-lg font-black text-slate-200 mt-1">
                    R$ {formatCurrencyBR(metrics.totalDinheiro)}
                  </div>
                  <span className="text-[10px] text-slate-500">Valor em espécie</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">PIX Recebido</span>
                  <div className="text-lg font-black text-slate-200 mt-1">
                    R$ {formatCurrencyBR(metrics.totalPix)}
                  </div>
                  <span className="text-[10px] text-slate-500">Direto na conta</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Cartão (Déb/Créd)</span>
                  <div className="text-lg font-black text-slate-200 mt-1">
                    R$ {formatCurrencyBR(metrics.totalCartao)}
                  </div>
                  <span className="text-[10px] text-slate-500">Maquininha</span>
                </div>
              </div>

              {/* Cards Grid 2 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Fiados no Turno</span>
                  <div className="text-base font-black text-amber-300 mt-1">
                    R$ {formatCurrencyBR(metrics.totalFiado)}
                  </div>
                  <span className="text-[10px] text-slate-500">Anotado a prazo</span>
                </div>

                <div className="bg-slate-950 border border-rose-900/40 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-rose-400">Total Fiado Pendente</span>
                  <div className="text-base font-black text-rose-300 mt-1">
                    R$ {formatCurrencyBR(metrics.totalPendingFiado)}
                  </div>
                  <span className="text-[10px] text-rose-400/80">{metrics.customersWithDebt.length} alunos com débito</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Estoque Cadastrado</span>
                  <div className="text-base font-black text-slate-200 mt-1">
                    {(targetData.products || []).length} produtos
                  </div>
                  <span className="text-[10px] text-slate-500">Itens em catálogo</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Lucro Estimado</span>
                  <div className="text-base font-black text-emerald-400 mt-1">
                    R$ {formatCurrencyBR(metrics.totalLucro)}
                  </div>
                  <span className="text-[10px] text-slate-500">Margem operacional</span>
                </div>
              </div>

              {/* Informação Operacional */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white">Operador do Caixa:</span> {targetData.operatorName || 'Operador'}
                </div>
                <div>
                  <span className="font-bold text-white">Status do Turno:</span> {targetData.shifts && targetData.shifts.length > 0 ? (targetData.shifts[targetData.shifts.length - 1].isOpen ? 'Caixa Aberto' : 'Caixa Encerrado') : 'Hoje'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'produtos' && (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-2">Código</th>
                      <th className="p-2">Produto</th>
                      <th className="p-2">Categoria</th>
                      <th className="p-2 text-right">Preço</th>
                      <th className="p-2 text-right">Estoque</th>
                      <th className="p-2 text-right">Vendidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(targetData.products || []).map(p => (
                      <tr key={p.id} className="hover:bg-slate-950/50">
                        <td className="p-2 text-slate-500 font-mono">{p.code || '-'}</td>
                        <td className="p-2 font-bold text-white">{p.name}</td>
                        <td className="p-2 text-slate-400">{p.category}</td>
                        <td className="p-2 text-right text-emerald-400 font-mono-num">
                          R$ {formatCurrencyBR(p.salePrice)}
                        </td>
                        <td className="p-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            p.stock <= 0 ? 'bg-rose-950 text-rose-300' : 'text-slate-300'
                          }`}>
                            {p.stock} un
                          </span>
                        </td>
                        <td className="p-2 text-right text-slate-300">{p.totalSold || 0} un</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'vendas' && (
            <div className="space-y-2">
              {(targetData.sales || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Nenhuma venda registrada neste ponto de dados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-2">Comprovante</th>
                        <th className="p-2">Hora</th>
                        <th className="p-2">Pagamento</th>
                        <th className="p-2">Cliente</th>
                        <th className="p-2">Itens</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(targetData.sales || []).map(s => (
                        <tr key={s.id} className="hover:bg-slate-950/50">
                          <td className="p-2 text-slate-400 font-mono font-bold">{s.receiptNumber}</td>
                          <td className="p-2 text-slate-400">{s.formattedTime}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase text-[10px]">
                              {s.paymentMethod}
                            </span>
                          </td>
                          <td className="p-2 text-white font-medium">{s.customerName || 'Balcão'}</td>
                          <td className="p-2 text-slate-400 truncate max-w-xs">
                            {(s.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-400 font-mono-num">
                            R$ {formatCurrencyBR(s.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fiados' && (
            <div className="space-y-2">
              {metrics.customersWithDebt.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-400 border border-dashed border-emerald-900/60 rounded-xl">
                  Parabéns! Todos os alunos e clientes estão em dia com a cantina.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-2">Aluno / Cliente</th>
                        <th className="p-2">Turma</th>
                        <th className="p-2">Telefone</th>
                        <th className="p-2 text-right">Total Devido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {metrics.customersWithDebt.map(c => {
                        const debt = (c.items || []).filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0);
                        return (
                          <tr key={c.id} className="hover:bg-slate-950/50">
                            <td className="p-2 font-bold text-white">{c.name}</td>
                            <td className="p-2 text-slate-400">{c.className || '-'}</td>
                            <td className="p-2 text-slate-400">{c.phone || '-'}</td>
                            <td className="p-2 text-right font-black text-rose-400 font-mono-num">
                              R$ {formatCurrencyBR(debt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <span className="text-[11px] text-slate-500">
            Documento pronto para exportação para Excel ou Impressão em A4/PDF.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleExportSpreadsheet}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar Planilha (.CSV)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
