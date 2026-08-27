import React, { useState } from 'react';
import { Sale, CantinaTenant } from '../types';
import { NexoLogo } from './NexoLogo';
import { 
  Printer, 
  Copy, 
  Check, 
  MessageSquare, 
  X, 
  Store,
  Calendar,
  Clock,
  User,
  CreditCard
} from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  cantina: CantinaTenant;
  onClose: () => void;
  onOpenWhatsApp?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  cantina,
  onClose,
  onOpenWhatsApp
}) => {
  const [copied, setCopied] = useState(false);

  const receiptPlainText = `
========================================
             NEXO CANTINAS
        ${cantina.schoolName.toUpperCase()}
           ${cantina.name.toUpperCase()}
            ${cantina.instagramHandle || ''}
----------------------------------------
Data/Hora: ${sale.formattedDate} - ${sale.formattedTime}
Cupom: #${sale.receiptNumber}
Tipo: ${sale.paymentMethod === 'fiado' ? 'Conta / Fiado (Anotado)' : sale.paymentMethod.toUpperCase()}
${sale.customerName ? `Aluno / Cliente: ${sale.customerName}` : 'Cliente: Balcão / Anônimo'}
----------------------------------------
# ITEM / DESCRIÇÃO          QTD * UNIT   TOTAL
----------------------------------------
${sale.items.map((item, idx) => {
  const itemNum = String(idx + 1).padStart(2, '0');
  const name = item.name.padEnd(20, ' ').substring(0, 20);
  const qtyUnit = `${item.quantity} un * R$ ${item.unitPrice.toFixed(2)}`.padEnd(16, ' ');
  const total = `R$ ${item.totalPrice.toFixed(2)}`;
  return `${itemNum}. ${name} ${qtyUnit} ${total}`;
}).join('\n')}
----------------------------------------
QTD. TOTAL DE ITENS:        ${sale.items.reduce((acc, i) => acc + i.quantity, 0)} un
VALOR TOTAL:                R$ ${sale.totalAmount.toFixed(2)}
----------------------------------------
       *** Obrigado pela preferência! ***
========================================
`.trim();

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(receiptPlainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <h3 className="font-bold text-white text-sm">
              Cupom de Venda • {cantina.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content - Styled to look like the exact thermal receipt from video */}
        <div className="p-4 bg-slate-950/80">
          <div 
            id="printable-receipt"
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-inner text-slate-200 font-mono-num text-xs relative overflow-hidden"
          >
            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span className="text-4xl font-extrabold rotate-[-25deg]">NEXO CANTINAS</span>
            </div>

            {/* School logo & header */}
            <div className="text-center pb-3 border-b border-slate-800 relative z-10 flex flex-col items-center">
              <NexoLogo size={36} className="mb-1" />
              <h4 className="font-extrabold text-white text-sm tracking-wide uppercase">
                {cantina.name}
              </h4>
              <p className="text-[11px] text-blue-400 font-semibold">{cantina.schoolName}</p>
              {cantina.instagramHandle && (
                <p className="text-[10px] text-slate-400">{cantina.instagramHandle}</p>
              )}
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-2">
                <span>{sale.formattedDate}</span>
                <span>•</span>
                <span>{sale.formattedTime}</span>
              </div>
            </div>

            {/* Client & Method Info */}
            <div className="py-2.5 border-b border-slate-800/80 text-[11px] space-y-1 relative z-10">
              {sale.customerName && (
                <div className="flex justify-between items-start">
                  <span className="text-slate-400">Aluno / Cliente:</span>
                  <span className="font-bold text-white text-right max-w-[200px]">{sale.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Tipo:</span>
                <span className={`font-bold uppercase ${
                  sale.paymentMethod === 'fiado' ? 'text-amber-400' : 'text-blue-400'
                }`}>
                  {sale.paymentMethod === 'fiado' ? 'Conta / Fiado (Anotado)' : sale.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cupom Nº:</span>
                <span className="font-bold text-slate-300">#{sale.receiptNumber}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-slate-800 relative z-10">
              <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 pb-1.5 border-b border-slate-800">
                <span className="col-span-1">#</span>
                <span className="col-span-6">ITEM / DESCRIÇÃO</span>
                <span className="col-span-3 text-right">QTD * UNIT</span>
                <span className="col-span-2 text-right">TOTAL</span>
              </div>

              <div className="divide-y divide-slate-800/50 pt-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1.5 text-[11px] items-center">
                    <span className="col-span-1 text-slate-500 font-bold">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="col-span-6 font-semibold text-white truncate pr-1">
                      {item.name}
                    </span>
                    <span className="col-span-3 text-right text-slate-300 text-[10px]">
                      {item.quantity} un * R$ {item.unitPrice.toFixed(2)}
                    </span>
                    <span className="col-span-2 text-right font-bold text-blue-400">
                      R$ {item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="pt-3 pb-2 space-y-1 relative z-10">
              <div className="flex justify-between text-xs text-slate-400">
                <span>QTD. TOTAL DE ITENS:</span>
                <span className="font-bold text-slate-200">
                  {sale.items.reduce((acc, i) => acc + i.quantity, 0)} un
                </span>
              </div>
              <div className="flex justify-between items-baseline text-sm pt-1 border-t border-slate-800">
                <span className="font-bold text-white uppercase tracking-wider">VALOR TOTAL:</span>
                <span className="text-lg font-extrabold text-blue-400">
                  R$ {sale.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Footer greeting */}
            <div className="text-center pt-2 text-[10px] text-slate-500 italic relative z-10">
              *** Obrigado pela preferência! ***
            </div>
          </div>
        </div>

        {/* Modal Action Buttons matching video */}
        <div className="p-3 bg-slate-800/90 border-t border-slate-700 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            id="receipt-print-btn"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Imprimir</span>
          </button>

          <button
            id="receipt-copy-btn"
            onClick={handleCopyText}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          {onOpenWhatsApp && (
            <button
              id="receipt-whatsapp-btn"
              onClick={onOpenWhatsApp}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
