import React, { useState } from 'react';
import { useCantina } from '../context/CantinaContext';
import { NexoLogo } from './NexoLogo';
import { 
  ShieldCheck, 
  Store, 
  Users, 
  DollarSign, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  RotateCcw,
  Sparkles,
  Server,
  TrendingUp,
  CreditCard,
  KeyRound,
  ExternalLink,
  Edit3,
  Calendar,
  X,
  Sliders,
  LogOut,
  Mail,
  User,
  Share2,
  Copy,
  Phone
} from 'lucide-react';

export const MasterControlRoom: React.FC = () => {
  const { 
    cantinas, 
    activeCantinaId, 
    switchCantina, 
    createCantinaTenant, 
    deleteCantinaTenant, 
    updateCantinaStatus, 
    resetCantinaPassword,
    updateCantinaFinancialPlan,
    impersonateCantina,
    updateMasterPassword,
    securityLogs, 
    exitMasterControlRoom,
    resetSystemToZero 
  } = useCantina();

  // Master Password change modal state
  const [showMasterPassModal, setShowMasterPassModal] = useState(false);
  const [currentMasterPassInput, setCurrentMasterPassInput] = useState('');
  const [newMasterPassInput, setNewMasterPassInput] = useState('');
  const [confirmMasterPassInput, setConfirmMasterPassInput] = useState('');
  const [masterPassFeedback, setMasterPassFeedback] = useState<{ isError: boolean; text: string } | null>(null);

  // Create new cantina modal state
  const [showNewCantinaModal, setShowNewCantinaModal] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newCantinaName, setNewCantinaName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLoginUsername, setNewLoginUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [newPixKey, setNewPixKey] = useState('');
  const [newMonthlyFee, setNewMonthlyFee] = useState('149.00');
  const [newDueDay, setNewDueDay] = useState('10');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Password reset modal state
  const [resetModalCantina, setResetModalCantina] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Financial plan edit modal state
  const [planModalCantina, setPlanModalCantina] = useState<any | null>(null);
  const [editMonthlyFee, setEditMonthlyFee] = useState('149.00');
  const [editDueDay, setEditDueDay] = useState('10');
  const [editFeeStatus, setEditFeeStatus] = useState<'paid' | 'pending' | 'overdue'>('paid');

  // Global calculations across all tenants
  const globalTotalSales = cantinas.reduce((sum, c) => {
    return sum + c.sales.reduce((acc, s) => acc + s.totalAmount, 0);
  }, 0);

  const globalTotalCost = cantinas.reduce((sum, c) => {
    return sum + c.sales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  }, 0);

  const globalTotalProfit = globalTotalSales - globalTotalCost;

  const globalReceivables = cantinas.reduce((sum, c) => {
    return sum + c.customers.reduce((acc, cust) => {
      const debt = cust.items.filter(i => !i.paid).reduce((itemSum, item) => itemSum + item.totalPrice, 0);
      return acc + debt;
    }, 0);
  }, 0);

  const globalTotalCustomers = cantinas.reduce((sum, c) => sum + c.customers.length, 0);

  // Monthly revenue for the platform SaaS owner (your recurring income from canteen fees)
  const monthlySaaSRevenue = cantinas.reduce((sum, c) => {
    return sum + (c.monthlyFee !== undefined ? c.monthlyFee : 149.00);
  }, 0);

  const handleCreateCantinaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCantinaName.trim()) return;

    const rawSub = (newLoginUsername.trim() || newCantinaName.trim()).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cleanSubdomain = rawSub.replace(/^_+|_+$/g, '') || `cantina_${Date.now()}`;

    createCantinaTenant({
      schoolName: newSchoolName.trim() || 'Nexo Cantinas',
      name: newCantinaName.trim(),
      ownerName: newOwnerName.trim() || 'Administrador',
      email: newEmail.trim() || `${cleanSubdomain}@nexocantinas.com`,
      loginUsername: (newLoginUsername.trim() || cleanSubdomain).toLowerCase(),
      phone: newPhone.trim(),
      subdomain: cleanSubdomain,
      password: newPassword.trim() || '1234',
      pin: newPassword.trim() || '1234',
      pixKey: newPixKey.trim(),
      monthlyFee: parseFloat(newMonthlyFee) || 149.00,
      monthlyFeeDueDay: parseInt(newDueDay, 10) || 10
    });

    setNewSchoolName('');
    setNewCantinaName('');
    setNewOwnerName('');
    setNewEmail('');
    setNewLoginUsername('');
    setNewPhone('');
    setNewPassword('1234');
    setNewPixKey('');
    setNewMonthlyFee('149.00');
    setNewDueDay('10');
    setShowNewCantinaModal(false);
  };

  const handleCopyCredentials = (cantina: any) => {
    const login = cantina.email || cantina.loginUsername || cantina.subdomain;
    const pass = cantina.password || cantina.pin || '1234';
    const text = `🍽️ *ACESSO AO SISTEMA NEXO CANTINAS*\n\n🏫 *Unidade:* ${cantina.name} (${cantina.schoolName})\n👤 *Usuário / Login:* ${login}\n🔑 *Senha de Acesso:* ${pass}\n\nEntre no sistema e comece suas vendas!`;

    navigator.clipboard.writeText(text);
    setCopyFeedback(`Dados de "${cantina.name}" copiados para a área de transferência!`);
    setTimeout(() => setCopyFeedback(null), 3500);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalCantina || !newPasswordInput.trim()) return;

    const res = resetCantinaPassword(resetModalCantina.id, newPasswordInput.trim());
    if (res.success) {
      setResetFeedback(`Senha redefinida com sucesso para "${newPasswordInput.trim()}"!`);
      setTimeout(() => {
        setResetModalCantina(null);
        setNewPasswordInput('');
        setResetFeedback(null);
      }, 1500);
    }
  };

  const handleUpdatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planModalCantina) return;

    updateCantinaFinancialPlan(
      planModalCantina.id,
      parseFloat(editMonthlyFee) || 0,
      parseInt(editDueDay) || 10,
      editFeeStatus
    );
    setPlanModalCantina(null);
  };

  const handleUpdateMasterPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMasterPassFeedback(null);

    if (newMasterPassInput !== confirmMasterPassInput) {
      setMasterPassFeedback({ isError: true, text: 'A confirmação da nova senha não confere.' });
      return;
    }

    if (newMasterPassInput.length < 4) {
      setMasterPassFeedback({ isError: true, text: 'A nova senha master deve ter pelo menos 4 caracteres.' });
      return;
    }

    const res = updateMasterPassword(currentMasterPassInput, newMasterPassInput);
    if (res.success) {
      setMasterPassFeedback({ isError: false, text: 'Senha Master atualizada com sucesso!' });
      setTimeout(() => {
        setShowMasterPassModal(false);
        setCurrentMasterPassInput('');
        setNewMasterPassInput('');
        setConfirmMasterPassInput('');
        setMasterPassFeedback(null);
      }, 1400);
    } else {
      setMasterPassFeedback({ isError: true, text: res.error || 'Senha master atual incorreta.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-5 space-y-6">
      {/* Master Top Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/50 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <NexoLogo size={48} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Dashboard Executivo Master
              </h2>
              <span className="px-2.5 py-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-[10px] rounded-full uppercase shadow-sm">
                Proprietário Nexo
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Controle global de assinaturas SaaS, rentabilidade das cantinas em tempo real, bloqueios e segurança.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowMasterPassModal(true);
              setCurrentMasterPassInput('');
              setNewMasterPassInput('');
              setConfirmMasterPassInput('');
              setMasterPassFeedback(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 hover:border-amber-400 transition"
            title="Alterar sua Senha Master de Administrador"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Alterar Senha Master</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewCantinaModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adicionar Cantina</span>
          </button>

          <button
            type="button"
            onClick={exitMasterControlRoom}
            className="flex items-center gap-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition"
            title="Sair do modo Master"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair do Master</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Row: YOUR SaaS Monthly Revenue + Network Profit Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Your Recurring Revenue */}
        <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between">
            <span>Sua Receita Mensal (SaaS)</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono-num mt-2">
            R$ {monthlySaaSRevenue.toFixed(2)}
            <span className="text-xs text-slate-400 font-normal"> /mês</span>
          </div>
          <div className="text-[11px] text-cyan-400/90 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{cantinas.length} cantinas pagantes</span>
          </div>
        </div>

        {/* KPI 2: Network Real Profit */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Lucro Líquido das Cantinas</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono-num mt-2">
            R$ {globalTotalProfit.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Volume total faturado: <strong className="text-slate-200">R$ {globalTotalSales.toFixed(2)}</strong>
          </div>
        </div>

        {/* KPI 3: Total Clients / Students */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Alunos & Cadastros Ativos</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono-num mt-2">
            {globalTotalCustomers}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Base acumulada em todas as escolas
          </div>
        </div>

        {/* KPI 4: Pending Fiados Across Network */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Fiados Globais a Receber</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono-num mt-2">
            R$ {globalReceivables.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">
            Crédito concedido por todas as cantinas
          </div>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copyFeedback && (
        <div className="bg-emerald-900/60 border border-emerald-500/80 text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{copyFeedback}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setCopyFeedback(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tenancy Executive Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-cyan-400" />
              <span>Gestão de Cantinas & Rentabilidade ({cantinas.length})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Acompanhe a rentabilidade individual, defina o valor da mensalidade e gerencie o status de acesso de cada cantina.
            </p>
          </div>

          <div className="text-xs text-slate-400 font-semibold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            Status: <span className="text-emerald-400">{cantinas.filter(c => c.status === 'active').length} Ativas</span> • <span className="text-rose-400">{cantinas.filter(c => c.status === 'suspended').length} Bloqueadas</span>
          </div>
        </div>

        {/* Canteen Cards Grid with Financial and Operational Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cantinas.map(cantina => {
            const isActiveTenant = cantina.id === activeCantinaId;
            const isSuspended = cantina.status === 'suspended';

            // Calculate cantina sales & profit
            const cantinaSales = cantina.sales.reduce((acc, s) => acc + s.totalAmount, 0);
            const cantinaCost = cantina.sales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
            const cantinaProfit = cantinaSales - cantinaCost;
            const cantinaDebt = cantina.customers.reduce((acc, cust) => {
              const debt = cust.items.filter(i => !i.paid).reduce((itemSum, item) => itemSum + item.totalPrice, 0);
              return acc + debt;
            }, 0);

            const fee = cantina.monthlyFee !== undefined ? cantina.monthlyFee : 149.00;
            const feeStatus = cantina.monthlyFeeStatus || 'paid';

            return (
              <div
                key={cantina.id}
                className={`bg-slate-900 border rounded-3xl p-5 shadow-xl space-y-4 transition ${
                  isSuspended 
                    ? 'border-rose-900/60 bg-rose-950/10' 
                    : isActiveTenant 
                      ? 'border-cyan-500/70 ring-1 ring-cyan-500/30' 
                      : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header of Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide">
                        {cantina.schoolName}
                      </span>
                      {isSuspended ? (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-extrabold rounded-full border border-rose-500/40">
                          ACESSO BLOQUEADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold rounded-full border border-emerald-500/40">
                          OPERANDO ATIVA
                        </span>
                      )}
                      {isActiveTenant && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-extrabold rounded-full border border-blue-500/40">
                          Sessão Aberta
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-black text-white">
                      {cantina.name}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono-num flex-wrap">
                      <span>Responsável: <strong className="text-slate-200">{cantina.ownerName || 'Não inf.'}</strong></span>
                      <span>•</span>
                      <span>Login: <strong className="text-slate-200">{cantina.email || cantina.loginUsername || cantina.subdomain}</strong></span>
                    </div>
                  </div>

                  {/* Quick Block / Unblock Toggle Button */}
                  <button
                    onClick={() => updateCantinaStatus(cantina.id, isSuspended ? 'active' : 'suspended')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow ${
                      !isSuspended 
                        ? 'bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 hover:bg-rose-950 hover:border-rose-700 hover:text-rose-300' 
                        : 'bg-rose-600 hover:bg-emerald-600 text-white'
                    }`}
                    title={!isSuspended ? 'Clique para Bloquear o acesso da cantina' : 'Clique para Desbloquear o acesso'}
                  >
                    {!isSuspended ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Desbloqueada</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Bloqueada</span>
                      </>
                    )}
                  </button>
                </div>

                {/* SaaS Monthly Fee + Real-time Profit Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 font-mono-num text-xs">
                  {/* Your Monthly Fee */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-cyan-300 font-semibold uppercase block">Sua Mensalidade</span>
                    <span className="font-extrabold text-white text-sm">R$ {fee.toFixed(2)}</span>
                    <div className="flex items-center gap-1 text-[10px]">
                      {feeStatus === 'paid' && <span className="text-emerald-400 font-bold">● Em dia</span>}
                      {feeStatus === 'pending' && <span className="text-amber-400 font-bold">● Pendente</span>}
                      {feeStatus === 'overdue' && <span className="text-rose-400 font-bold">● Atrasada</span>}
                    </div>
                  </div>

                  {/* Cantina's Real Net Profit */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase block">Lucro da Cantina</span>
                    <span className="font-extrabold text-emerald-400 text-sm">R$ {cantinaProfit.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block">Vendas: R$ {cantinaSales.toFixed(2)}</span>
                  </div>

                  {/* Fiados at this canteen */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase block">Fiados Pendentes</span>
                    <span className="font-extrabold text-amber-400 text-sm">R$ {cantinaDebt.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block">{cantina.customers.length} alunos</span>
                  </div>

                  {/* Products / Stock */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase block">Catálogo</span>
                    <span className="font-extrabold text-slate-200 text-sm">{cantina.products.length} itens</span>
                    <span className="text-[10px] text-slate-500 block">{cantina.sales.length} vendas reg.</span>
                  </div>
                </div>

                {/* Master Actions Toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Impersonate / Support Mode Button */}
                    <button
                      type="button"
                      onClick={() => impersonateCantina(cantina.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
                      title="Entrar no PDV e sistema desta cantina para prestar suporte"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Entrar no PDV</span>
                    </button>

                    {/* Copy Credentials Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(cantina)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-xl text-xs font-bold transition shadow"
                      title="Copiar dados de acesso (usuário e senha) para enviar ao responsável"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copiar Acesso</span>
                    </button>

                    {/* Reset Password Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setResetModalCantina(cantina);
                        setNewPasswordInput(cantina.password || cantina.pin || '');
                        setResetFeedback(null);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                      title="Redefinir a senha do responsável da cantina"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Redefinir Senha</span>
                    </button>

                    {/* Adjust Monthly Fee Plan Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setPlanModalCantina(cantina);
                        setEditMonthlyFee((cantina.monthlyFee !== undefined ? cantina.monthlyFee : 149.00).toString());
                        setEditDueDay((cantina.monthlyFeeDueDay || 10).toString());
                        setEditFeeStatus(cantina.monthlyFeeStatus || 'paid');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                      title="Ajustar valor da mensalidade e vencimento"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Ajustar Plano</span>
                    </button>
                  </div>

                  {cantinas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Atenção Master: Deseja realmente excluir a cantina "${cantina.name}" e todo seu histórico de forma irreversível?`)) {
                          deleteCantinaTenant(cantina.id);
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition"
                      title="Excluir Cantina Permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Audit Logs Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-2xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base">
                Auditoria de Segurança & Acessos em Tempo Real
              </h3>
              <p className="text-xs text-slate-400">
                Monitoramento contínuo de tentativas de login, bloqueios e acessos administrativos.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-xl text-xs font-mono-num font-semibold">
            {securityLogs.length} eventos registrados
          </span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
          {securityLogs.map(log => (
            <div 
              key={log.id}
              className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs"
            >
              <div className="flex items-center gap-3">
                {log.status === 'sucesso' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                {log.status === 'alerta' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                {log.status === 'bloqueado' && <Lock className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                
                <div>
                  <div className="font-semibold text-slate-200">{log.action}</div>
                  <div className="text-[11px] text-slate-500">
                    Cantina: <strong className="text-slate-400">{log.cantinaName}</strong>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono-num text-[11px] text-slate-400">
                {log.timestamp.split('T')[1]?.substring(0, 8) || log.timestamp}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Reset Cantina Password */}
      {resetModalCantina && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">Redefinir Senha da Cantina</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModalCantina(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300">
              <p>Cantina: <strong className="text-white">{resetModalCantina.name}</strong></p>
              <p>Responsável: <strong className="text-white">{resetModalCantina.ownerName || 'Administrador'}</strong></p>
              <p>E-mail / Login: <strong className="text-cyan-400">{resetModalCantina.email || resetModalCantina.loginUsername}</strong></p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nova Senha de Acesso:
                </label>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Digite a nova senha ou PIN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                  required
                  autoFocus
                />
              </div>

              {resetFeedback && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{resetFeedback}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalCantina(null)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl transition shadow"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Monthly Fee Plan */}
      {planModalCantina && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-black text-white">Ajustar Plano & Mensalidade</h3>
              </div>
              <button
                type="button"
                onClick={() => setPlanModalCantina(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ajuste o valor que você cobra mensalmente da cantina <strong>{planModalCantina.name}</strong> pelo uso da plataforma Nexo.
            </p>

            <form onSubmit={handleUpdatePlanSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor da Mensalidade (R$):
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editMonthlyFee}
                    onChange={(e) => setEditMonthlyFee(e.target.value)}
                    placeholder="149.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-400 font-mono-num font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dia de Vencimento:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status do Pagamento:
                  </label>
                  <select
                    value={editFeeStatus}
                    onChange={(e) => setEditFeeStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 font-semibold"
                  >
                    <option value="paid">Em Dia (Pago)</option>
                    <option value="pending">Pendente</option>
                    <option value="overdue">Atrasado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanModalCantina(null)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition shadow"
                >
                  Atualizar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Cantina */}
      {showNewCantinaModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-blue-500/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">Criar Nova Unidade de Cantina</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCantinaModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCantinaSubmit} className="space-y-3.5 max-h-[80vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Cantina: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCantinaName}
                    onChange={(e) => {
                      setNewCantinaName(e.target.value);
                      if (!newLoginUsername) {
                        setNewLoginUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }
                    }}
                    placeholder="Ex: Cantina Saber & Sabor"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Escola / Instituição: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="Ex: Colégio Evoluir"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Responsável / Operador:
                  </label>
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp / Telefone:
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Ex: 83999998888"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Credenciais de Acesso da Cantina</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Usuário / E-mail de Login: <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLoginUsername}
                      onChange={(e) => setNewLoginUsername(e.target.value)}
                      placeholder="Ex: cantinasaber ou carlos@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Senha de Acesso: <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ex: 1234 ou senha forte"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mensalidade SaaS (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMonthlyFee}
                    onChange={(e) => setNewMonthlyFee(e.target.value)}
                    placeholder="149.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dia de Vencimento:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newDueDay}
                    onChange={(e) => setNewDueDay(e.target.value)}
                    placeholder="10"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chave PIX da Cantina (Opcional):
                </label>
                <input
                  type="text"
                  value={newPixKey}
                  onChange={(e) => setNewPixKey(e.target.value)}
                  placeholder="Chave para recebimentos de PIX no PDV"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono-num"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCantinaModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl transition shadow"
                >
                  Cadastrar e Liberar Cantina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Master Administrator Password */}
      {showMasterPassModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Alterar Senha Master</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterPassModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Esta é a senha suprema de administrador da plataforma Nexo. Com ela você cadastra cantinas, redefine senhas e gerencia o sistema.
            </p>

            <form onSubmit={handleUpdateMasterPasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha Master Atual: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={currentMasterPassInput}
                  onChange={(e) => setCurrentMasterPassInput(e.target.value)}
                  placeholder="Sua senha master atual"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nova Senha Master: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={newMasterPassInput}
                  onChange={(e) => setNewMasterPassInput(e.target.value)}
                  placeholder="Crie sua nova senha segura"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirmar Nova Senha Master: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={confirmMasterPassInput}
                  onChange={(e) => setConfirmMasterPassInput(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  required
                />
              </div>

              {masterPassFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  masterPassFeedback.isError 
                    ? 'bg-rose-950/60 border border-rose-800 text-rose-300' 
                    : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                }`}>
                  {masterPassFeedback.isError ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{masterPassFeedback.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMasterPassModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition shadow"
                >
                  Salvar Nova Senha Master
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
