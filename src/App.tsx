import React, { useState, useEffect } from 'react';
import { CantinaProvider, useCantina } from './context/CantinaContext';
import { Header } from './components/Header';
import { PDV } from './components/PDV';
import { CustomerFiados } from './components/CustomerFiados';
import { StockManager } from './components/StockManager';
import { CashFlowReports } from './components/CashFlowReports';
import { BackupSettingsModal } from './components/BackupSettingsModal';
import { StudentPortal } from './components/StudentPortal';
import { MasterControlRoom } from './components/MasterControlRoom';
import { NexoLogo } from './components/NexoLogo';
import { 
  KeyRound, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  GraduationCap,
  AlertCircle,
  User,
  Store,
  School,
  Mail,
  Phone,
  CheckCircle2,
  X,
  CreditCard
} from 'lucide-react';

const CantinaAppContent: React.FC = () => {
  const { 
    activeTab, 
    activeCantina, 
    isAuthenticated, 
    smartLogin, 
    registerCantina,
    loginWithGoogle,
    enterMasterControlRoom,
    setActiveTab
  } = useCantina();

  // Auth screen mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Smart Login States
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Registration States
  const [regSchoolName, setRegSchoolName] = useState('');
  const [regCantinaName, setRegCantinaName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPixKey, setRegPixKey] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Google Login Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('yslamarck@gmail.com');
  const [googleNameInput, setGoogleNameInput] = useState('Yslamarck');

  // Hidden Master Trigger (5 clicks on logo or Alt+M / Ctrl+Shift+M)
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showHiddenMasterModal, setShowHiddenMasterModal] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [masterError, setMasterError] = useState('');

  // Keyboard shortcut listener for Master
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
        setLoginError(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    }, 400);
  };

  // Submit Self-Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regCantinaName.trim()) {
      setRegError('Por favor, informe o nome da cantina.');
      return;
    }
    if (!regSchoolName.trim()) {
      setRegError('Por favor, informe o nome da escola ou instituição.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Por favor, informe um e-mail de acesso válido.');
      return;
    }
    if (regPassword.length < 3) {
      setRegError('A senha deve ter no mínimo 3 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('As senhas digitadas não coincidem.');
      return;
    }

    setRegLoading(true);

    setTimeout(() => {
      const res = registerCantina({
        name: regCantinaName.trim(),
        schoolName: regSchoolName.trim(),
        ownerName: regOwnerName.trim() || 'Administrador',
        email: regEmail.trim(),
        loginUsername: regEmail.split('@')[0],
        password: regPassword.trim(),
        phone: regPhone.trim(),
        pixKey: regPixKey.trim(),
        pixReceiverName: regOwnerName.trim() || regCantinaName.trim()
      });

      setRegLoading(false);

      if (!res.success) {
        setRegError(res.error || 'Não foi possível cadastrar a cantina.');
      }
    }, 400);
  };

  // Google Login confirm
  const handleGoogleLoginConfirm = () => {
    if (!googleEmailInput.trim()) return;
    const res = loginWithGoogle(googleEmailInput.trim(), googleNameInput.trim());
    if (res.success) {
      setShowGoogleModal(false);
    }
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

  // If user is accessing Student Portal from public, show portal directly
  if (activeTab === 'portal_aluno' && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <NexoLogo size={36} showText />

          <button
            onClick={() => setActiveTab('pdv')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            Área do Operador (Login)
          </button>
        </header>

        <main className="flex-1 p-2 sm:p-4">
          <StudentPortal />
        </main>
      </div>
    );
  }

  // If not logged in, show Auth screen (Smart Login or Self-Registration)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-4 font-sans selection:bg-blue-500 selection:text-slate-950">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Logo & Nexo Header (Clickable for discrete Master prompt) */}
          <div className="text-center flex flex-col items-center space-y-2">
            <button
              type="button"
              onClick={handleLogoClick}
              className="focus:outline-none transition active:scale-95 cursor-pointer"
              title="Nexo Cantinas"
            >
              <NexoLogo size={60} />
            </button>

            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
                <span>NEXO</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  CANTINAS
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Plataforma Inteligente de Gestão, PDV Rápido & Fiados
              </p>
            </div>
          </div>

          {/* Navigation Toggle between [Entrar] and [Cadastrar Cantina] */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setAuthMode('login');
                setLoginError(null);
              }}
              className={`py-2.5 rounded-xl transition ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Acessar Minha Cantina
            </button>
            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setAuthMode('register');
                setRegError(null);
              }}
              className={`py-2.5 rounded-xl transition ${
                authMode === 'register'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cadastrar Nova Cantina
            </button>
          </div>

          {/* MODE 1: SMART LOGIN (No dropdown selector needed) */}
          {authMode === 'login' && (
            <form onSubmit={handleSmartLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  E-mail, Usuário ou Identificador da Cantina:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    id="smart-login-identifier"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    placeholder="Ex: seu-email@gmail.com ou cantinasaber"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Senha ou PIN de Acesso:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    id="smart-login-password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Sua senha de acesso"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono-num"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
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
                <span>{loginLoading ? 'Identificando cantina...' : 'Entrar no PDV / Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  ou
                </span>
                <div className="border-t border-slate-800 w-full" />
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                id="google-signin-btn"
                onClick={() => setShowGoogleModal(true)}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2.5 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continuar com o Google</span>
              </button>
            </form>
          )}

          {/* MODE 2: SELF-REGISTRATION FOR NEW CANTEEN */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-2xl text-xs text-blue-300">
                <span className="font-bold flex items-center gap-1.5 text-cyan-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Ambiente Exclusivo & Isolado
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sua cantina terá controle próprio de estoque, frente de caixa e fiados sem cruzamento de dados com outras unidades.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Cantina: <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      id="reg-cantina-name"
                      value={regCantinaName}
                      onChange={(e) => setRegCantinaName(e.target.value)}
                      placeholder="Ex: Cantina Saber & Sabor"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Escola / Instituição: <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      id="reg-school-name"
                      value={regSchoolName}
                      onChange={(e) => setRegSchoolName(e.target.value)}
                      placeholder="Ex: Colégio Evoluir"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Seu Nome (Responsável):
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      id="reg-owner-name"
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail de Login: <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="email"
                      id="reg-email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu-email@gmail.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Criar Senha de Acesso: <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="password"
                      id="reg-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 3 dígitos"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirmar Senha: <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="password"
                      id="reg-confirm-password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chave PIX da Cantina (Opcional):
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      id="reg-pix-key"
                      value={regPixKey}
                      onChange={(e) => setRegPixKey(e.target.value)}
                      placeholder="Chave PIX para comprovantes"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp / Telefone:
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="tel"
                      id="reg-phone"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Ex: (83) 99999-0000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {regError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                id="reg-submit-btn"
                disabled={regLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
              >
                <span>{regLoading ? 'Criando espaço da cantina...' : 'Cadastrar Cantina & Começar Agora'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Footer Portal Links */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setActiveTab('portal_aluno')}
              className="hover:text-cyan-300 transition flex items-center gap-1.5"
            >
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>Portal do Aluno (Consultar Débito)</span>
            </button>

            {/* Discrete hidden trigger indicator on copyright */}
            <span
              onClick={handleLogoClick}
              className="text-[10px] text-slate-600 select-none hover:text-slate-500 cursor-default"
              title="Nexo Cantinas Platform"
            >
              © Nexo Cantinas
            </span>
          </div>
        </div>

        {/* Google Authentication Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <h3 className="text-sm font-bold text-white">Login com Conta Google</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                O sistema identificará ou criará automaticamente o ambiente da sua cantina vinculado à sua conta Google.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail da sua Conta Google:
                  </label>
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Titular:
                  </label>
                  <input
                    type="text"
                    value={googleNameInput}
                    onChange={(e) => setGoogleNameInput(e.target.value)}
                    placeholder="Seu Nome"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGoogleLoginConfirm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow"
                >
                  Confirmar e Entrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Master Authentication Modal (Triggered by 5-clicks on logo or Alt+M) */}
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
                Esta área é restrita ao administrador da plataforma. Digite a senha master de acesso.
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
        {activeTab === 'portal_aluno' && <StudentPortal />}
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
