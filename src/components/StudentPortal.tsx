import React, { useState } from 'react';
import { useCantina } from '../context/CantinaContext';
import { NexoLogo } from './NexoLogo';
import { 
  Search, 
  Copy, 
  Check, 
  Receipt,
  CheckCircle2,
  ArrowRight,
  Zap,
  AlertCircle
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const { activeCantina, lookupStudentByCode } = useCantina();

  const [searchCode, setSearchCode] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search through all cantinas using context method
  const searchResult = React.useMemo(() => {
    if (!searchCode.trim()) return null;
    return lookupStudentByCode(searchCode);
  }, [searchCode, lookupStudentByCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const handleCopyPix = (pixKey: string) => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  // Sample quick codes from active cantina for quick testing
  const sampleCodes = activeCantina?.customers.slice(0, 3).map(c => ({
    name: c.name,
    code: c.consultationCode
  })) || [];

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-6 space-y-6">
      {/* Hero Header */}
      <div className="text-center space-y-2 flex flex-col items-center">
        <NexoLogo size={52} />
        <h2 className="text-xl sm:text-2xl font-black text-white">
          Portal do Aluno & Responsável • Nexo Cantinas
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Consulte o extrato detalhado de lanches, saldo devedor e realize o pagamento via PIX com total transparência.
        </p>
      </div>

      {/* Code Search Input Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Digite o Código de Consulta do Aluno:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                id="portal-search-code-input"
                value={searchCode}
                onChange={(e) => {
                  setSearchCode(e.target.value);
                  setHasSearched(false);
                }}
                placeholder="Ex: NEXO-301 ou Cód. do Aluno"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono-num uppercase font-bold"
              />
            </div>
            <button
              type="submit"
              id="portal-search-btn"
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center gap-1.5"
            >
              <span>Consultar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Quick Test Codes */}
        {sampleCodes.length > 0 && (
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px]">Alunos cadastrados na cantina ativa:</span>
            {sampleCodes.map((sc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchCode(sc.code);
                  setHasSearched(true);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono-num font-bold text-xs rounded-lg border border-slate-700 transition"
              >
                {sc.code} ({sc.name.split(' ')[0]})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result Display */}
      {searchResult ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Student & Cantina Info Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                  {searchResult.cantina.name} • {searchResult.cantina.schoolName}
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {searchResult.customer.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Turma: <strong className="text-slate-200">{searchResult.customer.grade || 'Geral'}</strong></span>
                  <span>•</span>
                  <span>Cód: <strong className="text-cyan-400 font-mono-num">{searchResult.customer.consultationCode}</strong></span>
                </div>
              </div>

              {/* Status Badge */}
              {(() => {
                const unpaid = searchResult.customer.items.filter(i => !i.paid);
                const debt = unpaid.reduce((acc, curr) => acc + curr.totalPrice, 0);

                return (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Saldo em Aberto
                    </span>
                    <span className={`text-2xl font-black font-mono-num ${debt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      R$ {debt.toFixed(2)}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Daily limit info if present */}
            {searchResult.customer.dailySpendLimit && (
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Limite Diário de Consumo Autorizado:</span>
                <span className="font-bold text-white font-mono-num">
                  R$ {searchResult.customer.dailySpendLimit.toFixed(2)} / dia
                </span>
              </div>
            )}
          </div>

          {/* Payment via PIX Box */}
          {(() => {
            const unpaid = searchResult.customer.items.filter(i => !i.paid);
            const debt = unpaid.reduce((acc, curr) => acc + curr.totalPrice, 0);

            if (debt <= 0) {
              return (
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-2xl flex items-center gap-3 text-xs text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>Conta em dia!</strong> Não há débitos pendentes de lanches para este aluno no momento.
                  </span>
                </div>
              );
            }

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      Pagamento Rápido via PIX
                    </h4>
                    <p className="text-xs text-slate-400">
                      Transfira o valor de <strong className="text-cyan-400 font-mono-num">R$ {debt.toFixed(2)}</strong> diretamente para a cantina
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Chave PIX ({searchResult.cantina.pixReceiverName || searchResult.cantina.name}):</span>
                    <span className="font-mono-num font-bold text-white">
                      {searchResult.cantina.pixKey || 'Chave PIX não cadastrada'}
                    </span>
                  </div>

                  {searchResult.cantina.pixKey && (
                    <button
                      type="button"
                      onClick={() => handleCopyPix(searchResult.cantina.pixKey)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPix ? 'Chave PIX Copiada!' : 'Copiar Chave PIX'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Full Itemized History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span>Extrato Detalhado de Consumo</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono-num">
                {searchResult.customer.items.length} itens registrados
              </span>
            </div>

            {searchResult.customer.items.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Nenhum consumo registrado ainda.
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 p-2.5 border-b border-slate-800 bg-slate-900/60">
                  <span className="col-span-3">Data / Hora</span>
                  <span className="col-span-5">Item / Lanche</span>
                  <span className="col-span-2 text-right">Valor</span>
                  <span className="col-span-2 text-right">Status</span>
                </div>

                <div className="divide-y divide-slate-800/60 font-mono-num">
                  {searchResult.customer.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 p-2.5 text-xs items-center">
                      <div className="col-span-3 text-[11px] text-slate-400">
                        <div>{item.formattedDate}</div>
                        <div className="text-[10px] text-slate-500">{item.formattedTime}</div>
                      </div>

                      <div className="col-span-5">
                        <div className="font-semibold text-white truncate pr-1">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.quantity}x R$ {item.unitPrice.toFixed(2)}
                        </div>
                      </div>

                      <div className="col-span-2 text-right font-bold text-cyan-400">
                        R$ {item.totalPrice.toFixed(2)}
                      </div>

                      <div className="col-span-2 text-right">
                        {item.paid ? (
                          <span className="inline-block px-1.5 py-0.2 bg-emerald-950 text-emerald-400 text-[10px] font-bold rounded border border-emerald-800/50">
                            Pago
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.2 bg-amber-950 text-amber-400 text-[10px] font-bold rounded border border-amber-800/50">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : hasSearched && searchCode.trim() ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="font-bold text-white text-sm">Código não encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não encontramos nenhum aluno com o código "{searchCode.toUpperCase()}". Verifique se digitou corretamente ou solicite o código na cantina.
          </p>
        </div>
      ) : null}
    </div>
  );
};
