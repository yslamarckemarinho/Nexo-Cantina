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
  HelpCircle
} from 'lucide-react';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('fiado');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('c1'); // default to first customer with debt
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
  const [newCustomerLimit, setNewCustomerLimit] = useState('20.00');

  // Completed sale for receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [customerToWhatsApp, setCustomerToWhatsApp] = useState<Customer | null>(null);

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
      grade: newCustomerGrade,
      dailySpendLimit: parseFloat(newCustomerLimit) || 20.00
    });

    setSelectedCustomerId(created.id);
    setShowNewCustomerModal(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  // Confirm and process the sale
  const handleConfirmSale = () => {
    if (allSaleItems.length === 0) {
      alert('Selecione ou digite os códigos dos itens para realizar a venda.');
      return;
    }

    if (paymentMethod === 'fiado' && !selectedCustomerId) {
      alert('Para lançar no Fiado (Na Conta), selecione um cliente obrigatório.');
      return;
    }

    const selectedCust = activeCantina.customers.find(c => c.id === selectedCustomerId);

    const sale = processSale({
      paymentMethod,
      items: allSaleItems,
      customerId: paymentMethod === 'fiado' ? selectedCust?.id : undefined,
      customerName: paymentMethod === 'fiado' ? selectedCust?.name : undefined,
    });

    setCompletedSale(sale);
    if (paymentMethod === 'fiado' && selectedCust) {
      setCustomerToWhatsApp(selectedCust);
    }

    // Reset inputs
    setCodeInputValue('');
    setManualItems([]);
  };

  // Calculation breakdown string for display
  const calculationEquation = parsedCodeItems.map(item => 
    `${item.quantity}x ${item.name} (R$ ${item.unitPrice.toFixed(2)})`
  ).join(' + ');

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
            onClick={() => setPaymentMethod('fiado')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs sm:text-sm border transition shadow-sm ${
              paymentMethod === 'fiado'
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

      {/* 2. CLIENTE (OBRIGATÓRIO PARA FIADO / OPCIONAL BALCÃO) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            {paymentMethod === 'fiado' ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                2. Cliente Obrigatório (Para Anotar)
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

        <div className="relative">
          <select
            id="pdv-select-customer"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-amber-500 shadow-sm"
          >
            {paymentMethod !== 'fiado' && (
              <option value="">Venda Rápida / Balcão (Sem cliente específico)</option>
            )}
            {activeCantina.customers.map(c => {
              const debtTotal = c.items.filter(i => !i.paid).reduce((acc, curr) => acc + curr.totalPrice, 0);
              return (
                <option key={c.id} value={c.id}>
                  {c.name} {debtTotal > 0 ? `• Saldo devedor: R$ ${debtTotal.toFixed(2)}` : '• Em dia'}
                </option>
              );
            })}
          </select>
        </div>
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

                  <div className="text-[10px] text-emerald-400 font-mono-num">
                    Est: <span className="font-bold">{product.stock} un</span>
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
              : paymentMethod === 'fiado'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 ring-2 ring-amber-500/50'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>
            {paymentMethod === 'fiado' ? 'Anotar na Conta do Cliente' : 'Finalizar e Emitir Cupom'}
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

      {/* Quick New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Cadastrar Novo Cliente para Fiado</span>
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

              <div>
                <label className="block text-xs text-slate-300 mb-1">Limite Diário de Gastos (R$):</label>
                <input
                  type="text"
                  value={newCustomerLimit}
                  onChange={(e) => setNewCustomerLimit(e.target.value)}
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
