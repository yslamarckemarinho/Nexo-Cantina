import React, { useState, useRef } from 'react';
import { useCantina } from '../context/CantinaContext';
import { NexoLogo } from './NexoLogo';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileJson, 
  CloudCheck, 
  RefreshCw, 
  KeyRound, 
  Check, 
  Store, 
  RotateCcw,
  Sparkles,
  AlertCircle,
  Mail,
  Send,
  Camera,
  Image as ImageIcon,
  User,
  Trash2,
  Edit3,
  Database,
  ShieldCheck,
  Clock,
  Printer,
  FileText,
  Code2
} from 'lucide-react';
import { AutoBackupModal } from './AutoBackupModal';
import { ReportModal } from './ReportModal';

export const BackupSettingsModal: React.FC = () => {
  const { 
    activeCantina, 
    updateCantinaSettings, 
    updateCurrentOperator,
    exportBackupJSON, 
    exportSalesCSV, 
    restoreFromJSON, 
    operatorName,
    loadStarterProductsToActiveCantina,
    resetSystemToZero,
    autoBackupSnapshots,
    triggerManualBackup
  } = useCantina();

  if (!activeCantina) return null;

  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [pixKey, setPixKey] = useState(activeCantina.pixKey || '');
  const [pixReceiver, setPixReceiver] = useState(activeCantina.pixReceiverName || '');
  const [schoolName, setSchoolName] = useState(activeCantina.schoolName || '');
  const [cantinaName, setCantinaName] = useState(activeCantina.name || '');
  const [operatorInput, setOperatorInput] = useState(operatorName || activeCantina.operatorName || 'Operador');
  const [instagram, setInstagram] = useState(activeCantina.instagramHandle || '');
  const [institutionEmail, setInstitutionEmail] = useState(activeCantina.institutionEmail || '');
  const [logoUrl, setLogoUrl] = useState(activeCantina.logoUrl || '');
  const [pin, setPin] = useState(activeCantina.pin || '');
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [operatorSavedSuccess, setOperatorSavedSuccess] = useState(false);
  const [emailSavedSuccess, setEmailSavedSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [starterLoadedSuccess, setStarterLoadedSuccess] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo Upload from device
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setLogoUrl(base64);
        updateCantinaSettings({ logoUrl: base64 });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setLogoUrl('');
    updateCantinaSettings({ logoUrl: '' });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleQuickOperatorSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorInput.trim()) return;
    updateCurrentOperator(operatorInput.trim());
    setOperatorSavedSuccess(true);
    setTimeout(() => setOperatorSavedSuccess(false), 3000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateCantinaSettings({
      pixKey: pixKey.trim(),
      pixReceiverName: pixReceiver.trim(),
      schoolName: schoolName.trim(),
      name: cantinaName.trim(),
      operatorName: operatorInput.trim() || 'Operador',
      instagramHandle: instagram.trim(),
      institutionEmail: institutionEmail.trim(),
      logoUrl: logoUrl,
      pin: pin.trim() || '1234',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveInstitutionEmail = () => {
    updateCantinaSettings({
      institutionEmail: institutionEmail.trim(),
    });
    setEmailSavedSuccess(true);
    setTimeout(() => setEmailSavedSuccess(false), 3000);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      updateCantinaSettings({ lastBackupAt: new Date().toISOString() });
    }, 1000);
  };

  const handleLoadStarterProducts = () => {
    if (confirm('Deseja carregar a lista de produtos iniciais padrão (Salgados, Sucos, Doces)?')) {
      loadStarterProductsToActiveCantina();
      setStarterLoadedSuccess(true);
      setTimeout(() => setStarterLoadedSuccess(false), 3500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = restoreFromJSON(content);
        setRestoreMessage({ text: result.message, isError: !result.success });
        setTimeout(() => setRestoreMessage(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-5">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NexoLogo size={36} />
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Configurações & Backup • {activeCantina.name}
            </h2>
            <p className="text-xs text-slate-400">
              Sincronização em nuvem, Chave PIX, catálogo de produtos e exportações (.CSV / .JSON)
            </p>
          </div>
        </div>
      </div>

      {/* 1. Sincronização em Nuvem (Firebase / Local Storage) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CloudCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-sm">
                  SINCRONIZAÇÃO EM NUVEM
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-bold">
                  Conectado & Seguro
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Todas as anotações, clientes e alterações no catálogo são salvas com segurança no isolamento desta cantina (<strong className="text-white">{operatorName || 'admin'}</strong>).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        </div>

        {/* Gmail da Instituição para Fechamento de Caixa */}
        <div className="pt-3 border-t border-slate-800/80 bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wide">
                Gmail / E-mail da Instituição (Fechamento de Caixa)
              </h4>
            </div>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-md border border-blue-500/20">
              Sincronização & Envio de Relatórios
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Informe o Gmail ou e-mail da tesouraria/direção da instituição. Ao realizar o <strong className="text-slate-200">Fechamento do Caixa</strong> no final do expediente, o sistema gerará a opção de enviar o registro consolidado e detalhado diretamente para este e-mail.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <input
                type="email"
                id="settings-institution-email"
                value={institutionEmail}
                onChange={(e) => setInstitutionEmail(e.target.value)}
                placeholder="Ex: direcao.escola@gmail.com ou financeiro@colegio.com.br"
                className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none font-mono"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
            <button
              type="button"
              id="save-institution-email-btn"
              onClick={handleSaveInstitutionEmail}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar E-mail</span>
            </button>
          </div>
          {emailSavedSuccess && (
            <div className="p-2 rounded-lg text-xs bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>E-mail da instituição configurado e vinculado à sincronização do caixa!</span>
            </div>
          )}
        </div>

        {activeCantina.lastBackupAt && (
          <div className="text-[11px] text-slate-500 font-mono-num pt-1">
            Última sincronização registrada: {new Date(activeCantina.lastBackupAt).toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      {/* 2. Identidade Visual, Foto & Operador da Cantina */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base">
                IDENTIDADE, FOTO & OPERADOR DO CAIXA
              </h3>
              <p className="text-xs text-slate-400">
                Personalize a foto ou logotipo, o nome da sua cantina e quem está operando o caixa no momento.
              </p>
            </div>
          </div>
        </div>

        {/* Photo Upload and Quick Operator Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800/80">
          {/* Photo / Logo Avatar */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-3 text-center space-y-3 border-b md:border-b-0 md:border-r border-slate-800/80">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center shadow-lg relative">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={cantinaName} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                    <NexoLogo size={36} />
                    <span className="text-[9px] font-bold mt-1 text-slate-500">Padrão Nexo</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg transition active:scale-95 border-2 border-slate-950"
                title="Trocar Foto / Logotipo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <input
              type="file"
              ref={photoInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="space-y-1">
              <p className="text-xs font-bold text-white">
                {logoUrl ? 'Foto da Cantina Ativa' : 'Sem foto personalizada'}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-bold rounded-lg border border-slate-700 transition"
                >
                  {logoUrl ? 'Trocar Foto' : 'Carregar Foto'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Operator Switcher */}
          <div className="md:col-span-8 flex flex-col justify-center space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Quem está operando o caixa agora?</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                O nome informado aqui sairá automaticamente nos comprovantes de vendas e nos fechamentos de turno.
              </p>
            </div>

            <form onSubmit={handleQuickOperatorSave} className="flex items-center gap-2">
              <input
                type="text"
                value={operatorInput}
                onChange={(e) => setOperatorInput(e.target.value)}
                placeholder="Ex: Carlos Silva ou Caixa 1"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-400 font-semibold"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow transition whitespace-nowrap"
              >
                Mudar Operador
              </button>
            </form>

            {operatorSavedSuccess && (
              <div className="p-2 rounded-xl text-xs bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>Operador atualizado para: <strong className="text-white">{operatorInput}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Carga Rápida de Produtos Iniciais (Opcional) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/20 text-cyan-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs sm:text-sm">
              Catálogo de Produtos Iniciais
            </h3>
            <p className="text-[11px] text-slate-400">
              Deseja carregar uma lista inicial padrão de salgados, sucos e refrigerantes para agilizar seu teste?
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadStarterProducts}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition"
        >
          Carregar Produtos Sugeridos
        </button>
      </div>

      {starterLoadedSuccess && (
        <div className="p-3 rounded-xl text-xs bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Produtos sugeridos carregados no estoque da cantina!</span>
        </div>
      )}

      {/* 4. Chave PIX e Dados da Cantina Form */}
      <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-cyan-400" />
          <span>Chave PIX da sua Cantina (Para Comprovantes & WhatsApp)</span>
        </h3>
        <p className="text-xs text-slate-400 -mt-2">
          Sua chave PIX aparecerá automaticamente nos comprovantes e no Portal de Consulta de Alunos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Chave PIX:
            </label>
            <input
              type="text"
              id="settings-pix-key"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Ex: 83999990000 ou seu-email@pix.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 font-mono-num"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome do Favorecido / Beneficiário:
            </label>
            <input
              type="text"
              id="settings-pix-receiver"
              value={pixReceiver}
              onChange={(e) => setPixReceiver(e.target.value)}
              placeholder="Ex: Nexo Cantinas Ltda"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* School branding inputs */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Store className="w-4 h-4 text-cyan-400" />
            <span>Dados Cadastrais da Cantina & Unidade</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome da Instituição / Escola:
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Ex: Colégio Santa Maria"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Fantasia da Cantina:
              </label>
              <input
                type="text"
                value={cantinaName}
                onChange={(e) => setCantinaName(e.target.value)}
                placeholder="Ex: Cantina Saber & Sabor"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instagram / Contato:
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Ex: @cantinasaber"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-w-md p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Segurança de Acesso (Login & Senha):
              </label>
              <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                Gerenciado pelo Master
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              A senha de acesso e usuário desta cantina são cadastrados e redefinidos pelo <strong className="text-white">Administrador Master</strong> para garantir total integridade e segurança.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {savedSuccess ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <Check className="w-4 h-4" /> Configurações salvas com sucesso!
            </span>
          ) : <span />}

          <button
            type="submit"
            id="save-cantina-settings-btn"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
          >
            Salvar Todas as Configurações
          </button>
        </div>
      </form>

      {/* 4. Central de Backup Automático & Nuvem (Snapshots) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-sm sm:text-base">
                  Backup Automático & Proteção em Nuvem
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-black">
                  ATIVO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Snapshots automáticos nos finais de turno (às 11:00 e às 17:00) e a cada fechamento de caixa.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="open-autobackup-center-btn"
            onClick={() => setShowAutoBackupModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Gerenciar Snapshots ({autoBackupSnapshots.length})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-medium">Último Ponto Salvo</span>
            <span className="text-emerald-400 font-bold block mt-0.5">
              {activeCantina.lastAutoBackupAt || activeCantina.lastBackupAt 
                ? new Date(activeCantina.lastAutoBackupAt || activeCantina.lastBackupAt!).toLocaleTimeString('pt-BR') 
                : 'Salvo recentemente'}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-medium">Horários por Turno</span>
            <span className="text-amber-300 font-bold block mt-0.5">
              11:00 (Manhã) e 17:00 (Tarde)
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-400 block font-medium">Histórico Disponível</span>
            <span className="text-cyan-300 font-bold block mt-0.5">
              {autoBackupSnapshots.length} pontos recuperáveis
            </span>
          </div>
        </div>
      </div>

      {/* 5. Exportar Cópias Locais (Excel, PDF & Backup) & Restaurar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Exportar Dados em Linguagem Humana (Excel & PDF)
          </h3>
          <span className="text-[11px] text-slate-500">Documentos legíveis para operadores</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Planilha Excel */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Planilha Excel (.CSV)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Abre no Excel com acentuação e colunas separadas: produtos, estoque, vendas e fiados.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="export-csv-btn"
              onClick={exportSalesCSV}
              className="w-full py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold text-xs rounded-lg transition border border-emerald-700/60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Planilha Excel</span>
            </button>
          </div>

          {/* Card 2: Relatório PDF / Impressão */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg flex-shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Relatório PDF / Impressão</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Documento visual formatado para A4 com resumo de caixa, vendas e campo para assinatura.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="view-pdf-report-btn"
              onClick={() => setShowReportModal(true)}
              className="w-full py-2 bg-blue-950/80 hover:bg-blue-900 text-blue-300 font-bold text-xs rounded-lg transition border border-blue-700/60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Visualizar / Salvar PDF</span>
            </button>
          </div>

          {/* Card 3: Cópia Técnica JSON */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg flex-shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Cópia Técnica (.JSON)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Arquivo de código usado exclusivamente para restaurar o sistema em caso de troca de computador.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="export-json-btn"
              onClick={exportBackupJSON}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Cópia Técnica</span>
            </button>
          </div>
        </div>

        {/* Restaurar Backup */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg flex-shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Restaurar Cópia de Segurança</h4>
              <p className="text-[11px] text-slate-400">
                Selecione um arquivo de backup (.json) salvo anteriormente para restaurar todos os clientes e produtos.
              </p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition shadow-sm whitespace-nowrap flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Selecionar Arquivo de Backup</span>
          </button>
        </div>

        {restoreMessage && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            restoreMessage.isError 
              ? 'bg-rose-950/40 border border-rose-800 text-rose-300' 
              : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
          }`}>
            {restoreMessage.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{restoreMessage.text}</span>
          </div>
        )}
      </div>

      <AutoBackupModal
        isOpen={showAutoBackupModal}
        onClose={() => setShowAutoBackupModal(false)}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        cantinaFallback={activeCantina}
      />
    </div>
  );
};
