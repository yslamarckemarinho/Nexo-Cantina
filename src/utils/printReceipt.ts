import { Sale, Customer, CantinaTenant } from '../types';

export function printReceiptHtml(htmlContent: string) {
  try {
    let iframe = document.getElementById('receipt-print-frame') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Imprimir Cupom / Nota</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 2mm;
              }
              body {
                font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
                font-size: 11px;
                line-height: 1.3;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 6px;
                width: 72mm;
                box-sizing: border-box;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .divider-double { border-top: 2px solid #000; margin: 6px 0; }
              .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              .table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 11px; }
              .table th { border-bottom: 1px dashed #000; padding: 3px 0; text-align: left; }
              .table td { padding: 3px 0; vertical-align: top; }
              .total-box { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 6px 0; }
              .signature-box { margin-top: 24px; text-align: center; }
              .signature-line { border-top: 1px solid #000; width: 80%; margin: 0 auto 4px auto; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print error, calling window.print()', err);
          window.print();
        }
      }, 300);
      return;
    }
  } catch (e) {
    console.error('Error opening print iframe', e);
  }

  // Fallback
  window.print();
}

export function printSaleReceipt(sale: Sale, cantina: CantinaTenant) {
  const isFiado = sale.paymentMethod === 'fiado';
  const methodLabel = isFiado ? 'CONTA / A PRAZO' : sale.paymentMethod.toUpperCase();

  const itemsHtml = sale.items.map((item, idx) => `
    <tr>
      <td style="width: 15%;">${String(idx + 1).padStart(2, '0')}.</td>
      <td style="width: 45%;">${item.name}</td>
      <td class="text-right" style="width: 20%;">${item.quantity}x${item.unitPrice.toFixed(2)}</td>
      <td class="text-right font-bold" style="width: 20%;">R$ ${item.totalPrice.toFixed(2)}</td>
    </tr>
  `).join('');

  const totalQty = sale.items.reduce((acc, i) => acc + i.quantity, 0);

  const html = `
    <div class="text-center font-bold" style="font-size: 13px;">NEXO CANTINAS</div>
    <div class="text-center uppercase font-bold">${cantina.schoolName}</div>
    <div class="text-center uppercase">${cantina.name}</div>
    ${cantina.instagramHandle ? `<div class="text-center" style="font-size: 10px;">${cantina.instagramHandle}</div>` : ''}
    <div class="divider"></div>

    <div class="row">
      <span>Data: ${sale.formattedDate}</span>
      <span>Hora: ${sale.formattedTime}</span>
    </div>
    <div class="row">
      <span>Cupom Nº: <b class="font-bold">#${sale.receiptNumber}</b></span>
      <span>Tipo: <b class="font-bold uppercase">${methodLabel}</b></span>
    </div>
    ${sale.customerName ? `
      <div class="row">
        <span>Cliente / Aluno:</span>
        <span class="font-bold uppercase">${sale.customerName}</span>
      </div>
    ` : ''}

    <div class="divider"></div>
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>ITEM</th>
          <th class="text-right">QTD*UN</th>
          <th class="text-right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="total-box">
      <div class="row">
        <span>QTD. TOTAL ITENS:</span>
        <span class="font-bold">${totalQty} un</span>
      </div>
      <div class="row" style="font-size: 13px; font-weight: bold; margin-top: 3px;">
        <span>VALOR TOTAL:</span>
        <span>R$ ${sale.totalAmount.toFixed(2)}</span>
      </div>
      ${sale.amountReceived !== undefined ? `
        <div class="row" style="margin-top: 4px; border-top: 1px dashed #000; padding-top: 3px;">
          <span>VALOR RECEBIDO:</span>
          <span>R$ ${sale.amountReceived.toFixed(2)}</span>
        </div>
        <div class="row" style="font-weight: bold;">
          <span>TROCO:</span>
          <span>R$ ${(sale.changeGiven || 0).toFixed(2)}</span>
        </div>
      ` : ''}
    </div>

    ${isFiado ? `
      <div class="text-center font-bold" style="font-size: 10px; margin: 6px 0;">
        *** LANÇADO NA CONTA A PRAZO DO ALUNO ***
      </div>
    ` : ''}

    <div class="text-center" style="margin-top: 10px; font-size: 10px;">
      Obrigado pela preferência!
    </div>
  `;

  printReceiptHtml(html);
}

export function printCustomerStatement(customer: Customer, cantina: CantinaTenant) {
  const unpaidItems = customer.items.filter(i => !i.paid);
  const totalDebt = unpaidItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const now = new Date();
  const currentDate = now.toLocaleDateString('pt-BR');
  const currentTime = now.toLocaleTimeString('pt-BR');

  const itemsHtml = unpaidItems.map((item, idx) => `
    <tr>
      <td style="width: 12%; font-size: 10px;">${item.formattedDate.substring(0, 5)}</td>
      <td style="width: 58%;">${item.name} ${item.quantity > 1 ? `(${item.quantity}x)` : ''}</td>
      <td class="text-right font-bold" style="width: 30%;">R$ ${item.totalPrice.toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <div class="text-center font-bold" style="font-size: 13px;">NEXO CANTINAS</div>
    <div class="text-center uppercase font-bold">${cantina.schoolName}</div>
    <div class="text-center uppercase">${cantina.name}</div>
    <div class="text-center font-bold" style="font-size: 11px; margin-top: 3px;">EXTRATO DE CONTA A PRAZO</div>
    <div class="divider"></div>

    <div class="row">
      <span>Cliente/Aluno:</span>
      <span class="font-bold uppercase">${customer.name}</span>
    </div>
    ${customer.grade ? `
      <div class="row">
        <span>Turma / Ano:</span>
        <span>${customer.grade}</span>
      </div>
    ` : ''}
    ${customer.phone ? `
      <div class="row">
        <span>Telefone / WhatsApp:</span>
        <span>${customer.phone}</span>
      </div>
    ` : ''}
    <div class="row">
      <span>Cód. Consulta:</span>
      <span class="font-bold">${customer.consultationCode}</span>
    </div>
    <div class="row">
      <span>Emissão:</span>
      <span>${currentDate} às ${currentTime}</span>
    </div>

    <div class="divider"></div>
    <div class="font-bold" style="margin-bottom: 3px;">LANÇAMENTOS EM ABERTO (${unpaidItems.length}):</div>
    
    <table class="table">
      <thead>
        <tr>
          <th>DATA</th>
          <th>DESCRIÇÃO</th>
          <th class="text-right">VALOR</th>
        </tr>
      </thead>
      <tbody>
        ${unpaidItems.length > 0 ? itemsHtml : '<tr><td colspan="3" class="text-center">Nenhum débito em aberto</td></tr>'}
      </tbody>
    </table>

    <div class="total-box">
      <div class="row" style="font-size: 13px; font-weight: bold;">
        <span>SALDO TOTAL A PAGAR:</span>
        <span>R$ ${totalDebt.toFixed(2)}</span>
      </div>
    </div>

    <div class="signature-box">
      <div class="signature-line"></div>
      <div style="font-size: 10px;">Assinatura do Responsável / Aluno</div>
    </div>

    <div class="text-center" style="margin-top: 12px; font-size: 9px;">
      Nexo Cantinas • Sistema de Gestão Escolar
    </div>
  `;

  printReceiptHtml(html);
}
