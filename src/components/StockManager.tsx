import React, { useState, useMemo } from 'react';
import { useCantina } from '../context/CantinaContext';
import { Product, ProductCategory } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  DollarSign, 
  TrendingUp, 
  MessageSquare,
  Filter,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';

const CATEGORIES: ProductCategory[] = [
  'Lanches',
  'Salgadinhos',
  'Biscoitos',
  'Doces',
  'Balas & Doces',
  'Snacks',
  'Chocolates',
  'Bebidas',
  'Sobremesas',
  'Geral'
];

export const StockManager: React.FC = () => {
  const { 
    activeCantina, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    adjustProductStock 
  } = useCantina();

  if (!activeCantina) return null;

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas Categorias');
  const [statusFilter, setStatusFilter] = useState<'all' | 'zerados' | 'baixo' | 'ok'>('all');

  // Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('1.50');
  const [salePrice, setSalePrice] = useState<string>('3.00');
  const [stock, setStock] = useState<string>('20');
  const [minStockAlert, setMinStockAlert] = useState<string>('5');
  const [unit, setUnit] = useState<string>('un');
  const [category, setCategory] = useState<ProductCategory>('Geral');

  // Open modal for new product
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    const nextCode = activeCantina.products.length > 0 
      ? Math.max(...activeCantina.products.map(p => p.code)) + 1 
      : 1;
    setCode(nextCode.toString());
    setName('');
    setCostPrice('1.50');
    setSalePrice('3.00');
    setStock('20');
    setMinStockAlert('5');
    setUnit('un');
    setCategory('Geral');
    setShowProductModal(true);
  };

  // Open modal for editing
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setCode(prod.code.toString());
    setName(prod.name);
    setCostPrice(prod.costPrice ? prod.costPrice.toFixed(2) : '');
    setSalePrice(prod.salePrice.toFixed(2));
    setStock(prod.stock.toString());
    setMinStockAlert(prod.minStockAlert.toString());
    setUnit(prod.unit);
    setCategory(prod.category);
    setShowProductModal(true);
  };

  // Handle Save
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const codeNum = parseInt(code, 10) || 1;
    const costNum = parseFloat(costPrice.replace(',', '.')) || 0;
    const saleNum = parseFloat(salePrice.replace(',', '.')) || 0;
    const stockNum = parseInt(stock, 10) || 0;
    const minAlertNum = parseInt(minStockAlert, 10) || 5;

    if (!name.trim() || saleNum <= 0) {
      alert('Preencha o nome do produto e um preço de venda válido.');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        code: codeNum,
        name: name.trim(),
        costPrice: costNum,
        salePrice: saleNum,
        stock: stockNum,
        minStockAlert: minAlertNum,
        unit: unit.trim() || 'un',
        category
      });
    } else {
      addProduct({
        code: codeNum,
        name: name.trim(),
        costPrice: costNum,
        salePrice: saleNum,
        stock: stockNum,
        minStockAlert: minAlertNum,
        unit: unit.trim() || 'un',
        category,
        active: true
      });
    }

    setShowProductModal(false);
  };

  // Delete product with prompt from video
  const handleDelete = (prod: Product) => {
    if (confirm(`Deseja remover "${prod.name}" do catálogo e estoque?`)) {
      deleteProduct(prod.id);
    }
  };

  // Metrics
  const totalUnits = useMemo(() => {
    return activeCantina.products.reduce((acc, p) => acc + p.stock, 0);
  }, [activeCantina.products]);

  const totalMarketValue = useMemo(() => {
    return activeCantina.products.reduce((acc, p) => acc + (p.salePrice * p.stock), 0);
  }, [activeCantina.products]);

  const zeradosCount = useMemo(() => {
    return activeCantina.products.filter(p => p.stock === 0).length;
  }, [activeCantina.products]);

  const lowStockCount = useMemo(() => {
    return activeCantina.products.filter(p => p.stock > 0 && p.stock <= p.minStockAlert).length;
  }, [activeCantina.products]);

  const okStockCount = useMemo(() => {
    return activeCantina.products.filter(p => p.stock > p.minStockAlert).length;
  }, [activeCantina.products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return activeCantina.products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toString().includes(searchTerm);
      const matchCat = selectedCategory === 'Todas Categorias' || p.category === selectedCategory;

      let matchStatus = true;
      if (statusFilter === 'zerados') matchStatus = p.stock === 0;
      if (statusFilter === 'baixo') matchStatus = p.stock > 0 && p.stock <= p.minStockAlert;
      if (statusFilter === 'ok') matchStatus = p.stock > p.minStockAlert;

      return matchSearch && matchCat && matchStatus;
    }).sort((a, b) => a.code - b.code);
  }, [activeCantina.products, searchTerm, selectedCategory, statusFilter]);

  // Estimated profit calculation for modal preview
  const estimatedProfit = useMemo(() => {
    const cost = parseFloat(costPrice.replace(',', '.')) || 0;
    const sale = parseFloat(salePrice.replace(',', '.')) || 0;
    return sale - cost;
  }, [costPrice, salePrice]);

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Title & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              Controle de Estoque
            </h2>
            <p className="text-xs text-slate-400">
              {activeCantina.products.length} produtos • {totalUnits} un no total
            </p>
          </div>
        </div>

        <button
          type="button"
          id="stock-add-product-btn"
          onClick={handleOpenNewProduct}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Produto</span>
        </button>
      </div>

      {/* Metrics Row matching video exact badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-2.5 rounded-xl border font-semibold flex items-center justify-between transition ${
            statusFilter === 'all'
              ? 'bg-slate-800 border-slate-600 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 bg-slate-700 text-white rounded font-mono-num font-bold">
            {activeCantina.products.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('zerados')}
          className={`p-2.5 rounded-xl border font-semibold flex items-center justify-between transition ${
            statusFilter === 'zerados'
              ? 'bg-rose-950/60 border-rose-600 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1 text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Zerados
          </span>
          <span className="px-1.5 py-0.2 bg-rose-950 text-rose-400 rounded font-mono-num font-bold">
            {zeradosCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('baixo')}
          className={`p-2.5 rounded-xl border font-semibold flex items-center justify-between transition ${
            statusFilter === 'baixo'
              ? 'bg-amber-950/60 border-amber-600 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1 text-amber-400">
            <TrendingUp className="w-3.5 h-3.5" /> Baixo
          </span>
          <span className="px-1.5 py-0.2 bg-amber-950 text-amber-400 rounded font-mono-num font-bold">
            {lowStockCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('ok')}
          className={`p-2.5 rounded-xl border font-semibold flex items-center justify-between transition ${
            statusFilter === 'ok'
              ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" /> Ok
          </span>
          <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded font-mono-num font-bold">
            {okStockCount}
          </span>
        </button>

        <div className="col-span-2 sm:col-span-1 p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <span className="text-slate-400">Valor Estoque:</span>
          <span className="font-bold text-amber-400 font-mono-num">
            R$ {totalMarketValue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Search & Category Filter Row matching video */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            id="stock-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto, código..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <select
            id="stock-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="Todas Categorias">Todas Categorias</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products List matching video exact styling */}
      <div className="space-y-2">
        {filteredProducts.map(product => {
          const isLow = product.stock <= product.minStockAlert;
          const isZero = product.stock === 0;

          return (
            <div
              key={product.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
            >
              {/* Left details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 font-bold text-xs rounded-lg font-mono-num">
                    #{product.code}
                  </span>
                  <h3 className="font-extrabold text-white text-sm sm:text-base">
                    {product.name}
                  </h3>
                  <span className="px-2 py-0.2 bg-slate-800 text-slate-400 text-[10px] rounded-full border border-slate-700">
                    {product.category}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono-num">
                  <span>
                    Venda: <strong className="text-white">R$ {product.salePrice.toFixed(2)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Custo: <strong className="text-slate-300">R$ {product.costPrice ? product.costPrice.toFixed(2) : 'não inf.'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Mínimo: <strong className="text-slate-300">{product.minStockAlert} un</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Saídas: <strong className="text-emerald-400">{product.totalSold || 0} un</strong>
                  </span>
                </div>
              </div>

              {/* Right stock counters & actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                {/* Stock amount & quick adjuster */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Estoque</span>
                    <span className={`text-sm font-black font-mono-num ${
                      isZero ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {product.stock} un
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => adjustProductStock(product.id, -1)}
                      disabled={product.stock === 0}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition font-mono-num"
                      title="Diminuir 1 do estoque"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => adjustProductStock(product.id, 1)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition font-mono-num"
                      title="Adicionar 1 ao estoque"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Edit and Delete Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditProduct(product)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
                    title="Editar produto"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(product)}
                    className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-xl transition"
                    title="Excluir produto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cadastrar / Editar Produto no Estoque Modal matching Video 2 */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>{editingProduct ? 'Editar Produto no Estoque' : 'Cadastrar Produto no Estoque'}</span>
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Cód Rápido:
                  </label>
                  <input
                    type="number"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nome do Produto:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Refrigerante Lata 350ml"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Custo de Compra (R$):
                  </label>
                  <input
                    type="text"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="Ex: 1.50"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Preço Venda (R$):
                  </label>
                  <input
                    type="text"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Ex: 3.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500 font-mono-num"
                    required
                  />
                </div>
              </div>

              {/* Profit Indicator */}
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono-num">
                <span className="text-slate-400">Lucro Estimado / Unidade:</span>
                <span className={`font-bold ${estimatedProfit > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  + R$ {estimatedProfit.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Qtd Estoque:
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="20"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Alerta Mínimo:
                  </label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    placeholder="5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono-num"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Unidade:
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="un"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Categoria:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  id="save-stock-product-btn"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md"
                >
                  Salvar no Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
