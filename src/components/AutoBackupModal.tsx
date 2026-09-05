import React, { useState } from 'react';
import { useCantina } from '../context/CantinaContext';
import { BackupSnapshot } from '../types';
import { exportSnapshotSpreadsheet, printSnapshotReport } from '../utils/exportHelpers';
import { ReportModal } from './ReportModal';
import { 
  X, 
  Database, 
  Cloud, 
  CloudCheck, 
  RotateCcw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  HardDrive, 
  FileJson,
  Sparkles,
  Lock,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  FileText,
  Code2
} from 'lucide-react';

interface AutoBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutoBackupModal: React.FC<AutoBackupModalProps> = ({ isOpen, onClose }) => {
  const { 
    activeCantina, 
    autoBackupSnapshots, 
    triggerManualBackup, 
    restoreFromSnapshot, 
    downloadSnapshotJSON, 
    toggleAutoBackup,
    restoreFromJSON
  } = useCantina();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [selectedReportSnapshot, setSelectedReportSnapshot] = useState<BackupSnapshot | null>(null);

  if (!isOpen || !activeCantina) return null;

  const isEnabled = activeCantina.autoBackupEnabled !== false;
  const lastBackupStr = activeCantina.lastAutoBackupAt || activeCantina.lastBackupAt;
  const formattedLastBackup = lastBackupStr 
    ? new Date(lastBackupStr).toLocaleString('pt-BR') 
    : 'Nenhum backup recente';

  const handleManualBackup = async (triggerType: 'manual' | 'turno_11h' | 'turno_17h' = 'manual') => {
    setIsBackingUp(true);
    try {
      const snap = await triggerManualBackup(triggerType);
      if (snap) {
        const label = triggerType === 'turno_11h' ? 'Turno 11:00' : triggerType === 'turno_17h' ? 'Turno 17:00' : 'Manual';
        setSuccessMessage(`Backup (${label}) gravado com sucesso! (${snap.formattedDate} às ${snap.formattedTime})`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (snap: BackupSnapshot) => {
    const confirmRestore = window.confirm(
      `ATENÇÃO: Deseja restaurar a cantina "${activeCantina.name}" para o ponto salvo em ${snap.formattedDate} às ${snap.formattedTime}?\n\nOs dados atuais serão substituídos pelo snapshot selecionado.`
    );
    if (!confirmRestore) return;

    setRestoringId(snap.id);
    try {
      const res = await restoreFromSnapshot(snap.id);
      if (res.success) {
        alert(`✅ ${res.message}`);
      } else {
        alert(`❌ ${res.message}`);
      }
    } finally {
      setRestoringId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = restoreFromJSON(content);
        if (res.success) {
          alert(`✅ ${res.message}`);
          onClose();
        } else {
          alert(`❌ ${res.message}`);
        }
      }
    };
    reader.readAsText(file);
  };

  const pendingFiadoTotal = activeCantina.customers.reduce((acc, c) => {
    return acc + c.items.filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0);
  }, 0);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                Central de Backup Automático & Nuvem
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Ativo
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeCantina.name} • Snapshots rotativos isolados por cantina
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-gradient-to-br from-slate-950 to-blue-950/40 border border-blue-500/30 rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-white">
                Proteção Automática em Tempo Real
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
              <span className="text-slate-300 font-medium">Backup Automático:</span>
              <button
                type="button"
                onClick={() => toggleAutoBackup(!isEnabled)}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                  isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                    isEnabled ? 'transform translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Horários por Turno</span>
              <span className="text-white font-bold flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-amber-400" /> 11:00 (Manhã) & 17:00 (Tarde)
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Último Ponto Salvo</span>
              <span className="text-emerald-400 font-bold truncate block mt-0.5">
                {formattedLastBackup}
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Dados Preservados</span>
              <span className="text-white font-bold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> {activeCantina.products.length} prods • R$ {pendingFiadoTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-400">
              Salvo automaticamente a cada turno e no fechamento de caixa.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleManualBackup('turno_11h')}
                disabled={isBackingUp}
                className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 font-bold text-xs rounded-xl shadow transition flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                title="Gravar ponto do Turno da Manhã (11:00)"
              >
                <span>🌅 Turno 11h</span>
              </button>

              <button
                type="button"
                onClick={() => handleManualBackup('turno_17h')}
                disabled={isBackingUp}
                className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800/80 font-bold text-xs rounded-xl shadow transition flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                title="Gravar ponto do Turno da Tarde (17:00)"
              >
                <span>🌇 Turno 17h</span>
              </button>

              <button
                type="button"
                onClick={() => handleManualBackup('manual')}
                disabled={isBackingUp}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
                <span>{isBackingUp ? 'Gravando...' : 'Backup Agora'}</span>
              </button>
            </div>
          </div>

