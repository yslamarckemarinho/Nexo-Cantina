import React, { useState, useEffect } from 'react';
import { useCantina } from '../context/CantinaContext';
import { NexoLogo } from './NexoLogo';
import { 
  ShoppingCart, 
  Wallet, 
  Package, 
  Users, 
  Download, 
  ShieldCheck, 
  Search, 
  LogOut, 
  ChevronDown,
  Building2,
  Lock,
  UserCheck,
  AlertCircle,
  X,
  Edit2,
  Check
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    cantinas, 
    activeCantina, 
    activeTab, 
    setActiveTab, 
    operatorName, 
    isGoogleAuth, 
    isMasterMode, 
    logout, 
    switchCantina,
    updateCurrentOperator,
    enterMasterControlRoom,
    exitMasterControlRoom
  } = useCantina();

  const [showCantinaSwitcher, setShowCantinaSwitcher] = useState(false);
  const [showSecretMasterModal, setShowSecretMasterModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [newOperatorInput, setNewOperatorInput] = useState('');
  const [secretPasswordInput, setSecretPasswordInput] = useState('');
  const [secretError, setSecretError] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Discreet keyboard shortcut: Alt + M or Ctrl + Shift + M
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'm') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        setShowSecretMasterModal(true);
        setSecretPasswordInput('');
        setSecretError('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      setLogoClickCount(0);
      setShowSecretMasterModal(true);
      setSecretPasswordInput('');
      setSecretError('');
    }
    // reset click count after 3 seconds
    setTimeout(() => setLogoClickCount(0), 3000);
  };

  const handleSecretMasterAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const res = enterMasterControlRoom(secretPasswordInput);
    if (res.success) {
      setShowSecretMasterModal(false);
      setSecretPasswordInput('');
      setSecretError('');
    } else {
      setSecretError(res.error || 'Senha incorreta.');
    }
  };

  const handleOperatorChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOperatorInput.trim()) {
      updateCurrentOperator(newOperatorInput.trim());
      setShowOperatorModal(false);
      setNewOperatorInput('');
    }
  };

  return (
    <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      {/* Master Mode Global Notification Bar (Only visible when Master Admin is active) */}
      {isMasterMode && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 px-3 py-1.5 text-xs text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 font-black tracking-wide">
            <ShieldCheck className="w-4 h-4 text-cyan-200 animate-pulse" />
            <span>MODO ADMINISTRADOR MASTER ATIVO</span>
            <span className="hidden sm:inline bg-black/20 px-2 py-0.5 rounded text-[10px] font-mono">
              Visualizando: {activeCantina?.name || 'Geral'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Master Cantina Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowCantinaSwitcher(!showCantinaSwitcher)}
                className="flex items-center gap-1 px-2.5 py-0.5 bg-black/30 hover:bg-black/40 text-white rounded text-xs transition border border-white/20 font-bold"
              >
                <Building2 className="w-3 h-3 text-cyan-300" />
                <span>Trocar Cantina ({cantinas.length})</span>
                <ChevronDown className="w-3 h-3 text-white/80" />
              </button>

              {showCantinaSwitcher && (
                <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-slate-200">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Alternar Contexto de Cantina ({cantinas.length})
                  </div>
                  {cantinas.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        switchCantina(c.id);
                        setShowCantinaSwitcher(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition ${
                        c.id === activeCantina?.id ? 'text-cyan-400 font-bold bg-slate-800/60' : 'text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.schoolName}</div>
                      </div>
                      {c.id === activeCantina?.id && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-bold">
                          Ativa
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={exitMasterControlRoom}
              className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs transition shadow"
            >
              Sair do Master
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        {/* Top brand line */}
        <div className="flex items-center justify-between py-2.5 border-b border-slate-800/80 text-xs sm:text-sm">
          {/* Active cantina & Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              {activeCantina?.logoUrl ? (
                <div 
                  onClick={handleLogoClick}
                  className="w-9 h-9 rounded-xl overflow-hidden border border-indigo-500/50 bg-slate-800 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition"
                  title="Clique 5 vezes para acesso Master"
                >
                  <img 
                    src={activeCantina.logoUrl} 
                    alt={activeCantina.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLogoClick}
                  title="Clique 5 vezes para acesso Master"
                  className="focus:outline-none transition active:scale-95"
                >
                  <NexoLogo size={32} />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 font-bold text-white tracking-tight">
                <span className="text-sm sm:text-base font-extrabold">{activeCantina?.name || 'Nexo Cantinas'}</span>
                {activeCantina?.status === 'active' ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title={activeCantina?.status} />
                )}
              </div>
              <p className="text-[11px] text-blue-400/90 font-medium">
                {activeCantina?.schoolName || 'Unidade Principal'} {activeCantina?.instagramHandle ? `• ${activeCantina.instagramHandle}` : ''}
              </p>
            </div>
          </div>

          {/* User info & Operator change & Logout */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewOperatorInput(operatorName || activeCantina?.operatorName || '');
                setShowOperatorModal(true);
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1 rounded-xl border border-slate-700/80 text-slate-300 text-xs transition active:scale-95 group"
              title="Clique para alterar o nome de quem está operando o caixa"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300" />
              <span className="font-semibold text-slate-200">
                {isMasterMode ? 'Administrador Master' : (operatorName || 'Operador')}
              </span>
              {!isMasterMode && (
                <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-60 group-hover:opacity-100" />
              )}
              {isMasterMode && (
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-black">
                  MASTER
                </span>
              )}
              {!isMasterMode && isGoogleAuth && (
                <span className="bg-blue-900/60 text-blue-300 text-[10px] px-1.5 py-0.2 rounded border border-blue-700/50 font-semibold">Google</span>
              )}
            </button>

            <button
              id="header-logout-btn"
              onClick={isMasterMode ? exitMasterControlRoom : logout}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 rounded-xl transition border border-slate-700 text-xs font-semibold"
              title={isMasterMode ? "Sair da conta Master" : "Trocar operador ou sair da cantina"}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMasterMode ? 'Sair do Master' : 'Sair'}</span>
            </button>
          </div>
        </div>

        {/* Main Navigation Tab Bar */}
        <nav className="flex items-center gap-1 py-1.5 overflow-x-auto no-scrollbar text-xs sm:text-sm font-medium">
          {/* If In Master Mode: ONLY show the Master Executive Dashboard (clean, zero clutter) */}
          {isMasterMode ? (
            <div className="w-full flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <button
                  id="tab-master"
                  onClick={() => setActiveTab('master')}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-black text-xs rounded-xl shadow-md"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Painel Executivo Master & Gestão SaaS</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="hidden md:inline text-[11px] text-slate-400">
                  Visão restrita de infraestrutura, faturamento e controle de cantinas
                </span>
              </div>
            </div>
          ) : (
            <>
              <button
                id="tab-pdv"
                onClick={() => setActiveTab('pdv')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'pdv'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Frente de Caixa (PDV)</span>
              </button>

              <button
                id="tab-fiados"
                onClick={() => setActiveTab('fiados')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'fiados'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Alunos & A Prazo</span>
                {activeCantina && activeCantina.customers.length > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-slate-900/80 rounded-full font-mono font-bold text-slate-200">
                    {activeCantina.customers.length}
                  </span>
                )}
              </button>

              <button
                id="tab-estoque"
                onClick={() => setActiveTab('estoque')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'estoque'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Produtos & Estoque</span>
              </button>

              <button
                id="tab-caixa"
                onClick={() => setActiveTab('caixa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'caixa'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Caixa & Fechamento</span>
              </button>

              <button
                id="tab-backup"
                onClick={() => setActiveTab('backup')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'backup'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Configurações & Perfil</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Quick Operator Switch Modal */}
      {showOperatorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Trocar Operador do Caixa</span>
              </div>
              <button
                type="button"
                onClick={() => setShowOperatorModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Digite o nome de quem está assumindo o caixa agora na cantina <strong>{activeCantina?.name}</strong>:
            </p>

            <form onSubmit={handleOperatorChangeSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={newOperatorInput}
                  onChange={(e) => setNewOperatorInput(e.target.value)}
                  placeholder="Ex: Carlos Silva ou Caixa 2"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 font-semibold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowOperatorModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar Operador</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Master Auth Modal */}
      {showSecretMasterModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Autenticação Master Restrita</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSecretMasterModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Digite sua senha de segurança master para acessar a Sala de Controle Global.
            </p>

            <form onSubmit={handleSecretMasterAuth} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha Master:
                </label>
                <input
                  type="password"
                  value={secretPasswordInput}
                  onChange={(e) => setSecretPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                  required
                />
              </div>

              {secretError && (
                <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{secretError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSecretMasterModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl transition shadow"
                >
                  Acessar Painel Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
