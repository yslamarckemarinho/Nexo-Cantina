import React, { useState, useMemo, useEffect } from 'react';
import { useCantina } from '../context/CantinaContext';
import { Product, ProductCategory } from '../types';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Check, 
  Share2, 
  Smartphone, 
  UtensilsCrossed,
  Filter,
  Search,
  CheckSquare,
  Square,
  PackageCheck,
  Building2,
  ListFilter,
  Eye,
  Send
} from 'lucide-react';

interface ParentMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Lanches': '🥪',
  'Salgadinhos': '🥐',
  'Biscoitos': '🍪',
  'Doces': '🍬',
  'Balas & Doces': '🍭',
  'Snacks': '🍿',
  'Chocolates': '🍫',
  'Bebidas': '🧃',
  'Sobremesas': '🧁',
  'Geral': '🍴'
};

export const ParentMenuModal: React.FC<ParentMenuModalProps> = ({ isOpen, onClose }) => {
  const { activeCantina } = useCantina();

  const [activeTab, setActiveTab] = useState<'manage' | 'preview'>('manage');
  const [targetPhone, setTargetPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [includePixInfo, setIncludePixInfo] = useState(true);
  const [includeWelcomeNote, setIncludeWelcomeNote] = useState(true);
  const [copied, setCopied] = useState(false);

  // ISOLAMENTO MULTI-TENANT:
  // Armazena os IDs selecionados estritamente por cantina ativa.
  // Garante isolamento total sem cruzamento entre estabelecimentos.
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // Inicializa a seleção isolada para a cantina atual
  useEffect(() => {
    if (!activeCantina) return;
    const storageKey = `nexo_menu_selected_ids_${activeCantina.id}`;
    const validCurrentCantinaProductIds = new Set(activeCantina.products.filter(p => p.active).map(p => p.id));

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        // CRÍTICO: Filtra apenas IDs que pertencem à cantina ativa atual
        const isolatedIds = parsed.filter(id => validCurrentCantinaProductIds.has(id));
        setSelectedProductIds(new Set(isolatedIds));
        return;
      }
    } catch (e) {
      // fallback
    }

    // Padrão inicial para nova cantina: todos os produtos ativos com estoque > 0 acionados
    const defaultIds = activeCantina.products
      .filter(p => p.active && p.stock > 0)
      .map(p => p.id);
    setSelectedProductIds(new Set(defaultIds));
  }, [activeCantina?.id]);

  // Salva no localStorage com escopo estrito da cantina ativa
  const persistSelection = (newSet: Set<string>) => {
    if (!activeCantina) return;
    setSelectedProductIds(newSet);
    try {
      const storageKey = `nexo_menu_selected_ids_${activeCantina.id}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
    } catch (e) {
      // storage quota or private mode
    }
  };

  // Alterna a inclusão/retirada de um produto individual
  const handleToggleProduct = (productId: string) => {
    const next = new Set<string>(selectedProductIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    persistSelection(next);
  };

  // Acionar todos os produtos ativos da cantina
  const handleSelectAll = () => {
    if (!activeCantina) return;
    const allIds = activeCantina.products.filter(p => p.active).map(p => p.id);
    persistSelection(new Set<string>(allIds));
  };

  // Retirar todos os produtos
  const handleDeselectAll = () => {
    persistSelection(new Set<string>());
  };

  // Acionar somente produtos com estoque maior que zero
  const handleSelectOnlyInStock = () => {
    if (!activeCantina) return;
    const inStockIds = activeCantina.products
      .filter(p => p.active && p.stock > 0)
      .map(p => p.id);
    persistSelection(new Set<string>(inStockIds));
  };

  // Lista de produtos ativos da cantina (filtrados para exibição na aba de gerenciamento)
  const displayProducts = useMemo(() => {
    if (!activeCantina) return [];
    return activeCantina.products
      .filter(p => {
        if (!p.active) return false;
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCantina, selectedCategory, searchQuery]);

  // Produtos que estão efetivamente acionados (selecionados) no cardápio
  const menuSelectedProducts = useMemo(() => {
    if (!activeCantina) return [];
    return activeCantina.products
      .filter(p => p.active && selectedProductIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeCantina, selectedProductIds]);

  // Agrupamento por categoria dos produtos acionados
  const groupedMenuProducts = useMemo(() => {
    const map = new Map<ProductCategory, Product[]>();
    if (!activeCantina) return map;
    for (const p of menuSelectedProducts) {
      const list = map.get(p.category) || [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [activeCantina, menuSelectedProducts]);

  // Texto formatado pronto para envio pelo WhatsApp
  const menuText = useMemo(() => {
    if (!activeCantina) return '';
    const now = new Date();
    const dataStr = now.toLocaleDateString('pt-BR');

    let text = `🍎 *CARDÁPIO DA CANTINA*\n`;
    text += `🏫 *${activeCantina.name}*`;
    if (activeCantina.schoolName) {
      text += ` • ${activeCantina.schoolName}`;
    }
    text += `\n📅 *Atualizado em:* ${dataStr}\n`;

    if (includeWelcomeNote) {
      text += `\nOlá, pais e responsáveis! Segue a lista dos produtos disponíveis hoje na nossa cantina:\n`;
    }

    if (groupedMenuProducts.size === 0) {
      text += `\n_Nenhum item adicionado ao cardápio de hoje._\n`;
    } else {
      groupedMenuProducts.forEach((prods, category) => {
        const emoji = CATEGORY_EMOJIS[category] || '🍴';
        text += `\n${emoji} *${category.toUpperCase()}:*\n`;
        for (const p of prods) {
          text += `• ${p.name}: *R$ ${p.salePrice.toFixed(2).replace('.', ',')}*\n`;
        }
      });
    }

    if (includePixInfo && activeCantina.pixKey) {
      text += `\n💳 *FORMAS DE PAGAMENTO:*`;
      text += `\n• Aceitamos PIX, Dinheiro e Cartão.`;
      text += `\n📲 *Chave PIX (${activeCantina.pixKeyType}):* \`${activeCantina.pixKey}\``;
      if (activeCantina.pixReceiverName) {
        text += `\n👤 *Favorecido:* ${activeCantina.pixReceiverName}`;
      }
      text += `\n`;
    }

    text += `\nTenham um excelente dia! ✨`;
    return text;
  }, [activeCantina, groupedMenuProducts, includeWelcomeNote, includePixInfo]);

  const handleCopy = () => {
    navigator.clipboard.writeText(menuText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Botão de Enviar essa lista via WhatsApp
  const handleSendWhatsApp = () => {
    const cleanPhone = targetPhone.replace(/\D/g, '');
    let url = '';
    if (cleanPhone) {
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(menuText)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(menuText)}`;
    }
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Cardápio - ${activeCantina.name}`,
          text: menuText
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  const categoriesWithProducts = useMemo(() => {
    const cats = new Set<ProductCategory>();
    if (!activeCantina) return [];
    activeCantina.products.forEach(p => {
      if (p.active) cats.add(p.category);
    });
    return Array.from(cats);
  }, [activeCantina]);

  const totalActiveInCantina = activeCantina ? activeCantina.products.filter(p => p.active).length : 0;
  const totalSelected = menuSelectedProducts.length;

  if (!isOpen || !activeCantina) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 max-w-2xl w-full shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header com Isolamento de Cantina */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  Cardápio da Cantina para Pais
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-black">
                  {totalSelected} de {totalActiveInCantina} itens
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span className="font-semibold text-slate-300">{activeCantina.name}</span>
                {activeCantina.schoolName && <span>• {activeCantina.schoolName}</span>}
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900">
                  Dados Isolados
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-800/80 flex-shrink-0">
          <button
            type="button"
            id="tab-manage-menu-items"
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'manage'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>1. Acionar / Retirar Itens</span>
            <span className="ml-1 px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
              {totalSelected}
            </span>
          </button>

          <button
            type="button"
            id="tab-preview-menu"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>2. Prévia & Enviar Lista</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {activeTab === 'manage' ? (
            /* TAB 1: ACIONAR E RETIRAR ITENS DA LISTA */
            <div className="space-y-3">
              {/* Barra de Ações Rápidas de Seleção */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-300">
                    Controle de Inclusão no Cardápio:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      id="menu-select-all-btn"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <CheckSquare className="w-3 h-3 text-emerald-400" />
                      <span>Acionar Todos</span>
                    </button>

                    <button
                      type="button"
                      id="menu-select-instock-btn"
                      onClick={handleSelectOnlyInStock}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <PackageCheck className="w-3 h-3 text-blue-400" />
                      <span>Apenas em Estoque</span>
                    </button>

                    <button
                      type="button"
                      id="menu-deselect-all-btn"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Square className="w-3 h-3 text-rose-400" />
                      <span>Retirar Todos</span>
                    </button>
                  </div>
                </div>

                {/* Filtro de Busca e Categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome do produto..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === 'all'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      Todas ({activeCantina.products.filter(p => p.active).length})
                    </button>
                    {categoriesWithProducts.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {CATEGORY_EMOJIS[cat] || ''} {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista dos Produtos da Cantina com Botões de Acionar / Retirar */}
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {displayProducts.length === 0 ? (
                  <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">
                    Nenhum produto encontrado com os filtros atuais.
                  </div>
                ) : (
                  displayProducts.map((prod) => {
                    const isIncluded = selectedProductIds.has(prod.id);
                    const isOutOfStock = prod.stock <= 0;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleToggleProduct(prod.id)}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer select-none ${
                          isIncluded
                            ? 'bg-emerald-950/30 border-emerald-500/50 hover:border-emerald-400'
                            : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleProduct(prod.id);
                            }}
                            className={`w-5 h-5 rounded flex items-center justify-center transition ${
                              isIncluded
                                ? 'bg-emerald-500 text-slate-950 font-bold'
                                : 'bg-slate-800 border border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold truncate ${isIncluded ? 'text-white' : 'text-slate-400 line-through'}`}>
                                {prod.name}
                              </span>
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                                {CATEGORY_EMOJIS[prod.category] || '🍴'} {prod.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className={`font-medium ${isOutOfStock ? 'text-rose-400' : 'text-slate-400'}`}>
                                {isOutOfStock ? 'Sem estoque' : `Estoque: ${prod.stock} un`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs font-black text-emerald-400 font-mono-num">
                            R$ {prod.salePrice.toFixed(2).replace('.', ',')}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isIncluded
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isIncluded ? 'No Cardápio' : 'Retirado'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: PRÉVIA FORMATADA & CONFIGURAÇÕES DE ENVIO */
            <div className="space-y-3">
              {/* Opções de Formatação */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePixInfo}
                    onChange={e => setIncludePixInfo(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900 border-slate-700"
                  />
                  <span>Incluir chave PIX da cantina</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeWelcomeNote}
                    onChange={e => setIncludeWelcomeNote(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900 border-slate-700"
                  />
                  <span>Mensagem de saudação</span>
                </label>
              </div>

              {/* Destinatário WhatsApp Opcional */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>WhatsApp de Destino ou Grupo Escolar (opcional):</span>
                  <span className="text-[10px] text-slate-500">Deixe em branco para escolher no WhatsApp</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="Ex: 83988887777 ou deixe em branco para enviar a um grupo"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono-num"
                  />
                </div>
              </div>

              {/* Prévia do Texto Formatado */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Mensagem que será enviada:
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {menuSelectedProducts.length} itens inclusos
                  </span>
                </div>
                <pre className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 whitespace-pre-wrap font-mono max-h-56 overflow-y-auto leading-relaxed select-all">
                  {menuText}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Ações Inferior (Botão de Enviar essa lista) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 flex-shrink-0">
          <div className="text-xs text-slate-400">
            <span className="font-bold text-white">{totalSelected}</span> itens selecionados para envio
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>

            <button
              type="button"
              id="menu-copy-btn"
              onClick={handleCopy}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Lista</span>
                </>
              )}
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                id="menu-share-native-btn"
                onClick={handleNativeShare}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartilhar</span>
              </button>
            )}

            {/* BOTÃO PRINCIPAL: ENVIAR ESSA LISTA */}
            <button
              type="button"
              id="menu-send-whatsapp-btn"
              onClick={handleSendWhatsApp}
              disabled={totalSelected === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 cursor-pointer"
              title="Enviar lista dos produtos selecionados via WhatsApp"
            >
              <Send className="w-4 h-4" />
              <span>Enviar essa Lista</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
