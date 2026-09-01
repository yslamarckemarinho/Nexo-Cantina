import React, { useState, useEffect } from 'react';
import { Customer, CantinaTenant, WhatsAppProfileType } from '../types';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Check, 
  Send, 
  Phone, 
  KeyRound, 
  Sparkles,
  FileText,
  ShieldAlert,
  Zap,
  Edit3,
  RotateCcw
} from 'lucide-react';

interface WhatsAppModalProps {
  customer: Customer;
  cantina: CantinaTenant;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  customer,
  cantina,
  onClose
}) => {
  const unpaidItems = customer.items.filter(i => !i.paid);
  const totalDebt = unpaidItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const [phone, setPhone] = useState(customer.phone || '83987654321');
  const [pixKey, setPixKey] = useState(cantina.pixKey || '918283739272');
  const [profile, setProfile] = useState<WhatsAppProfileType>('amigavel');
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  // Group items by name to show summary if duplicates exist
  const groupedItems = unpaidItems.reduce((acc, item) => {
    const existing = acc.find(i => i.name === item.name);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalPrice += item.totalPrice;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as typeof unpaidItems);

  const itemsListText = groupedItems.length > 0 
    ? groupedItems.map(item => 
        `• ${item.quantity}x ${item.name}: R$ ${item.totalPrice.toFixed(2)}${item.quantity > 1 ? ` (${item.quantity}x R$ ${item.unitPrice.toFixed(2)})` : ''}`
      ).join('\n')
    : '• (Sem itens detalhados)';

  // Build message template based on profile
  const getTemplateMessage = (selectedProfile: WhatsAppProfileType, currentPix: string) => {
    switch (selectedProfile) {
      case 'amigavel':
        return `Olá, *${customer.name}*! Tudo bem?

Passando aqui pela *${cantina.name}* para lembrar do saldo em aberto na sua conta a prazo:

📋 *Detalhamento dos Consumos:*
${itemsListText}

💰 *Valor Total:* *R$ ${totalDebt.toFixed(2)}*
🔑 *Chave PIX:* \`${currentPix}\` (${cantina.pixReceiverName || cantina.name})

Assim que fizer o pagamento ou abatimento, por favor nos envie o comprovante para darmos baixa. Muito obrigado! 😊`;

      case 'extrato':
        return `*EXTRATO DE CONSUMO - ${cantina.schoolName.toUpperCase()}*
*Cantina:* ${cantina.name}
*Cliente/Aluno:* ${customer.name}
----------------------------------------
*Itens Consumidos Pendentes:*
${itemsListText}
----------------------------------------
*Total a Pagar:* *R$ ${totalDebt.toFixed(2)}*
*Chave PIX:* \`${currentPix}\`
*Favorecido:* ${cantina.pixReceiverName || cantina.name}

Favor encaminhar comprovante após a transferência.`;

      case 'fechamento':
        return `Prezado(a) responsável por *${customer.name}*,

Informamos o fechamento periódico da conta da cantina escolar (*${cantina.schoolName}*).

Consta em aberto o valor de *R$ ${totalDebt.toFixed(2)}* referente ao consumo recente.

Solicitamos a gentileza da quitação via PIX:
🔑 *Chave PIX:* \`${currentPix}\`
*Beneficiário:* ${cantina.pixReceiverName || cantina.name}
*Valor:* R$ ${totalDebt.toFixed(2)}

Agradecemos a atenção e colaboração!`;

      case 'so_pix':
        return `Olá! Segue a chave PIX da *${cantina.name}* para pagamento do saldo de *R$ ${totalDebt.toFixed(2)}* referente a ${customer.name}:

🔑 *Chave PIX:* \`${currentPix}\`
*Favorecido:* ${cantina.pixReceiverName || cantina.name}
*Valor:* R$ ${totalDebt.toFixed(2)}`;

      default:
        return '';
    }
  };

  // Initialize or update template message on load or profile change
  useEffect(() => {
    setCustomMessage(getTemplateMessage(profile, pixKey));
    setIsCustomEdited(false);
  }, [profile, pixKey]);

  const handleResetToTemplate = () => {
    setCustomMessage(getTemplateMessage(profile, pixKey));
    setIsCustomEdited(false);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(customMessage);
    const url = cleanPhone 
      ? `https://wa.me/55${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Cobrança e Mensagem WhatsApp</h3>
              <p className="text-[11px] text-slate-400">
                Cliente: <span className="text-white font-medium">{customer.name}</span> • Saldo: <span className="text-amber-400 font-bold">R$ {totalDebt.toFixed(2)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp do Cliente:</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 83987654321"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Sua Chave PIX:</span>
              </label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="CPF, CNPJ, Telefone ou E-mail"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono-num"
              />
            </div>
          </div>

          {/* Profile selector buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Escolha o modelo de mensagem base:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setProfile('amigavel')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                  profile === 'amigavel'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="text-xs font-bold">Amigável</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Lembrete educado</span>
              </button>

              <button
                type="button"
                onClick={() => setProfile('extrato')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                  profile === 'extrato'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 mb-1 text-blue-400" />
                <span className="text-xs font-bold">Extrato</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Com lista de itens</span>
              </button>

              <button
                type="button"
                onClick={() => setProfile('fechamento')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                  profile === 'fechamento'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-4 h-4 mb-1 text-amber-400" />
                <span className="text-xs font-bold">Fechamento</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Aviso formal</span>
              </button>

              <button
                type="button"
                onClick={() => setProfile('so_pix')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                  profile === 'so_pix'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Zap className="w-4 h-4 mb-1 text-purple-400" />
                <span className="text-xs font-bold">Só PIX</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Chave e valor</span>
              </button>
            </div>
          </div>

          {/* Editable Message Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Editar Mensagem antes de enviar (personalize como desejar):</span>
              </label>
              
              <div className="flex items-center gap-2">
                {isCustomEdited && (
                  <button
                    type="button"
                    onClick={handleResetToTemplate}
                    title="Restaurar texto padrão do modelo"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Padrão</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  setIsCustomEdited(true);
                }}
                rows={9}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed border-l-4 border-l-emerald-500 shadow-inner resize-y"
                placeholder="Escreva ou edite sua mensagem de WhatsApp aqui..."
              />
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>💡 Dica: Você pode digitar qualquer recado extra para o cliente diretamente acima.</span>
              <span>{customMessage.length} caracteres</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition hover:bg-slate-700"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="send-whatsapp-trigger-btn"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
