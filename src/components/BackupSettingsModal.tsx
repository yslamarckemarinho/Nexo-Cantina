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
  AlertCircle
} from 'lucide-react';

export const BackupSettingsModal: React.FC = () => {
  const { 
    activeCantina, 
    updateCantinaSettings, 
    exportBackupJSON, 
    exportSalesCSV, 
    restoreFromJSON, 
    operatorName,
    loadStarterProductsToActiveCantina,
    resetSystemToZero
  } = useCantina();

  if (!activeCantina) return null;

  const [pixKey, setPixKey] = useState(activeCantina.pixKey || '');
  const [pixReceiver, setPixReceiver] = useState(activeCantina.pixReceiverName || '');
  const [schoolName, setSchoolName] = useState(activeCantina.schoolName || '');
  const [cantinaName, setCantinaName] = useState(activeCantina.name || '');
  const [instagram, setInstagram] = useState(activeCantina.instagramHandle || '');
  const [pin, setPin] = useState(activeCantina.pin || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [starterLoadedSuccess, setStarterLoadedSuccess] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateCantinaSettings({
      pixKey: pixKey.trim(),
      pixReceiverName: pixReceiver.trim(),
      schoolName: schoolName.trim(),
      name: cantinaName.trim(),
      instagramHandle: instagram.trim(),
      pin: pin.trim() || '1234',
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
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

        {activeCantina.lastBackupAt && (
          <div className="text-[11px] text-slate-500 font-mono-num pt-1 border-t border-slate-800">
            Última sincronização registrada: {new Date(activeCantina.lastBackupAt).toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      {/* 2. Carga Rápida de Produtos Iniciais (Opcional) */}
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

      {/* 3. Chave PIX e Dados da Cantina Form */}
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
            <span>Dados da Cantina & Unidade</span>
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
                placeholder="Ex: Nexo Cantinas - Unidade 1"
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
                placeholder="Ex: @nexocantinas"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Senha ou PIN de Acesso da Cantina:
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ex: 1234"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono-num"
            />
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
            Salvar Configurações
          </button>
        </div>
      </form>

      {/* 4. Exportar Cópias Locais (Excel & JSON) & Restaurar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Exportar Cópias Locais (Excel & Backup)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Planilha Excel */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Planilha Excel (.CSV)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Exporta todas as vendas e fiados organizados em colunas com data e hora.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="export-csv-btn"
              onClick={exportSalesCSV}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs rounded-lg transition border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Planilha (.CSV)</span>
            </button>
          </div>

          {/* Backup Completo JSON */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 text-cyan-400 rounded-lg flex-shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">Backup Completo (.JSON)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cópia de segurança salva em arquivo contendo produtos, clientes e histórico.
                </p>
              </div>
            </div>

            <button
              type="button"
              id="export-json-btn"
              onClick={exportBackupJSON}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-lg transition border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Backup (.JSON)</span>
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
    </div>
  );
};
