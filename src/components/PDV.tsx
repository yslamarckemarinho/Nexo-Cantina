import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCantina } from '../context/CantinaContext';
import { Product, PaymentMethod, SaleItem, Customer, Sale } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { WhatsAppModal } from './WhatsAppModal';
import { 
  Keyboard, 
  Settings, 
  FileText, 
  Zap, 
  Banknote, 
  CreditCard, 
  UserPlus, 
  Check, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  Package,
  HelpCircle,
  Coins,
  Calculator,
  X,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface DenominationBreakdown {
  label: string;
  count: number;
  type: 'cedula' | 'moeda';
}

function getChangeBreakdown(change: number): DenominationBreakdown[] {
  if (change <= 0) return [];
  const denominations: { value: number; label: string; type: 'cedula' | 'moeda' }[] = [
    { value: 100, label: 'Nota de R$ 100', type: 'cedula' },
    { value: 50, label: 'Nota de R$ 50', type: 'cedula' },
    { value: 20, label: 'Nota de R$ 20', type: 'cedula' },
    { value: 10, label: 'Nota de R$ 10', type: 'cedula' },
    { value: 5, label: 'Nota de R$ 5', type: 'cedula' },
    { value: 2, label: 'Nota de R$ 2', type: 'cedula' },
    { value: 1, label: 'Moeda de R$ 1', type: 'moeda' },
    { value: 0.5, label: 'Moeda de R$ 0,50', type: 'moeda' },
    { value: 0.25, label: 'Moeda de R$ 0,25', type: 'moeda' },
    { value: 0.1, label: 'Moeda de R$ 0,10', type: 'moeda' },
    { value: 0.05, label: 'Moeda de R$ 0,05', type: 'moeda' },
  ];

  let remainingCents = Math.round(change * 100);
  const result: DenominationBreakdown[] = [];

  for (const denom of denominations) {
    const denomCents = Math.round(denom.value * 100);
    if (remainingCents >= denomCents) {
      const count = Math.floor(remainingCents / denomCents);
      if (count > 0) {
        result.push({
          label: denom.label,
          count,
          type: denom.type,
        });
        remainingCents %= denomCents;
      }
    }
  }

  return result;
}

export const PDV: React.FC = () => {
  const { 
    activeCantina, 
    processSale, 
    addCustomer, 
    setActiveTab, 
    operatorName 
  } = useCantina();

  if (!activeCantina) {
    return (
      <div className="p-8 text-center text-slate-400">
        Nenhuma cantina selecionada.
      </div>
    );
  }

  // PDV States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('a_prazo');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('c1'); // default to first customer with debt
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [codeInputValue, setCodeInputValue] = useState<string>('');
  const [showTouchKeypad, setShowTouchKeypad] = useState<boolean>(true);
  
  // Custom item modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  // Quick customer creation modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerGrade, setNewCustomerGrade] = useState('3º ano');

  // Completed sale for receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [customerToWhatsApp, setCustomerToWhatsApp] = useState<Customer | null>(null);

  // Cash change calculation modal states
  const [showCashChangeModal, setShowCashChangeModal] = useState<boolean>(false);
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');

  // Manual items added via buttons or custom item
  const [manualItems, setManualItems] = useState<SaleItem[]>([]);

  // Input ref
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse code input (e.g. "1 2 6 5" or "2x1 3")
  const parsedCodeItems = useMemo(() => {
    if (!codeInputValue.trim()) return [];

    const tokens = codeInputValue.trim().split(/\s+/);
    const itemsMap = new Map<number, { product: Product; quantity: number }>();

    tokens.forEach(token => {
      if (!token) return;

      let qty = 1;
      let codeNum: number;

      // Handle "2x1" or "2*1"
      if (token.toLowerCase().includes('x')) {
        const parts = token.toLowerCase().split('x');
        qty = parseInt(parts[0], 10) || 1;
        codeNum = parseInt(parts[1], 10);
      } else if (token.includes('*')) {
        const parts = token.split('*');
        qty = parseInt(parts[0], 10) || 1;
        codeNum = parseInt(parts[1], 10);
      } else {
        codeNum = parseInt(token, 10);
      }

      if (!isNaN(codeNum)) {
        const found = activeCantina.products.find(p => p.code === codeNum && p.active);
        if (found) {
          const existing = itemsMap.get(codeNum);
          if (existing) {
            existing.quantity += qty;
          } else {
            itemsMap.set(codeNum, { product: found, quantity: qty });
          }
        }
      }
    });

    return Array.from(itemsMap.values()).map(({ product, quantity }) => ({
      productId: product.id,
      code: product.code,
      name: product.name,
      quantity,
      unitPrice: product.salePrice,
      totalPrice: product.salePrice * quantity,
      costPrice: product.costPrice
    }));
  }, [codeInputValue, activeCantina.products]);

  // Combined sale items
  const allSaleItems = useMemo(() => {
    const combined = [...parsedCodeItems];

    manualItems.forEach(manual => {
      const existing = combined.find(c => c.productId && c.productId === manual.productId);
      if (existing) {
        existing.quantity += manual.quantity;
        existing.totalPrice = existing.quantity * existing.unitPrice;
      } else {
        combined.push({ ...manual });
      }
    });

    return combined;
  }, [parsedCodeItems, manualItems]);

  const totalSaleAmount = useMemo(() => {
    return allSaleItems.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [allSaleItems]);

  const totalItemCount = useMemo(() => {
    return allSaleItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [allSaleItems]);

  // Keypad click handlers
  const handleKeypadNumber = (num: number) => {
    setCodeInputValue(prev => prev + num.toString());
  };

  const handleKeypadSpace = () => {
    if (codeInputValue && !codeInputValue.endsWith(' ')) {
      setCodeInputValue(prev => prev + ' ');
    }
  };

  const handleKeypadQty = () => {
    setCodeInputValue(prev => prev + 'x');
  };

  const handleKeypadBackspace = () => {
    setCodeInputValue(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setCodeInputValue('');
    setManualItems([]);
  };

  // Quick product tap on the grid
  const handleTapProduct = (product: Product) => {
    setCodeInputValue(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${product.code}` : `${product.code}`;
    });
  };

  const handleAdjustManualQty = (product: Product, delta: number) => {
    setManualItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) {
          return prev.filter(i => i.productId !== product.id);
        }
        return prev.map(i => i.productId === product.id ? {
          ...i,
          quantity: newQty,
          totalPrice: newQty * i.unitPrice
        } : i);
      } else if (delta > 0) {
        return [...prev, {
          productId: product.id,
          code: product.code,
          name: product.name,
          quantity: 1,
          unitPrice: product.salePrice,
          totalPrice: product.salePrice,
          costPrice: product.costPrice
        }];
      }
      return prev;
    });
  };

  // Add custom unlisted item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customItemPrice.replace(',', '.'));
    if (!customItemName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    setManualItems(prev => [
      ...prev,
      {
        name: customItemName.trim(),
        quantity: 1,
        unitPrice: priceNum,
        totalPrice: priceNum,
        costPrice: priceNum * 0.5,
        isCustomValue: true
      }
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomItemModal(false);
  };

  // Create new customer on the fly
  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const created = addCustomer({
      name: newCustomerName.trim(),
      phone: newCustomerPhone,
      grade: newCustomerGrade
    });

    setSelectedCustomerId(created.id);
    setShowNewCustomerModal(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  // Check if current payment is A Prazo
  const isAPrazo = paymentMethod === 'a_prazo' || paymentMethod === 'fiado';

  // Cash received parsed amount & change logic
  const cashReceivedAmount = useMemo(() => {
    const clean = cashReceivedInput.replace(',', '.').trim();
    return parseFloat(clean) || 0;
  }, [cashReceivedInput]);

  const changeAmount = useMemo(() => {
    return Math.max(0, cashReceivedAmount - totalSaleAmount);
  }, [cashReceivedAmount, totalSaleAmount]);

  const shortageAmount = useMemo(() => {
    return Math.max(0, totalSaleAmount - cashReceivedAmount);
  }, [cashReceivedAmount, totalSaleAmount]);

  const isExact = useMemo(() => {
    return Math.abs(cashReceivedAmount - totalSaleAmount) < 0.001;
  }, [cashReceivedAmount, totalSaleAmount]);

  const isSufficient = useMemo(() => {
    return cashReceivedAmount >= totalSaleAmount - 0.001;
  }, [cashReceivedAmount, totalSaleAmount]);

  // Smart suggestions for banknote pills based on total
  const smartBillSuggestions = useMemo(() => {
    const list: number[] = [];
    const standardNotes = [2, 5, 10, 20, 50, 100, 200];
    
    // Find standard notes greater than or equal to total
    for (const note of standardNotes) {
      if (note >= totalSaleAmount && !list.includes(note)) {
        list.push(note);
      }
      if (list.length >= 4) break;
    }

    // If total is higher than 200 or list is empty, suggest ceil to 10/50
    if (list.length === 0) {
      list.push(Math.ceil(totalSaleAmount / 10) * 10);
      list.push(Math.ceil(totalSaleAmount / 50) * 50);
    }

    return list;
  }, [totalSaleAmount]);

  // Breakdown of change into optimal bills and coins
  const changeDenominations = useMemo(() => {
    if (changeAmount <= 0) return [];
    return getChangeBreakdown(changeAmount);
  }, [changeAmount]);

  const handleSetExactCash = () => {
    setCashReceivedInput(totalSaleAmount.toFixed(2));
  };

  const handleSetCashValue = (val: number) => {
    setCashReceivedInput(val % 1 === 0 ? val.toString() : val.toFixed(2));
  };

  const handleAddCashIncrement = (val: number) => {
    const current = parseFloat(cashReceivedInput.replace(',', '.')) || 0;
    const next = Math.round((current + val) * 100) / 100;
    setCashReceivedInput(next % 1 === 0 ? next.toString() : next.toFixed(2));
  };

  // Execute the actual sale processing
  const executeFinalizeSale = (
    method: PaymentMethod,
    amountReceived?: number,
    changeGiven?: number
  ) => {
    const selectedCust = activeCantina.customers.find(c => c.id === selectedCustomerId);

    const sale = processSale({
      paymentMethod: method,
      items: allSaleItems,
      customerId: isAPrazo ? selectedCust?.id : undefined,
      customerName: isAPrazo ? selectedCust?.name : undefined,
      amountReceived,
      changeGiven
    });

    setCompletedSale(sale);
    if (isAPrazo && selectedCust) {
      setCustomerToWhatsApp(selectedCust);
    }

    // Reset inputs
    setCodeInputValue('');
    setManualItems([]);
    setShowCashChangeModal(false);
    setCashReceivedInput('');
  };

  // Confirm and process the sale
  const handleConfirmSale = () => {
    if (allSaleItems.length === 0) {
      alert('Selecione ou digite os códigos dos itens para realizar a venda.');
      return;
    }

    if (isAPrazo && !selectedCustomerId) {
      alert('Para lançar na Conta a Prazo, selecione um cliente obrigatório.');
      return;
    }

    // If payment method is Dinheiro, open smart change calculator modal first!
    if (paymentMethod === 'dinheiro') {
      setCashReceivedInput('');
      setShowCashChangeModal(true);
      return;
    }

    executeFinalizeSale(paymentMethod);
  };

  // Confirm cash sale from smart change calculator modal
  const handleConfirmCashSale = () => {
    if (cashReceivedAmount > 0 && !isSufficient) {
      alert(`Valor insuficiente. Faltam R$ ${shortageAmount.toFixed(2)} para cobrir o total de R$ ${totalSaleAmount.toFixed(2)}.`);
      return;
    }

    const finalReceived = cashReceivedAmount > 0 ? cashReceivedAmount : totalSaleAmount;
    const finalChange = Math.max(0, finalReceived - totalSaleAmount);

    executeFinalizeSale('dinheiro', finalReceived, finalChange);
  };

  // Calculation breakdown string for display
  const calculationEquation = parsedCodeItems.map(item => 
    `${item.quantity}x ${item.name} (R$ ${item.unitPrice.toFixed(2)})`
  ).join(' + ');

  // Filtered customers for PDV selection
  const filteredCustomers = useMemo(() => {
    if (!customerFilter.trim()) return activeCantina.customers;
    const term = customerFilter.toLowerCase();
    return activeCantina.customers.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.grade && c.grade.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  }, [activeCantina.customers, customerFilter]);

  // Selected customer info for daily limit checks
  const selectedCustomerObj = useMemo(() => {
    return activeCantina.customers.find(c => c.id === selectedCustomerId) || null;
  }, [activeCantina.customers, selectedCustomerId]);

  const customerDebt = useMemo(() => {
    if (!selectedCustomerObj) return 0;
    return selectedCustomerObj.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);
  }, [selectedCustomerObj]);

  const exceedsDailyLimit = useMemo(() => {
    if (!selectedCustomerObj || !selectedCustomerObj.dailySpendLimit) return false;
    return totalSaleAmount > selectedCustomerObj.dailySpendLimit;
  }, [selectedCustomerObj, totalSaleAmount]);

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6 space-y-4">
      {/* Top Banner Ticker matching video */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              Lançador Rápido PDV • Pronta-Entrega
            </h1>
            <p className="text-xs text-amber-400 font-mono-num mt-0.5">
              1 = Salgados • 2 = Pippos • 3 = Pipoca • 4 = Doritos • 5 = Biscoito
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="toggle-touch-keypad-btn"
              onClick={() => setShowTouchKeypad(!showTouchKeypad)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                showTouchKeypad
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{showTouchKeypad ? 'Ocultar Teclado' : 'Teclado Touch'}</span>
            </button>

            <button
              id="pdv-config-stock-btn"
              onClick={() => setActiveTab('estoque')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Configurar ({activeCantina.products.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. TIPO DE VENDA / PAGAMENTO (4 Buttons from video) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
          <span>1. Tipo de Venda / Pagamento</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            id="pay-method-fiado"
            onClick={() => setPaymentMethod('a_prazo')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs sm:text-sm border transition shadow-sm ${
              isAPrazo
                ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>A Prazo (Na Conta)</span>
          </button>

          <button
            type="button"
            id="pay-method-pix"
            onClick={() => setPaymentMethod('pix')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs sm:text-sm border transition shadow-sm ${
              paymentMethod === 'pix'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>PIX (À Vista)</span>
          </button>

          <button
            type="button"
            id="pay-method-dinheiro"
            onClick={() => setPaymentMethod('dinheiro')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs sm:text-sm border transition shadow-sm ${
              paymentMethod === 'dinheiro'
                ? 'bg-blue-500 text-slate-950 border-blue-400 ring-2 ring-blue-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Dinheiro</span>
          </button>

          <button
            type="button"
            id="pay-method-cartao"
            onClick={() => setPaymentMethod('cartao')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs sm:text-sm border transition shadow-sm ${
              paymentMethod === 'cartao'
                ? 'bg-purple-500 text-slate-950 border-purple-400 ring-2 ring-purple-500/50'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Cartão</span>
          </button>
        </div>
      </div>

      {/* 2. CLIENTE (OBRIGATÓRIO PARA A PRAZO / OPCIONAL BALCÃO) */}
      <div className="space-y-1.5 bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            {isAPrazo ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                2. Cliente Obrigatório (Para Lançamento a Prazo)
              </span>
            ) : (
              <span>2. Cliente (Opcional para Balcão)</span>
            )}
          </label>
          <button
            type="button"
            id="pdv-new-customer-btn"
            onClick={() => setShowNewCustomerModal(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Cadastrar Novo Cliente</span>
          </button>
        </div>

        {/* Quick Filter / Search input when there are multiple customers */}
        {activeCantina.customers.length > 5 && (
          <input
            type="text"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            placeholder="🔍 Filtrar cliente por nome ou turma..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-1"
          />
        )}

        <div className="relative">
          <select
            id="pdv-select-customer"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-amber-500 shadow-sm"
          >
            {!isAPrazo && (
              <option value="">Venda Rápida / Balcão (Sem cliente específico)</option>
            )}
            {filteredCustomers.map(c => {
              const debtTotal = c.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);
              return (
                <option key={c.id} value={c.id}>
                  {c.name} {c.grade ? `(${c.grade})` : ''} {debtTotal > 0 ? `• Saldo devedor: R$ ${debtTotal.toFixed(2)}` : '• Em dia'}
                </option>
              );
            })}
          </select>
        </div>

        {/* Selected Customer Quick Status Card with Limit Alerts */}
        {selectedCustomerObj && isAPrazo && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Saldo atual:</span>
              <span className={`font-bold font-mono-num ${customerDebt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                R$ {customerDebt.toFixed(2)}
              </span>
              {selectedCustomerObj.dailySpendLimit && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Limite diário:</span>
                  <span className="text-slate-200 font-mono-num">
                    R$ {selectedCustomerObj.dailySpendLimit.toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {exceedsDailyLimit && (
              <div className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded text-[11px] font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Atenção: Venda excede limite de R$ {selectedCustomerObj.dailySpendLimit?.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. DIGITE OS CÓDIGOS DOS ITENS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <span className="text-amber-400 font-extrabold">#</span>
            Digite os Códigos dos Itens
          </span>
          <span className="text-[11px] text-slate-500 font-mono-num">
            Exemplos: <strong className="text-slate-400">1</strong> ou <strong className="text-slate-400">1 2</strong> ou <strong className="text-slate-400">2x1 3</strong>
          </span>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            id="pdv-code-input"
            value={codeInputValue}
            onChange={(e) => setCodeInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirmSale();
              }
            }}
            placeholder="Digite os códigos (ex: 1 2 6 5)"
            className="w-full bg-slate-900 border-2 border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-lg font-bold text-amber-400 placeholder-slate-600 focus:outline-none font-mono-num shadow-inner tracking-wider"
          />
          {codeInputValue && (
            <button
              onClick={handleKeypadClear}
              className="absolute right-3 top-3 text-xs font-semibold px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Touch Keypad matching video */}
        {showTouchKeypad && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg max-w-sm mx-auto">
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => handleKeypadNumber(n)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white text-lg font-bold rounded-xl border border-slate-700 shadow-sm active:scale-95 transition font-mono-num"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={handleKeypadQty}
                className="py-3 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 text-sm font-bold rounded-xl border border-amber-700/60 shadow-sm active:scale-95 transition"
                title="Multiplicador (Ex: 2x)"
              >
                × Qtd
              </button>

              {[4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => handleKeypadNumber(n)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white text-lg font-bold rounded-xl border border-slate-700 shadow-sm active:scale-95 transition font-mono-num"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={handleKeypadSpace}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 shadow-sm active:scale-95 transition"
              >
                Espaço [+]
              </button>

              {[7, 8, 9].map(n => (
                <button
                  key={n}
                  onClick={() => handleKeypadNumber(n)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-white text-lg font-bold rounded-xl border border-slate-700 shadow-sm active:scale-95 transition font-mono-num"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={handleKeypadBackspace}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-rose-300 text-base font-bold rounded-xl border border-slate-700 shadow-sm active:scale-95 transition"
              >
                ⌫
              </button>

              <button
                onClick={handleKeypadClear}
                className="py-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold rounded-xl border border-rose-800/60 shadow-sm active:scale-95 transition"
              >
                LIMPAR
              </button>
              <button
                onClick={() => handleKeypadNumber(0)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-white text-lg font-bold rounded-xl border border-slate-700 shadow-sm active:scale-95 transition font-mono-num"
              >
                0
              </button>
              <button
                onClick={handleConfirmSale}
                className="col-span-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Venda</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Recognized Items Breakdown Box matching video */}
        {allSaleItems.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow-inner">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Itens Reconhecidos:
            </div>

            {/* Chips list */}
            <div className="flex flex-wrap gap-2">
              {allSaleItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono-num text-white shadow-sm"
                >
                  {item.code && (
                    <span className="text-amber-400 font-extrabold">#{item.code}</span>
                  )}
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-slate-300 font-bold">R$ {item.unitPrice.toFixed(2)}</span>
                  {item.quantity > 1 && (
                    <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold">
                      {item.quantity}x
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Detailed calculation equation line from video */}
            {calculationEquation && (
              <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono-num">
                <span className="text-slate-500 font-bold">DETALHAMENTO DO CÁLCULO:</span>
                <div className="text-slate-300 mt-0.5">{calculationEquation} = R$ {totalSaleAmount.toFixed(2)}</div>
              </div>
            )}

            {/* Total line */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs sm:text-sm">
              <span className="font-bold text-slate-300">Total pelos códigos:</span>
              <span className="text-base font-extrabold text-amber-400 font-mono-num">
                R$ {totalSaleAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. OU SELECIONE PELOS BOTÕES DE PRODUTOS */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider">
            Ou selecione pelos botões de produtos:
          </span>
          <span className="text-[11px] text-slate-500">Toque no número para somar ao código</span>
        </div>

        {/* Product Cards Grid matching video layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {activeCantina.products.map(product => {
            const countInSale = allSaleItems.find(i => i.productId === product.id)?.quantity || 0;
            return (
              <div
                key={product.id}
                className={`bg-slate-900 border rounded-xl p-2.5 transition shadow-sm flex flex-col justify-between ${
                  countInSale > 0
                    ? 'border-amber-500/80 bg-slate-900/90 ring-1 ring-amber-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div 
                  onClick={() => handleTapProduct(product)}
                  className="cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-extrabold font-mono-num">
                      #{product.code}
                    </span>
                    <span className="text-xs font-bold text-amber-300 font-mono-num">
                      R$ {product.salePrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="font-bold text-white text-xs truncate" title={product.name}>
                    {product.name}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono-num">
                    {product.stock === 0 ? (
                      <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-400 font-bold rounded">
                        Sem estoque
                      </span>
                    ) : product.stock <= (product.minStockAlert || 5) ? (
                      <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-bold rounded">
                        Est: {product.stock} un (Baixo)
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">
                        Est: {product.stock} un
                      </span>
                    )}
                  </div>
                </div>

                {/* Counter controls */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleAdjustManualQty(product, -1)}
                    disabled={countInSale === 0}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 flex items-center justify-center transition active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-xs font-bold text-white font-mono-num">
                    {countInSale}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAdjustManualQty(product, 1)}
                    className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center transition active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add custom unlisted item button matching video */}
        <button
          type="button"
          id="pdv-add-custom-item-btn"
          onClick={() => setShowCustomItemModal(true)}
          className="w-full py-2.5 px-3 bg-slate-900/60 hover:bg-slate-800/80 border border-dashed border-slate-700 hover:border-amber-500/60 text-slate-300 hover:text-amber-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>+ Adicionar valor avulso / outro produto fora da lista</span>
        </button>
      </div>

      {/* Sticky Bottom Bar matching video */}
      <div className="sticky bottom-2 z-30 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            TOTAL ({totalItemCount} ITENS):
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono-num">
            R$ {totalSaleAmount.toFixed(2)}
          </div>
        </div>

        <button
          type="button"
          id="pdv-confirm-sale-main-btn"
          onClick={handleConfirmSale}
          disabled={allSaleItems.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition shadow-lg ${
            allSaleItems.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : isAPrazo
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 ring-2 ring-amber-500/50'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>
            {isAPrazo ? 'Anotar na Conta a Prazo' : 'Finalizar e Emitir Cupom'}
          </span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Custom Item Modal */}
      {showCustomItemModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Adicionar Item Avulso / Personalizado</span>
            </h3>

            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nome / Descrição:</label>
                <input
                  type="text"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Ex: Salgado Especial, Marmita..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Valor (R$):</label>
                <input
                  type="text"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  placeholder="Ex: 5.50"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Cash Change Calculator Modal */}
      {showCashChangeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Recebimento em Dinheiro</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      Troco Inteligente
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Confira o troco e notas antes de emitir a nota fiscal / cupom
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashChangeModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Sale Box */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Total a Pagar ({totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'}):
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono-num">
                  R$ {totalSaleAmount.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                id="cash-exact-value-btn"
                onClick={handleSetExactCash}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition shadow-sm active:scale-95 flex items-center gap-1.5 ${
                  isExact
                    ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Valor Exato (Sem Troco)</span>
              </button>
            </div>

            {/* Input Valor Recebido */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-400" />
                  <span>Quanto o cliente entregou? (R$)</span>
                </span>
                {cashReceivedInput && (
                  <button
                    type="button"
                    onClick={() => setCashReceivedInput('')}
                    className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="cash-received-input"
                  value={cashReceivedInput}
                  onChange={(e) => setCashReceivedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmCashSale();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowCashChangeModal(false);
                    }
                  }}
                  placeholder={totalSaleAmount.toFixed(2)}
                  className="w-full bg-slate-950 border-2 border-emerald-500/80 focus:border-emerald-400 rounded-2xl px-4 py-3 text-2xl sm:text-3xl font-black text-emerald-400 font-mono-num focus:outline-none tracking-wider shadow-inner"
                  autoFocus
                />
              </div>

              {/* Smart Banknote Presets (Cédulas mais próximas) */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cédulas Rápidas Sugeridas:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleSetExactCash}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition active:scale-95 font-mono-num ${
                      isExact
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    Exato: R$ {totalSaleAmount.toFixed(2)}
                  </button>

                  {smartBillSuggestions.map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSetCashValue(val)}
                      className={`px-3 py-1.5 font-bold text-xs rounded-xl border transition active:scale-95 font-mono-num ${
                        cashReceivedAmount === val
                          ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                      }`}
                    >
                      Nota R$ {val.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Soma Inteligente de Cédulas e Moedas */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Somar Cédulas & Moedas Recebidas:</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Toque para somar ao valor</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[0.50, 1, 2, 5, 10, 20, 50].map(inc => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => handleAddCashIncrement(inc)}
                      className="py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-emerald-300 text-xs font-bold rounded-xl transition active:scale-95 text-center font-mono-num shadow-sm"
                    >
                      + R$ {inc >= 1 ? inc : '0,50'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Realtime Troco Result Box */}
            {cashReceivedAmount > 0 ? (
              <div className={`rounded-2xl p-4 border transition-all ${
                isSufficient
                  ? 'bg-emerald-950/40 border-emerald-600/60 shadow-lg'
                  : 'bg-rose-950/40 border-rose-600/60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      {isSufficient ? 'TROCO A DEVOLVER:' : 'VALOR INSUFICIENTE:'}
                    </span>
                    <div className={`text-2xl sm:text-3xl font-black font-mono-num ${
                      isSufficient ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isSufficient
                        ? `R$ ${changeAmount.toFixed(2)}`
                        : `Faltam R$ ${shortageAmount.toFixed(2)}`}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400 font-mono-num space-y-0.5">
                    <div>Recebido: <strong className="text-white">R$ {cashReceivedAmount.toFixed(2)}</strong></div>
                    <div>Venda: <strong className="text-slate-300">- R$ {totalSaleAmount.toFixed(2)}</strong></div>
                  </div>
                </div>

                {/* Sugestão de Composição das Cédulas/Moedas de Troco */}
                {isSufficient && changeAmount > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-emerald-800/60 space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Separar do Caixa (Menor quantidade de notas e moedas):</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {changeDenominations.map((d, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/60 border border-emerald-600/50 text-emerald-200 rounded-lg text-xs font-bold font-mono-num shadow-sm"
                        >
                          <span className="bg-emerald-800 px-1.5 py-0.2 rounded text-[10px] text-white">{d.count}x</span>
                          <span>{d.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-400">
                💡 Informe o valor em dinheiro entregue pelo cliente ou clique em <strong className="text-slate-200">"Valor Exato"</strong> para finalizar sem troco.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCashChangeModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition"
              >
                Cancelar (Esc)
              </button>

              <button
                type="button"
                id="confirm-cash-sale-btn"
                disabled={cashReceivedAmount > 0 && !isSufficient}
                onClick={handleConfirmCashSale}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition shadow-lg active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>
                  {changeAmount > 0
                    ? `Confirmar e Devolver R$ ${changeAmount.toFixed(2)}`
                    : isExact || cashReceivedAmount === 0
                    ? 'Confirmar e Emitir Cupom'
                    : 'Confirmar Recebimento'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Cadastrar Novo Cliente para Vendas a Prazo</span>
            </h3>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Nome do Cliente / Identificação (Ex: Pai Lucas - Filho Miguel 3º ano):
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ex: Pai Lucas - Filho Miguel 3º ano"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Telefone / WhatsApp:</label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="Ex: 83987654321"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Turma / Ano:</label>
                  <input
                    type="text"
                    value={newCustomerGrade}
                    onChange={(e) => setNewCustomerGrade(e.target.value)}
                    placeholder="Ex: 3º ano"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
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
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal upon completed sale */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          cantina={activeCantina}
          onClose={() => setCompletedSale(null)}
          onOpenWhatsApp={
            customerToWhatsApp ? () => setCustomerToWhatsApp(customerToWhatsApp) : undefined
          }
        />
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