          {/* Quick Human-Readable Exports for Current State */}
          <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 font-medium">
              Exportar dados do momento em formato legível:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportSnapshotSpreadsheet({
                  data: activeCantina,
                  trigger: 'manual',
                  formattedDate: new Date().toLocaleDateString('pt-BR'),
                  formattedTime: new Date().toLocaleTimeString('pt-BR')
                })}
                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Baixar planilha compatível com Microsoft Excel e Google Planilhas"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Planilha Excel (.CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportSnapshot({
                  id: 'current',
                  cantinaId: activeCantina.id,
                  cantinaName: activeCantina.name,
                  timestamp: new Date().toISOString(),
                  formattedDate: new Date().toLocaleDateString('pt-BR'),
                  formattedTime: new Date().toLocaleTimeString('pt-BR'),
                  trigger: 'manual',
                  productsCount: activeCantina.products.length,
                  customersCount: activeCantina.customers.length,
                  salesCount: activeCantina.sales.length,
                  shiftsCount: activeCantina.shifts.length,
                  totalPendingFiado: activeCantina.customers.reduce((acc, c) => acc + c.items.filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0), 0),
                  sizeBytes: 0,
                  data: activeCantina
                })}
                className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Abrir visualização pronta para salvar em PDF ou imprimir em folha A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Relatório / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Snapshots History */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              Histórico de Snapshots Recentes ({autoBackupSnapshots.length})
            </h4>
            <span className="text-[10px] text-slate-500">Últimos 10 pontos salvos</span>
          </div>

          {autoBackupSnapshots.length === 0 ? (
            <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500 space-y-1">
              <Database className="w-6 h-6 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-400">Nenhum snapshot gravado ainda nesta sessão.</p>
              <p>O sistema salva automaticamente às 11:00 (Manhã) e às 17:00 (Tarde) ou no Fechamento de Caixa.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {autoBackupSnapshots.map((snap) => {
                const isRestoringThis = restoringId === snap.id;
                return (
                  <div 
                    key={snap.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          snap.trigger === 'turno_11h'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/80'
                            : snap.trigger === 'turno_17h'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800/80'
                            : snap.trigger === 'fechamento_caixa'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                            : snap.trigger === 'manual'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        }`}>
                          {snap.trigger === 'turno_11h' ? '🌅 Turno 11:00 (Manhã)' :
                           snap.trigger === 'turno_17h' ? '🌇 Turno 17:00 (Tarde)' :
                           snap.trigger === 'fechamento_caixa' ? '🔒 Fechamento Caixa' : 
                           snap.trigger === 'manual' ? '👤 Manual' : '🔄 Automático'}
                        </span>
                        <span className="font-bold text-white font-mono-num">
                          {snap.formattedDate} às {snap.formattedTime}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          ({(snap.sizeBytes / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {snap.productsCount} produtos • {snap.customersCount} clientes • {snap.salesCount} vendas • R$ {snap.totalPendingFiado.toFixed(2)} em fiados
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* 1. Planilha Excel */}
                      <button
                        type="button"
                        onClick={() => exportSnapshotSpreadsheet(snap)}
                        title="Baixar Planilha formatada para Microsoft Excel / Google Planilhas"
                        className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Planilha</span>
                      </button>

                      {/* 2. Relatório PDF / Impressão */}
                      <button
                        type="button"
                        onClick={() => setSelectedReportSnapshot(snap)}
                        title="Abrir visualização pronta para salvar em PDF ou imprimir"
                        className="px-2 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-700/60 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      {/* 3. Restaurar */}
                      <button
                        type="button"
                        onClick={() => handleRestore(snap)}
                        disabled={isRestoringThis}
                        className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className={`w-3 h-3 ${isRestoringThis ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{isRestoringThis ? 'Restaurando...' : 'Restaurar'}</span>
                      </button>

                      {/* 4. Cópia Técnica JSON (discreta para suporte) */}
                      <button
                        type="button"
                        onClick={() => downloadSnapshotJSON(snap)}
                        title="Cópia Técnica (.JSON) para suporte / restauração"
                        className="p-1 text-slate-500 hover:text-slate-300 rounded transition cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* External File Actions */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 cursor-pointer transition font-semibold">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Importar Cópia Técnica (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Relatório Humanizado em Modal (com opção de Impressão e PDF) */}
      <ReportModal
        isOpen={!!selectedReportSnapshot}
        onClose={() => setSelectedReportSnapshot(null)}
        snapshot={selectedReportSnapshot}
        cantinaFallback={activeCantina}
      />
    </div>
  );
};
