import React, { useState, useMemo } from 'react';
import { useCantina } from '../context/CantinaContext';
import { Sale, PaymentMethod, CashMovement } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { 
  Wallet, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  ArrowDownRight, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  FileSpreadsheet, 
  Printer, 
  Sparkles, 
  Receipt, 
  Zap, 
  Banknote, 
  CreditCard, 
  FileText,
  Search,
  Bot
} from 'lucide-react';

export const CashFlowReports: React.FC = () => {
  const { 
    activeCantina, 
    openCashShift, 
    closeCurrentShift, 
    addCashMovement, 
    exportSalesCSV, 
    operatorName 
  } = useCantina();

  if (!activeCantina) return null;

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [reprintSale, setReprintSale] = useState<Sale | null>(null);

  // Cash movement modal
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDesc, setMovementDesc] = useState('');

  // Shift opening modal
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [initialTroco, setInitialTroco] = useState('50.00');

  const currentShift = activeCantina.shifts.length > 0 ? activeCantina.shifts[0] : null;
  const isShiftOpen = currentShift?.isOpen ?? false;

  // Filter sales for selected date
  const filteredSales = useMemo(() => {
    return activeCantina.sales.filter(s => {
      const saleDate = s.timestamp.split('T')[0];
      const matchDate = saleDate === selectedDate || selectedDate === 'todas';
      const matchSearch = salesSearchTerm === '' ||
        s.receiptNumber.toLowerCase().includes(salesSearchTerm.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(salesSearchTerm.toLowerCase())) ||
        s.items.some(i => i.name.toLowerCase().includes(salesSearchTerm.toLowerCase()));

      return matchDate && matchSearch;
    });
  }, [activeCantina.sales, selectedDate, salesSearchTerm]);

  // Aggregate Metrics for Selected Day
  const totalSalesDay = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [filteredSales]);

  const totalCostDay = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  }, [filteredSales]);

  const totalProfitDay = useMemo(() => {
    return totalSalesDay - totalCostDay;
  }, [totalSalesDay, totalCostDay]);

  const profitMarginPercent = useMemo(() => {
    if (totalSalesDay === 0) return 0;
    return (totalProfitDay / totalSalesDay) * 100;
  }, [totalProfitDay, totalSalesDay]);

  // Breakdown by payment method
  const methodTotals = useMemo(() => {
    const totals: Record<string, number> = {
      pix: 0,
      dinheiro: 0,
      cartao: 0,
      a_prazo: 0,
      fiado: 0
    };

    filteredSales.forEach(s => {
      const key = s.paymentMethod === 'fiado' ? 'a_prazo' : s.paymentMethod;
      totals[key] = (totals[key] || 0) + s.totalAmount;
    });

    return totals;
  }, [filteredSales]);

  // Cash shift movements (Sangrias, suprimentos, quitações)
  const shiftMovements = currentShift?.movements || [];

  const totalCashInflow = useMemo(() => {
    return shiftMovements
      .filter(m => m.type === 'entrada' || m.type === 'suprimento' || m.type === 'quitacao_fiado' || m.type === 'quitacao_prazo')
      .reduce((acc, m) => acc + m.amount, 0);
  }, [shiftMovements]);

  const totalCashOutflow = useMemo(() => {
    return shiftMovements
      .filter(m => m.type === 'saida' || m.type === 'sangria')
      .reduce((acc, m) => acc + m.amount, 0);
  }, [shiftMovements]);

  const expectedDrawerCash = useMemo(() => {
    const opening = currentShift?.openingBalance || 0;
    const cashSales = methodTotals.dinheiro || 0;
    const debtSettlements = shiftMovements
      .filter(m => (m.type === 'quitacao_fiado' || m.type === 'quitacao_prazo') && m.paymentMethod === 'dinheiro')
      .reduce((acc, m) => acc + m.amount, 0);
    const suprimentos = shiftMovements
      .filter(m => m.type === 'suprimento')
      .reduce((acc, m) => acc + m.amount, 0);
    const sangrias = shiftMovements
      .filter(m => m.type === 'sangria' || m.type === 'saida')
      .reduce((acc, m) => acc + m.amount, 0);

    return opening + cashSales + debtSettlements + suprimentos - sangrias;
  }, [currentShift, methodTotals.dinheiro, shiftMovements]);

  // Intelligent Support & Diagnostic Engine (Requested by user in Question 2)
  const diagnosticInsights = useMemo(() => {
    const insights: { type: 'ok' | 'warning' | 'info' | 'success'; title: string; desc: string }[] = [];

    // 1. A Prazo proportion check
    const aPrazoTotal = methodTotals.a_prazo || 0;
    const aPrazoShare = totalSalesDay > 0 ? (aPrazoTotal / totalSalesDay) * 100 : 0;
    if (aPrazoShare > 40) {
      insights.push({
        type: 'warning',
        title: 'Alta concentração de vendas A Prazo',
        desc: `${aPrazoShare.toFixed(1)}% das vendas de hoje foram lançadas a prazo (R$ ${aPrazoTotal.toFixed(2)}). Recomendamos enviar extratos aos responsáveis via WhatsApp.`
      });
    } else if (totalSalesDay > 0) {
      insights.push({
        type: 'success',
        title: 'Saúde de Liquidez Excelente',
        desc: `${(100 - aPrazoShare).toFixed(1)}% das vendas foram liquidadas à vista (PIX, Dinheiro e Cartão).`
      });
    }

    // 2. Profit margin check
    if (profitMarginPercent > 45) {
      insights.push({
        type: 'success',
        title: `Margem de Lucro Sólida (${profitMarginPercent.toFixed(1)}%)`,
        desc: `Lucro bruto estimado de R$ ${totalProfitDay.toFixed(2)} sobre R$ ${totalSalesDay.toFixed(2)} em vendas.`
      });
    }

    // 3. Stock depleted alert
    const zeroStockProducts = activeCantina.products.filter(p => p.stock === 0);
    if (zeroStockProducts.length > 0) {
      insights.push({
        type: 'warning',
        title: `${zeroStockProducts.length} produtos esgotados no estoque`,
        desc: `Os itens (${zeroStockProducts.slice(0, 3).map(p => p.name).join(', ')}) estão zerados e não podem ser vendidos pelo PDV.`
      });
    }

    // 4. Cash drawer check
    if (isShiftOpen) {
      insights.push({
        type: 'info',
        title: 'Caixa do Turno em Operação',
        desc: `Saldo físico esperado na gaveta: R$ ${expectedDrawerCash.toFixed(2)} (Troco Inicial R$ ${currentShift?.openingBalance.toFixed(2)} + Vendas Dinheiro).`
      });
    } else {
      insights.push({
        type: 'info',
        title: 'Caixa Fechado',
        desc: 'Abra um novo turno de caixa para iniciar o controle de troco e movimentações.'
      });
    }

    return insights;
  }, [totalSalesDay, methodTotals, profitMarginPercent, totalProfitDay, activeCantina.products, isShiftOpen, expectedDrawerCash, currentShift]);

  const handleCreateMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(movementAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) return;

    addCashMovement(
      movementType,
      amountNum,
      movementDesc.trim() || (movementType === 'sangria' ? 'Sangria de Caixa' : 'Suprimento de Troco'),
      'dinheiro'
    );

    setMovementAmount('');
    setMovementDesc('');
    setShowMovementModal(false);
  };

  const handleOpenShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const troco = parseFloat(initialTroco.replace(',', '.')) || 0;
    openCashShift(troco);
    setShowOpenShiftModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-5">
      {/* Title & Date Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Fluxo de Caixa & Relatórios de Vendas
            </h2>
            <p className="text-xs text-slate-400">
              Cantina: <span className="text-amber-400 font-semibold">{activeCantina.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate === 'todas' ? '' : selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || 'todas')}
              className="bg-transparent text-white focus:outline-none text-xs font-mono-num"
            />
          </div>

          <button
            onClick={exportSalesCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
            title="Exportar planilha Excel (.CSV)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Top 4 Financial Metrics of the Day */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total de Vendas
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono-num mt-1">
            R$ {totalSalesDay.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {filteredSales.length} transações registradas
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Lucro Bruto Estimado
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-num mt-1">
            R$ {totalProfitDay.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-400/90 font-semibold mt-1">
            Margem de {profitMarginPercent.toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Custo das Mercadorias
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-300 font-mono-num mt-1">
            R$ {totalCostDay.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Baseado no custo de compra
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Ticket Médio por Venda
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono-num mt-1">
            R$ {filteredSales.length > 0 ? (totalSalesDay / filteredSales.length).toFixed(2) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Média por cupom emitido
          </div>
        </div>
      </div>

      {/* Breakdown By Payment Method Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Detalhamento por Meio de Pagamento
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">PIX (À Vista)</span>
                <span className="text-sm font-black text-white font-mono-num">
                  R$ {methodTotals.pix.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Dinheiro</span>
                <span className="text-sm font-black text-white font-mono-num">
                  R$ {methodTotals.dinheiro.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">Cartão</span>
                <span className="text-sm font-black text-white font-mono-num">
                  R$ {methodTotals.cartao.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 block">A Prazo (Na Conta)</span>
                <span className="text-sm font-black text-amber-400 font-mono-num">
                  R$ {(methodTotals.a_prazo || methodTotals.fiado || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Shift / Turno de Caixa & Gaveta */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isShiftOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {isShiftOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-sm sm:text-base">
                  Turno de Caixa
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isShiftOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {isShiftOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Operador: <span className="text-slate-200 font-semibold">{operatorName || 'Operador'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isShiftOpen ? (
              <>
                <button
                  onClick={() => {
                    setMovementType('sangria');
                    setShowMovementModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-900/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Sangria (Retirada)</span>
                </button>

                <button
                  onClick={() => {
                    setMovementType('suprimento');
                    setShowMovementModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-900/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Suprimento (Troco)</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('Deseja realmente fechar o caixa do turno atual?')) {
                      closeCurrentShift();
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Fechar Caixa
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowOpenShiftModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Abrir Novo Caixa</span>
              </button>
            )}
          </div>
        </div>

        {/* Drawer summary numbers */}
        {isShiftOpen && currentShift && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Troco Inicial:</span>
              <span className="text-sm font-bold text-white font-mono-num">
                R$ {currentShift.openingBalance.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Vendas em Dinheiro:</span>
              <span className="text-sm font-bold text-emerald-400 font-mono-num">
                + R$ {methodTotals.dinheiro.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Sangrias / Saídas:</span>
              <span className="text-sm font-bold text-rose-400 font-mono-num">
                - R$ {totalCashOutflow.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/40 ring-1 ring-amber-500/30">
              <span className="text-amber-400 block text-[10px] uppercase font-extrabold">Saldo Físico Esperado:</span>
              <span className="text-base font-black text-amber-400 font-mono-num">
                R$ {expectedDrawerCash.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Intelligent Support & Diagnostic Assistant (Requested in Question 2) */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-800/40 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
              <span>Suporte & Diagnóstico do Caixa</span>
              <span className="px-2 py-0.2 bg-indigo-500/20 text-indigo-300 rounded text-[10px] font-bold">
                Assistente Ativo
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Análise em tempo real para te ajudar a entender a dinâmica do negócio
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {diagnosticInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                insight.type === 'warning'
                  ? 'bg-amber-950/30 border-amber-700/60 text-amber-200'
                  : insight.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {insight.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                {insight.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                {insight.type === 'info' && <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />}
                <span>{insight.title}</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {insight.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Sales History Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Histórico Detalhado de Vendas ({filteredSales.length})
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={salesSearchTerm}
              onChange={(e) => setSalesSearchTerm(e.target.value)}
              placeholder="Buscar por cupom, cliente ou item..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            Nenhuma venda registrada nesta data.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 p-3 border-b border-slate-800 bg-slate-950/60">
              <span className="col-span-2">Data/Hora</span>
              <span className="col-span-2">Cupom / Tipo</span>
              <span className="col-span-3">Cliente</span>
              <span className="col-span-3">Itens</span>
              <span className="col-span-1 text-right">Valor</span>
              <span className="col-span-1 text-right">Recibo</span>
            </div>

            <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto font-mono-num">
              {filteredSales.map(sale => (
                <div key={sale.id} className="grid grid-cols-12 p-3 text-xs items-center hover:bg-slate-800/40 transition">
                  <div className="col-span-2 text-slate-400 text-[11px]">
                    <div>{sale.formattedDate}</div>
                    <div className="text-[10px] text-slate-500">{sale.formattedTime}</div>
                  </div>

                  <div className="col-span-2">
                    <div className="font-bold text-white">#{sale.receiptNumber}</div>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      sale.paymentMethod === 'fiado' || sale.paymentMethod === 'a_prazo'
                        ? 'bg-amber-500/20 text-amber-400' 
                        : sale.paymentMethod === 'pix'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {sale.paymentMethod === 'fiado' || sale.paymentMethod === 'a_prazo' ? 'A Prazo' : sale.paymentMethod}
                    </span>
                  </div>

                  <div className="col-span-3 text-slate-300 font-medium truncate pr-2">
                    {sale.customerName || 'Balcão / Anônimo'}
                  </div>

                  <div className="col-span-3 text-slate-400 text-[11px] truncate pr-2">
                    {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                  </div>

                  <div className="col-span-1 text-right font-bold text-amber-400">
                    R$ {sale.totalAmount.toFixed(2)}
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => setReprintSale(sale)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                      title="Ver e imprimir cupom"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Movement Modal (Sangria / Suprimento) */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">
              {movementType === 'sangria' ? 'Registrar Sangria (Retirada de Dinheiro)' : 'Registrar Suprimento (Adicionar Troco)'}
            </h3>

            <form onSubmit={handleCreateMovementSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Valor (R$):</label>
                <input
                  type="text"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Motivo / Descrição:</label>
                <input
                  type="text"
                  value={movementDesc}
                  onChange={(e) => setMovementDesc(e.target.value)}
                  placeholder={movementType === 'sangria' ? 'Ex: Pagamento Fornecedor de Pães' : 'Ex: Troco de moedas'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-emerald-400" />
              <span>Abertura de Caixa do Turno</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Informe o valor em dinheiro disponível na gaveta para troco inicial.
            </p>

            <form onSubmit={handleOpenShiftSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Troco Inicial (R$):</label>
                <input
                  type="text"
                  value={initialTroco}
                  onChange={(e) => setInitialTroco(e.target.value)}
                  placeholder="Ex: 50.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono-num"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                >
                  Abrir Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Re-print receipt modal */}
      {reprintSale && (
        <ReceiptModal
          sale={reprintSale}
          cantina={activeCantina}
          onClose={() => setReprintSale(null)}
        />
      )}
    </div>
  );
};
