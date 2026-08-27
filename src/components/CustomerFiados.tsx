import React, { useState, useMemo } from 'react';
import { useCantina } from '../context/CantinaContext';
import { Customer, DebtItem, PaymentMethod } from '../types';
import { WhatsAppModal } from './WhatsAppModal';
import { 
  Users, 
  Search, 
  UserPlus, 
  MessageSquare, 
  ChevronRight, 
  Check, 
  X, 
  Plus, 
  DollarSign, 
  Calendar, 
  Clock, 
  Trash2, 
  Sparkles,
  Banknote,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  Printer,
  Copy,
  Receipt,
  MinusCircle,
  ArrowDownCircle,
  HandCoins
} from 'lucide-react';

export const CustomerFiados: React.FC = () => {
  const { 
    activeCantina, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    addDebtToCustomer, 
    addMoneyAdvanceToCustomer, 
    settleCustomerDebtItem, 
    abateCustomerDebtPartial,
    settleCustomerAllDebts 
  } = useCantina();

  if (!activeCantina) return null;

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'az' | 'za' | 'maior_saldo' | 'mais_recentes'>('maior_saldo');

  // Selected customer for detail drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    return activeCantina.customers[0] || null;
  });

  // Modal states
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [customerToWhatsApp, setCustomerToWhatsApp] = useState<Customer | null>(null);
  
  // Settle all confirmation modal
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<PaymentMethod>('dinheiro');

  // Settle single specific item modal
  const [itemToSettle, setItemToSettle] = useState<DebtItem | null>(null);
  const [itemSettleMethod, setItemSettleMethod] = useState<PaymentMethod>('dinheiro');

  // Partial debt abatement modal (abater parte da dívida)
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialMethod, setPartialMethod] = useState<PaymentMethod>('dinheiro');
  const [partialNote, setPartialNote] = useState('');

  // Custom cash advance modal (pegou dinheiro / adiantamento / saque com valor livre)
  const [showCustomCashAdvanceModal, setShowCustomCashAdvanceModal] = useState(false);
  const [customAdvanceAmount, setCustomAdvanceAmount] = useState('');
  const [customAdvanceNote, setCustomAdvanceNote] = useState('');

  // New Customer Form State
  const [nameInput, setNameInput] = useState('');
  const [parentInput, setParentInput] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [gradeInput, setGradeInput] = useState('3º ano');
  const [phoneInput, setPhoneInput] = useState('');
  const [limitInput, setLimitInput] = useState('20.00');

  // Inside Drawer Quick Codes input
  const [drawerCodeInput, setDrawerCodeInput] = useState('');
  const [showManualItemModal, setShowManualItemModal] = useState(false);
  const [manualItemName, setManualItemName] = useState('');
  const [manualItemPrice, setManualItemPrice] = useState('');

  // Keep selectedCustomer in sync with activeCantina updates
  const currentSelectedCustomer = useMemo(() => {
    if (!selectedCustomer) return null;
    return activeCantina.customers.find(c => c.id === selectedCustomer.id) || null;
  }, [selectedCustomer, activeCantina.customers]);

  // Global calculations
  const totalReceivables = useMemo(() => {
    return activeCantina.customers.reduce((sum, c) => {
      const debt = c.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);
      return sum + debt;
    }, 0);
  }, [activeCantina.customers]);

  const totalUnpaidItemsCount = useMemo(() => {
    return activeCantina.customers.reduce((sum, c) => {
      const count = c.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.quantity, 0);
      return sum + count;
    }, 0);
  }, [activeCantina.customers]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let list = activeCantina.customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      c.consultationCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortBy) {
      case 'az':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'za':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'maior_saldo':
        return list.sort((a, b) => {
          const debtA = a.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);
          const debtB = b.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);
          return debtB - debtA;
        });
      case 'mais_recentes':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      default:
        return list;
    }
  }, [activeCantina.customers, searchTerm, sortBy]);

  // Handle drawer code launching
  const handleLaunchDrawerCodes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedCustomer || !drawerCodeInput.trim()) return;

    const tokens = drawerCodeInput.trim().split(/\s+/);
    const itemsToAdd: { name: string; quantity: number; unitPrice: number }[] = [];

    tokens.forEach(token => {
      let qty = 1;
      let codeNum: number;
      if (token.toLowerCase().includes('x')) {
        const parts = token.toLowerCase().split('x');
        qty = parseInt(parts[0], 10) || 1;
        codeNum = parseInt(parts[1], 10);
      } else {
        codeNum = parseInt(token, 10);
      }

      if (!isNaN(codeNum)) {
        const prod = activeCantina.products.find(p => p.code === codeNum);
        if (prod) {
          itemsToAdd.push({
            name: prod.name,
            quantity: qty,
            unitPrice: prod.salePrice
          });
        }
      }
    });

    if (itemsToAdd.length > 0) {
      addDebtToCustomer(currentSelectedCustomer.id, itemsToAdd);
      setDrawerCodeInput('');
    }
  };

  const handleQuickAddSingleProduct = (productName: string, unitPrice: number) => {
    if (!currentSelectedCustomer) return;
    addDebtToCustomer(currentSelectedCustomer.id, [
      { name: productName, quantity: 1, unitPrice }
    ]);
  };

  const handleAddManualItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedCustomer || !manualItemName.trim()) return;
    const price = parseFloat(manualItemPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) return;

    addDebtToCustomer(currentSelectedCustomer.id, [
      { name: manualItemName.trim(), quantity: 1, unitPrice: price }
    ]);
    setManualItemName('');
    setManualItemPrice('');
    setShowManualItemModal(false);
  };

  // Custom cash advance submission
  const handleCustomCashAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedCustomer) return;
    const amount = parseFloat(customAdvanceAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    addMoneyAdvanceToCustomer(currentSelectedCustomer.id, amount, customAdvanceNote.trim() || undefined);
    setCustomAdvanceAmount('');
    setCustomAdvanceNote('');
    setShowCustomCashAdvanceModal(false);
  };

  // Partial abatement submission
  const handlePartialAbatementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedCustomer) return;
    const amount = parseFloat(partialAmount.replace(',', '.'));
    const totalDebt = currentSelectedCustomer.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);

    if (isNaN(amount) || amount <= 0) return;

    if (amount >= totalDebt) {
      // If paying full or more, settle all
      settleCustomerAllDebts(currentSelectedCustomer.id, partialMethod);
    } else {
      abateCustomerDebtPartial(currentSelectedCustomer.id, amount, partialMethod, partialNote.trim() || undefined);
    }

    setPartialAmount('');
    setPartialNote('');
    setShowPartialModal(false);
  };

  // Settle specific item submit
  const handleSettleSpecificItemConfirm = () => {
    if (!currentSelectedCustomer || !itemToSettle) return;
    settleCustomerDebtItem(currentSelectedCustomer.id, itemToSettle.id, itemSettleMethod);
    setItemToSettle(null);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const created = addCustomer({
      name: nameInput.trim(),
      parentName: parentInput.trim(),
      studentName: studentInput.trim(),
      grade: gradeInput.trim(),
      phone: phoneInput.trim(),
      dailySpendLimit: parseFloat(limitInput) || 20.00
    });

    setSelectedCustomer(created);
    setShowNewCustomerModal(false);
    setNameInput('');
    setParentInput('');
    setStudentInput('');
    setPhoneInput('');
  };

  const handleConfirmSettleAll = () => {
    if (!currentSelectedCustomer) return;
    settleCustomerAllDebts(currentSelectedCustomer.id, settlePaymentMethod);
    setShowSettleModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Top 3 Counters */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 text-center shadow-md">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total a Receber (A Prazo)
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-400 font-mono-num mt-0.5">
            R$ {totalReceivables.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 text-center shadow-md">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Contas Cadastradas
          </div>
          <div className="text-lg sm:text-2xl font-black text-white font-mono-num mt-0.5">
            {activeCantina.customers.length}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 text-center shadow-md">
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Lançamentos em Aberto
          </div>
          <div className="text-lg sm:text-2xl font-black text-white font-mono-num mt-0.5">
            {totalUnpaidItemsCount}
          </div>
        </div>
      </div>

      {/* Contas a Prazo Title & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Gestão de Contas a Prazo ({activeCantina.customers.length})</span>
          </h2>
          <p className="text-xs text-slate-400">
            Controle de consumo a prazo, empréstimos em dinheiro, baixa de itens e abatimentos parciais
          </p>
        </div>

        <button
          type="button"
          id="fiados-new-customer-btn"
          onClick={() => setShowNewCustomerModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Novo Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          id="fiados-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cliente pelo nome, código ou telefone..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Sorting Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
          Ordenar:
        </span>
        <button
          onClick={() => setSortBy('az')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
            sortBy === 'az'
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          Alfabética (A-Z)
        </button>
        <button
          onClick={() => setSortBy('za')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
            sortBy === 'za'
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          Alfabética (Z-A)
        </button>
        <button
          onClick={() => setSortBy('maior_saldo')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
            sortBy === 'maior_saldo'
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          Maior Saldo Devedor
        </button>
        <button
          onClick={() => setSortBy('mais_recentes')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition ${
            sortBy === 'mais_recentes'
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          Mais Recentes
        </button>
      </div>

      {/* Customer Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCustomers.map(customer => {
          const unpaidItems = customer.items.filter(i => !i.paid);
          const totalDebt = unpaidItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
          const totalUnits = unpaidItems.reduce((acc, curr) => acc + curr.quantity, 0);

          return (
            <div
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition cursor-pointer shadow-md flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Avatar, Name, Phone & Quick Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-extrabold text-base flex-shrink-0 group-hover:border-amber-500/50 transition">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm group-hover:text-amber-300 transition">
                        {customer.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        {customer.grade && <span>{customer.grade}</span>}
                        {customer.phone && (
                          <>
                            <span>•</span>
                            <span className="font-mono-num">{customer.phone}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded text-[10px]">
                          {customer.consultationCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {totalDebt > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerToWhatsApp(customer);
                        }}
                        className="p-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 rounded-xl border border-emerald-800/60 transition"
                        title="Cobrar no WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                    <div className="p-2 text-slate-400">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Saldo devedor row */}
                <div className="flex items-baseline justify-between mt-3 pt-2.5 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Saldo Devedor a Prazo
                    </span>
                    <span className={`text-xl font-black font-mono-num ${
                      totalDebt > 0 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      R$ {totalDebt.toFixed(2)}
                    </span>
                  </div>

                  {totalDebt > 0 ? (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30">
                      {unpaidItems.length} registros
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                      <span>Em dia</span>
                    </span>
                  )}
                </div>

                {/* Mini extrato preview on card */}
                {unpaidItems.length > 0 && (
                  <div className="mt-3 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1.5 font-mono-num">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span>Extrato de Compras / Saques</span>
                      <span>{totalUnits} un total</span>
                    </div>

                    <div className="space-y-1 pt-1 divide-y divide-slate-800/40">
                      {unpaidItems.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] pt-1">
                          <span className={`truncate max-w-[170px] ${item.isMoneyAdvance ? 'text-emerald-300 font-semibold' : 'text-slate-300'}`}>
                            {idx + 1}. {item.name}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {item.quantity}x {item.unitPrice.toFixed(2)}
                          </span>
                          <span className="font-bold text-amber-400">
                            R$ {item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {unpaidItems.length > 3 && (
                      <div className="text-center pt-1 text-[10px] text-amber-400/90 font-medium">
                        ▼ Ver mais {unpaidItems.length - 3} itens no extrato
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer with Subtotal & WhatsApp CTA */}
              {totalDebt > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Subtotal ({totalUnits} un): <strong className="text-white font-mono-num">R$ {totalDebt.toFixed(2)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerToWhatsApp(customer);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Cobrar WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {currentSelectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800/90 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-amber-400 font-extrabold text-lg">
                  {currentSelectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {currentSelectedCustomer.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    {(() => {
                      const debt = currentSelectedCustomer.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);
                      return debt > 0 ? (
                        <span className="text-amber-400 font-bold font-mono-num">
                          R$ {debt.toFixed(2)} pendente a prazo • {currentSelectedCustomer.items.filter(i => !i.paid).length} lançamentos
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Conta Zerada (Em dia)
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentSelectedCustomer.items.some(i => !i.paid) && (
                  <button
                    onClick={() => setCustomerToWhatsApp(currentSelectedCustomer)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Cobrar WhatsApp</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* 1. Anotação Instantânea por Código inside profile */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    Anotação Instantânea por Código (A Prazo)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    Produtos ({activeCantina.products.length})
                  </span>
                </div>

                <form onSubmit={handleLaunchDrawerCodes} className="flex gap-2">
                  <input
                    type="text"
                    value={drawerCodeInput}
                    onChange={(e) => setDrawerCodeInput(e.target.value)}
                    placeholder="Digite os códigos (ex: 1 2 para Salgado + Pippos)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono-num"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm"
                  >
                    + Lançar
                  </button>
                </form>

                {/* Quick product chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeCantina.products.slice(0, 13).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleQuickAddSingleProduct(p.name, p.salePrice)}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-lg text-[11px] text-slate-200 font-mono-num transition flex items-center gap-1"
                    >
                      <span className="text-amber-400 font-bold">#{p.code}</span>
                      <span>{p.name}</span>
                      <span className="text-slate-400 text-[10px]">({p.salePrice.toFixed(2)})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Pegou Dinheiro (Saque / Empréstimo / Adiantamento) */}
              <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <HandCoins className="w-4 h-4" />
                    <span>Pegou Dinheiro (Saque / Empréstimo a Prazo)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomCashAdvanceModal(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                  >
                    + Outro Valor / Motivo
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[2, 5, 10, 15, 20, 30, 50].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => addMoneyAdvanceToCustomer(currentSelectedCustomer.id, val)}
                      className="py-2 bg-emerald-900/40 hover:bg-emerald-800/80 border border-emerald-700/60 text-emerald-300 font-bold text-xs rounded-lg transition active:scale-95 text-center font-mono-num shadow-sm"
                    >
                      + R$ {val}.00
                    </button>
                  ))}
                </div>
              </div>

              {/* Add custom unlisted item button */}
              <button
                type="button"
                onClick={() => setShowManualItemModal(true)}
                className="w-full py-2 bg-slate-950/60 hover:bg-slate-800 border border-dashed border-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Lançar outro valor avulso na conta a prazo</span>
              </button>

              {/* 3. EXTRATO CRONOLÓGICO DETALHADO with item settlement */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-400" />
                    <span>Extrato Detalhado de Compras e Saques</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono-num">
                    {currentSelectedCustomer.items.length} movimentações
                  </span>
                </div>

                {currentSelectedCustomer.items.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
                    Nenhum item lançado a prazo para este cliente ainda.
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                    <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 p-2.5 border-b border-slate-800 bg-slate-900/60">
                      <span className="col-span-3">Data & Hora</span>
                      <span className="col-span-5">Descrição / Quantidade</span>
                      <span className="col-span-2 text-right">Valor</span>
                      <span className="col-span-2 text-right">Ação</span>
                    </div>

                    <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                      {currentSelectedCustomer.items.map((item) => (
                        <div 
                          key={item.id} 
                          className={`grid grid-cols-12 p-2.5 text-xs items-center font-mono-num ${
                            item.paid ? 'opacity-40 bg-slate-950' : 'hover:bg-slate-900/50'
                          }`}
                        >
                          <div className="col-span-3 text-[11px] text-slate-400">
                            <div>{item.formattedDate}</div>
                            <div className="text-[10px] text-slate-500">{item.formattedTime}</div>
                          </div>

                          <div className="col-span-5">
                            <div className={`font-semibold ${item.isMoneyAdvance ? 'text-emerald-400 flex items-center gap-1' : 'text-white'}`}>
                              {item.isMoneyAdvance && <Banknote className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                              <span>{item.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.quantity} un • R$ {item.unitPrice.toFixed(2)}
                            </div>
                          </div>

                          <div className="col-span-2 text-right font-bold text-amber-400">
                            R$ {item.totalPrice.toFixed(2)}
                          </div>

                          <div className="col-span-2 text-right">
                            {item.paid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-950/40 rounded border border-emerald-800/40">
                                <Check className="w-3 h-3" /> Pago
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setItemToSettle(item)}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[11px] font-bold border border-emerald-600/40 transition active:scale-95"
                                title="Dar baixa ou pagar este item específico"
                              >
                                ✓ Pagar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Bar */}
            <div className="p-4 bg-slate-800/95 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Saldo Devedor Total:
                </span>
                <span className="text-xl font-black text-amber-400 font-mono-num">
                  R$ {currentSelectedCustomer.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentSelectedCustomer.items.filter(i => !i.paid).length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja remover o cadastro de "${currentSelectedCustomer.name}"?`)) {
                        deleteCustomer(currentSelectedCustomer.id);
                        setSelectedCustomer(null);
                      }
                    }}
                    className="p-2.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 rounded-xl border border-rose-800/50 transition"
                    title="Excluir cadastro zerado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Abater Parte da Dívida Button */}
                <button
                  type="button"
                  id="fiados-abate-partial-btn"
                  disabled={currentSelectedCustomer.items.filter(i => !i.paid).length === 0}
                  onClick={() => setShowPartialModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Abater Parte</span>
                </button>

                {/* Quitar Toda a Conta */}
                <button
                  type="button"
                  id="fiados-settle-all-btn"
                  disabled={currentSelectedCustomer.items.filter(i => !i.paid).length === 0}
                  onClick={() => setShowSettleModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold text-xs rounded-xl shadow-lg transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Quitar Tudo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Modal para Pagar Item Específico */}
      {itemToSettle && currentSelectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Pagar Item / Conta Específica</span>
            </h3>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs text-slate-400 font-medium">Item selecionado:</div>
              <div className="text-sm font-bold text-white">{itemToSettle.name}</div>
              <div className="flex justify-between items-center pt-1 text-xs">
                <span className="text-slate-400">Data: {itemToSettle.formattedDate}</span>
                <span className="text-emerald-400 font-bold font-mono-num text-sm">
                  R$ {itemToSettle.totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Forma de Recebimento:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['dinheiro', 'pix', 'cartao'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setItemSettleMethod(m)}
                    className={`py-2 rounded-lg border font-bold uppercase transition ${
                      itemSettleMethod === m
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToSettle(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSettleSpecificItemConfirm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal de Abater Parte da Dívida */}
      {showPartialModal && currentSelectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-blue-400" />
              <span>Abater Parte da Dívida</span>
            </h3>

            <p className="text-xs text-slate-300">
              Cliente: <strong className="text-white">{currentSelectedCustomer.name}</strong>
              <br />
              Saldo total atual:{' '}
              <strong className="text-amber-400 font-mono-num">
                R$ {currentSelectedCustomer.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2)}
              </strong>
            </p>

            <form onSubmit={handlePartialAbatementSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Valor a Abater / Recebido (R$):
                </label>
                <input
                  type="text"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="Ex: 20.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-bold font-mono-num focus:outline-none focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">
                  Forma de Pagamento:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['dinheiro', 'pix', 'cartao'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPartialMethod(m)}
                      className={`py-1.5 rounded-lg border font-bold uppercase transition ${
                        partialMethod === m
                          ? 'bg-blue-500 text-white border-blue-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Observação (Opcional):
                </label>
                <input
                  type="text"
                  value={partialNote}
                  onChange={(e) => setPartialNote(e.target.value)}
                  placeholder="Ex: Deixou 20 reais no recreio"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPartialModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md"
                >
                  Abater Saldo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Pegou Dinheiro com Valor Livre & Motivo */}
      {showCustomCashAdvanceModal && currentSelectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-emerald-400" />
              <span>Pegou Dinheiro / Saque em Conta</span>
            </h3>

            <p className="text-xs text-slate-300">
              Lançar valor retirado em dinheiro para <strong className="text-white">{currentSelectedCustomer.name}</strong>.
            </p>

            <form onSubmit={handleCustomCashAdvanceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Valor Retirado (R$):
                </label>
                <input
                  type="text"
                  value={customAdvanceAmount}
                  onChange={(e) => setCustomAdvanceAmount(e.target.value)}
                  placeholder="Ex: 25.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold font-mono-num focus:outline-none focus:border-emerald-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Motivo / Observação:
                </label>
                <input
                  type="text"
                  value={customAdvanceNote}
                  onChange={(e) => setCustomAdvanceNote(e.target.value)}
                  placeholder="Ex: Pegou p/ transporte, xerox ou feira"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomCashAdvanceModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md"
                >
                  Lançar Saque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Settle All Debts Modal */}
      {showSettleModal && currentSelectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Confirmar Quitação Total</span>
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              Quitar saldo de <strong className="text-amber-400 font-mono-num">
                R$ {currentSelectedCustomer.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2)}
              </strong> de {currentSelectedCustomer.name}?
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-xs font-semibold text-slate-400">
                Forma de Recebimento:
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['dinheiro', 'pix', 'cartao'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettlePaymentMethod(m)}
                    className={`py-2 rounded-lg border font-bold uppercase transition ${
                      settlePaymentMethod === m
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSettleAll}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-md"
              >
                Confirmar e Dar Baixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Item Launch Modal */}
      {showManualItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Lançamento Manual Avulso a Prazo</span>
            </h3>

            <form onSubmit={handleAddManualItemSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Descrição do Consumo:</label>
                <input
                  type="text"
                  value={manualItemName}
                  onChange={(e) => setManualItemName(e.target.value)}
                  placeholder="Ex: Almoço / Lanche Especial"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Valor (R$):</label>
                <input
                  type="text"
                  value={manualItemPrice}
                  onChange={(e) => setManualItemPrice(e.target.value)}
                  placeholder="Ex: 12.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualItemModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Lançar na Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Novo Cadastro de Cliente / Conta a Prazo</span>
            </h3>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Nome do Cliente / Identificação Completa:
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ex: Pai Lucas - Filho Miguel 3º ano"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Nome do Responsável:</label>
                  <input
                    type="text"
                    value={parentInput}
                    onChange={(e) => setParentInput(e.target.value)}
                    placeholder="Ex: Lucas Soares"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Nome do Aluno:</label>
                  <input
                    type="text"
                    value={studentInput}
                    onChange={(e) => setStudentInput(e.target.value)}
                    placeholder="Ex: Miguel Soares"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">WhatsApp de Cobrança:</label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Ex: 83987654321"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Turma / Série:</label>
                  <input
                    type="text"
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    placeholder="Ex: 3º ano"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Limite de Gastos Diário (R$):</label>
                <input
                  type="text"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  placeholder="Ex: 20.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {customerToWhatsApp && (
        <WhatsAppModal
          customer={customerToWhatsApp}
          cantina={activeCantina}
          onClose={() => setCustomerToWhatsApp(null)}
        />
      )}
    </div>
  );
};
