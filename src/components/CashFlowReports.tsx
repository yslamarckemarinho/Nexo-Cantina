import React, { useState, useMemo, useEffect } from 'react';
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
  Sparkles, 
  Receipt, 
  Zap, 
  Banknote, 
  CreditCard, 
  FileText,
  Search,
  Bot,
  MessageSquare,
  Copy,
  Check,
  Share2,
  Smartphone,
  Printer,
  X
} from 'lucide-react';
import { ReportModal } from './ReportModal';

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
  const [showReportModal, setShowReportModal] = useState(false);

  // WhatsApp Executive Summary & Shift Closing Modal
  const [showWhatsAppSummaryModal, setShowWhatsAppSummaryModal] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState(activeCantina.phone || '');
  const [actualCountedCash, setActualCountedCash] = useState('');
  const [shiftClosingNotes, setShiftClosingNotes] = useState('');
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);
  const [shiftClosedJustNow, setShiftClosedJustNow] = useState(false);

  // Keep whatsappPhone updated when active cantina changes
  useEffect(() => {
    if (activeCantina?.phone) {
      setWhatsappPhone(activeCantina.phone);
    }
  }, [activeCantina?.id, activeCantina?.phone]);

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

  const totalSuprimentos = useMemo(() => {
    return shiftMovements.filter(m => m.type === 'suprimento').reduce((acc, m) => acc + m.amount, 0);
  }, [shiftMovements]);

  const totalSangrias = useMemo(() => {
    return shiftMovements.filter(m => m.type === 'sangria' || m.type === 'saida').reduce((acc, m) => acc + m.amount, 0);
  }, [shiftMovements]);

  const debtSettlementsCash = useMemo(() => {
    return shiftMovements
      .filter(m => (m.type === 'quitacao_fiado' || m.type === 'quitacao_prazo') && m.paymentMethod === 'dinheiro')
      .reduce((acc, m) => acc + m.amount, 0);
  }, [shiftMovements]);

  // Total pending fiados across all customers for this canteen
  const totalPendingFiados = useMemo(() => {
    return activeCantina.customers.reduce((acc, cust) => {
      const unpaid = cust.items.filter(i => !i.paid).reduce((sum, i) => sum + i.totalPrice, 0);
      return acc + unpaid;
    }, 0);
  }, [activeCantina.customers]);

  const debtorsCount = useMemo(() => {
    return activeCantina.customers.filter(c => c.items.some(i => !i.paid)).length;
  }, [activeCantina.customers]);

  // Generator for WhatsApp Executive Summary Text
  const generateExecutiveSummaryText = () => {
    const now = new Date();
    const dataStr = selectedDate === 'todas' ? now.toLocaleDateString('pt-BR') : selectedDate.split('-').reverse().join('/');
    const horaStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const trocoInicial = currentShift?.openingBalance || 0;
    const aPrazoTotal = methodTotals.a_prazo || 0;
    const actualNum = parseFloat(actualCountedCash.replace(',', '.')) || expectedDrawerCash;
    const diff = Math.round((actualNum - expectedDrawerCash) * 100) / 100;

    let conferidoBlock = '';
    if (actualCountedCash) {
      if (diff === 0) {
        conferidoBlock = `\n✅ *Conferência de Gaveta:* R$ ${actualNum.toFixed(2)} (Bateu Exato! 100% Ok)`;
      } else if (diff > 0) {
        conferidoBlock = `\n⚠️ *Conferência de Gaveta:* R$ ${actualNum.toFixed(2)} (+ R$ ${diff.toFixed(2)} Sobra)`;
      } else {
        conferidoBlock = `\n🚨 *Conferência de Gaveta:* R$ ${actualNum.toFixed(2)} (- R$ ${Math.abs(diff).toFixed(2)} Falta)`;
      }
    }

    const obsBlock = shiftClosingNotes.trim() ? `\n📝 *Observações:* ${shiftClosingNotes.trim()}\n` : '';

    return `📊 *FECHAMENTO & RESUMO DE CAIXA*
🏫 *${activeCantina.name}*
${activeCantina.schoolName ? `📍 ${activeCantina.schoolName}\n` : ''}📅 *Data:* ${dataStr} • 🕒 *Hora:* ${horaStr}
👤 *Operador:* ${operatorName || activeCantina.operatorName || 'Caixa'}

💵 *FATURAMENTO DO PERÍODO:*
• Total de Vendas: *R$ ${totalSalesDay.toFixed(2)}* (${filteredSales.length} cupons)
• PIX (À Vista): R$ ${methodTotals.pix.toFixed(2)}
• Dinheiro (À Vista): R$ ${methodTotals.dinheiro.toFixed(2)}
• A Prazo (Fiado Alunos): R$ ${aPrazoTotal.toFixed(2)}
• Lucro Bruto Estimado: R$ ${totalProfitDay.toFixed(2)} (${profitMarginPercent.toFixed(1)}%)

🏦 *MOVIMENTAÇÕES NA GAVETA (ESPÉCIE):*
• Fundo de Troco Inicial: R$ ${trocoInicial.toFixed(2)}
• (+) Vendas em Dinheiro: R$ ${methodTotals.dinheiro.toFixed(2)}${debtSettlementsCash > 0 ? `\n• (+) Baixas Fiado Dinheiro: R$ ${debtSettlementsCash.toFixed(2)}` : ''}${totalSuprimentos > 0 ? `\n• (+) Suprimentos de Troco: R$ ${totalSuprimentos.toFixed(2)}` : ''}${totalSangrias > 0 ? `\n• (-) Sangrias / Retiradas: R$ ${totalSangrias.toFixed(2)}` : ''}
----------------------------------------
💵 *DINHEIRO FÍSICO ESPERADO: R$ ${expectedDrawerCash.toFixed(2)}*${conferidoBlock}

📋 *CADERNETA DE FIADOS:*
• Saldo Total a Receber: *R$ ${totalPendingFiados.toFixed(2)}* (${debtorsCount} alunos/clientes devedores)${obsBlock}
_Relatório emitido via Nexo Cantinas_`;
  };

  const handleSendWhatsApp = () => {
    const text = generateExecutiveSummaryText();
    const clean = whatsappPhone.replace(/\D/g, '');
    const fullPhone = clean ? (clean.startsWith('55') ? clean : `55${clean}`) : '';
    const url = fullPhone
      ? `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopySummary = () => {
    const text = generateExecutiveSummaryText();
    navigator.clipboard.writeText(text);
    setCopiedWhatsAppText(true);
    setTimeout(() => setCopiedWhatsAppText(false), 3000);
  };

  const handleExecuteShiftClose = () => {
    const actualNum = parseFloat(actualCountedCash.replace(',', '.')) || expectedDrawerCash;
    closeCurrentShift({
      closingBalanceActual: actualNum,
      closingBalanceExpected: expectedDrawerCash,
      closingNotes: shiftClosingNotes.trim() || undefined,
      methodTotals: {
        pix: methodTotals.pix || 0,
        dinheiro: methodTotals.dinheiro || 0,
        cartao: 0,
        a_prazo: methodTotals.a_prazo || 0,
        totalVendas: totalSalesDay,
        totalLucro: totalProfitDay,
        totalSuprimentos: totalSuprimentos,
        totalSangrias: totalSangrias,
        salesCount: filteredSales.length
      }
    });
    setShiftClosedJustNow(true);
  };

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
        desc: `${(100 - aPrazoShare).toFixed(1)}% das vendas foram liquidadas à vista (PIX e Dinheiro).`
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
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Exportar planilha Excel (.CSV) humanizada"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Visualizar e Imprimir Relatório em PDF"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Relatório / PDF</span>
          </button>

          <button
            onClick={() => {
              setActualCountedCash(expectedDrawerCash.toFixed(2));
              setShiftClosedJustNow(false);
              setShowWhatsAppSummaryModal(true);
            }}
            id="btn-whatsapp-executive-summary"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            title="Gerar Resumo Executivo / Fechamento de Caixa para WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Resumo WhatsApp</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                    setActualCountedCash(expectedDrawerCash.toFixed(2));
                    setShiftClosedJustNow(false);
                    setShowWhatsAppSummaryModal(true);
                  }}
                  id="btn-close-shift-open-modal"
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Fechar Caixa</span>
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

      {/* WhatsApp Executive Summary & Shift Closing Modal */}
      {showWhatsAppSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    {isShiftOpen ? 'Fechamento de Caixa & Resumo WhatsApp' : 'Resumo Executivo do Caixa'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeCantina.name} • {selectedDate === 'todas' ? 'Hoje' : selectedDate.split('-').reverse().join('/')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppSummaryModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If shift was just closed, show confirmation banner */}
            {shiftClosedJustNow && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Caixa do turno fechado com sucesso! Agora envie o resumo ao dono/administrador.</span>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Vendas:</span>
                <span className="text-sm font-black text-amber-400 font-mono-num">
                  R$ {totalSalesDay.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{filteredSales.length} cupons</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vendas Dinheiro:</span>
                <span className="text-sm font-black text-white font-mono-num">
                  R$ {methodTotals.dinheiro.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Espécie</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vendas no PIX:</span>
                <span className="text-sm font-black text-emerald-400 font-mono-num">
                  R$ {methodTotals.pix.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Conta bancária</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vendas A Prazo:</span>
                <span className="text-sm font-black text-amber-300 font-mono-num">
                  R$ {(methodTotals.a_prazo || 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Fiado</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lucro Bruto Est.:</span>
                <span className="text-sm font-black text-emerald-400 font-mono-num">
                  R$ {totalProfitDay.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{profitMarginPercent.toFixed(1)}% margem</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40">
                <span className="text-[10px] uppercase font-extrabold text-amber-400 block">Gaveta Esperada:</span>
                <span className="text-sm font-black text-amber-400 font-mono-num">
                  R$ {expectedDrawerCash.toFixed(2)}
                </span>
                <span className="text-[10px] text-amber-300/80 block mt-0.5">Físico esperado</span>
              </div>
            </div>

            {/* Fiados pending callout */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Pendente na Caderneta de Fiados:</span>
                <span className="text-base font-extrabold text-amber-400 font-mono-num">
                  R$ {totalPendingFiados.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold font-mono-num">
                  {debtorsCount} devedores
                </span>
              </div>
            </div>

            {/* Drawer Count / Fechamento section if shift is open */}
            {isShiftOpen && !shiftClosedJustNow && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Conferência de Fechamento do Turno</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    Esperado: R$ {expectedDrawerCash.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Dinheiro Contado na Gaveta (R$):
                    </label>
                    <input
                      type="text"
                      value={actualCountedCash}
                      onChange={(e) => setActualCountedCash(e.target.value)}
                      placeholder={expectedDrawerCash.toFixed(2)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono-num focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Resultado da Conferência:
                    </label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono-num flex items-center gap-1.5">
                      {(() => {
                        const actualNum = parseFloat(actualCountedCash.replace(',', '.')) || expectedDrawerCash;
                        const diff = Math.round((actualNum - expectedDrawerCash) * 100) / 100;
                        if (diff === 0) {
                          return <span className="text-emerald-400 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Exato (R$ 0,00)</span>;
                        } else if (diff > 0) {
                          return <span className="text-blue-400 font-bold">+ R$ {diff.toFixed(2)} (Sobra)</span>;
                        } else {
                          return <span className="text-rose-400 font-bold">- R$ {Math.abs(diff).toFixed(2)} (Falta)</span>;
                        }
                      })()}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Observações do Fechamento (opcional):
                  </label>
                  <input
                    type="text"
                    value={shiftClosingNotes}
                    onChange={(e) => setShiftClosingNotes(e.target.value)}
                    placeholder="Ex: Turno encerrado sem divergências"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleExecuteShiftClose}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Concluir Fechamento do Caixa & Travar Turno</span>
                  </button>
                </div>
              </div>
            )}

            {/* Destination WhatsApp Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>WhatsApp do Destinatário (Dono / Administrador):</span>
                <span className="text-[10px] text-slate-500">DDD + Número</span>
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="Ex: 83988887777 ou deixe em branco para escolher contato"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono-num"
                />
              </div>
            </div>

            {/* WhatsApp Text Preview (Collapsible / Readable) */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Prévia da Mensagem Formatada:
              </span>
              <pre className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 whitespace-pre-wrap font-mono max-h-36 overflow-y-auto leading-relaxed">
                {generateExecutiveSummaryText()}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowWhatsAppSummaryModal(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                {copiedWhatsAppText ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar pelo WhatsApp</span>
              </button>
            </div>
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

      {/* Human-readable report & print modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        cantinaFallback={activeCantina}
      />
    </div>
  );
};
