import React, { useState, useEffect } from 'react';
import { CantinaProvider, useCantina } from './context/CantinaContext';
import { Header } from './components/Header';
import { PDV } from './components/PDV';
import { CustomerFiados } from './components/CustomerFiados';
import { StockManager } from './components/StockManager';
import { CashFlowReports } from './components/CashFlowReports';
import { BackupSettingsModal } from './components/BackupSettingsModal';
import { MasterControlRoom } from './components/MasterControlRoom';
import { NexoLogo } from './components/NexoLogo';
import { 
  KeyRound, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  User, 
  Store, 
  Mail, 
  CheckCircle2, 
  X, 
  ShieldCheck 
} from 'lucide-react';

const CantinaAppContent: React.FC = () => {
  const { 
    activeTab, 
    activeCantina,
    isAuthenticated, 
    isMasterMode,
    logout,
    smartLogin, 
    enterMasterControlRoom 
  } = useCantina();

  // Smart Login States
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Master Auth Modal State (Triggered by 5 clicks on logo, button, or Alt+M)
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showHiddenMasterModal, setShowHiddenMasterModal] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [masterError, setMasterError] = useState('');

  // Keyboard shortcut listener for Master (Alt+M / Ctrl+Shift+M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'm') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        setShowHiddenMasterModal(true);
        setMasterPasswordInput('');
        setMasterError('');
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
      setShowHiddenMasterModal(true);
      setMasterPasswordInput('');
      setMasterError('');
    }
    setTimeout(() => setLogoClickCount(0), 3000);
  };

  // Submit Smart Login
  const handleSmartLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    setTimeout(() => {
      const res = smartLogin(identifierInput, passwordInput);
      setLoginLoading(false);

      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas. Verifique seu login e senha.');
      }
    }, 400);
  };

  // Master modal submit
  const handleMasterAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = enterMasterControlRoom(masterPasswordInput);
    if (res.success) {
      setShowHiddenMasterModal(false);
      setMasterPasswordInput('');
      setMasterError('');
    } else {
      setMasterError(res.error || 'Senha Master incorreta.');
    }
  };

  // If not logged in, show Clean & Secure Cantina Operator Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-4 font-sans selection:bg-blue-500 selection:text-slate-950">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Logo & Nexo Header (Clickable for discrete Master prompt) */}
          <div className="text-center flex flex-col items-center space-y-2">
            <button
              type="button"
              onClick={handleLogoClick}
              className="focus:outline-none transition active:scale-95 cursor-pointer"
              title="Clique 5 vezes para acesso Master"
            >
              <NexoLogo size={58} />
            </button>

            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
                <span>NEXO</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  CANTINAS
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Plataforma de Gestão, PDV & Vendas a Prazo
              </p>
            </div>
          </div>

          {/* Login Box Header */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center space-y-1">
            <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-cyan-400" />
              <span>Acesso Restrito da Cantina</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Informe suas credenciais fornecidas pelo administrador para acessar o caixa.
            </p>
          </div>

          {/* SMART LOGIN FORM */}
          <form onSubmit={handleSmartLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Usuário, E-mail ou Código da Cantina:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  id="smart-login-identifier"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="Ex: cantinaevoluir ou seu-login"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Senha de Acesso:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  id="smart-login-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Sua senha cadastrada"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono-num"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              id="smart-login-submit-btn"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loginLoading ? 'Verificando credenciais...' : 'Entrar no PDV / Caixa'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Master Admin Notice & Secret Shortcut */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setShowHiddenMasterModal(true)}
              className="text-[11px] text-slate-400 hover:text-cyan-400 transition flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Painel Master Admin</span>
            </button>

            <span className="text-[10px] text-slate-600 font-mono">
              v2.5 • Nexo Cantinas
            </span>
          </div>
        </div>

        {/* Hidden Master Authentication Modal */}
        {showHiddenMasterModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-indigo-500/60 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-extrabold text-sm">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Acesso Master Privado</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHiddenMasterModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Esta área é restrita ao administrador da plataforma. Digite a senha master para cadastrar e gerenciar todas as cantinas.
              </p>

              <form onSubmit={handleMasterAuthSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Senha Master:
                  </label>
                  <input
                    type="password"
                    value={masterPasswordInput}
                    onChange={(e) => setMasterPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />
                </div>

                {masterError && (
                  <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{masterError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowHiddenMasterModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl transition shadow"
                  >
                    Entrar no Master
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If cantina is suspended and not currently operating in Master mode, block access immediately
  if (!isMasterMode && activeCantina?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-rose-600/70 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-bold uppercase tracking-wider">
              Acesso Temporariamente Suspenso
            </span>
            <h2 className="text-xl font-black text-white">
              Cantina Bloqueada pelo Master
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              O acesso ao sistema e ao caixa desta cantina (<strong className="text-slate-200">{activeCantina.name}</strong>) foi bloqueado pelo Administrador Central da plataforma.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1 text-left">
            <div className="font-bold text-slate-300">Motivo:</div>
            <p>Suspensão preventiva ou regularização de cadastro/mensalidade.</p>
            <p className="text-[11px] text-slate-500 pt-1">Caso precise de suporte, entre em contato com a administração da Nexo Cantinas.</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm rounded-xl transition border border-slate-700"
          >
            Voltar para a Tela de Login
          </button>
        </div>
      </div>
    );
  }

  // Logged-in full application layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-slate-950">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 pb-12 sm:pb-6">
        {activeTab === 'pdv' && <PDV />}
        {activeTab === 'fiados' && <CustomerFiados />}
        {activeTab === 'estoque' && <StockManager />}
        {activeTab === 'caixa' && <CashFlowReports />}
        {activeTab === 'backup' && <BackupSettingsModal />}
        {activeTab === 'master' && <MasterControlRoom />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <CantinaProvider>
      <CantinaAppContent />
    </CantinaProvider>
  );
}
