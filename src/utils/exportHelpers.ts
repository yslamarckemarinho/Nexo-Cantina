import { BackupSnapshot, CantinaTenant, Product, Customer, Sale } from '../types';

/**
 * Utilitários de Exportação em Linguagem Humana para Operadores de Cantina
 * - Planilhas Excel (.CSV formatadas com separador ponto-e-vírgula e UTF-8 BOM)
 * - Relatórios formatados para Impressão e Salvamento em PDF
 */

// Helper para escapar células de CSV
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Formata valor monetário com vírgula para Excel brasileiro
export function formatCurrencyBR(val: number): string {
  return Number(val || 0).toFixed(2).replace('.', ',');
}

// Retorna o rótulo humanizado do tipo de disparo
export function getTriggerLabel(trigger?: string): string {
  switch (trigger) {
    case 'turno_11h':
      return 'Turno 11:00 (Manhã)';
    case 'turno_17h':
      return 'Turno 17:00 (Tarde)';
    case 'fechamento_caixa':
      return 'Fechamento de Caixa';
    case 'manual':
      return 'Salvamento Manual';
    default:
      return 'Automático';
  }
}

/**
 * 1. GERAÇÃO DE PLANILHA EXCEL COMPLETA (.CSV) EM LINGUAGEM HUMANA
 * Abre perfeitamente no Excel, Google Planilhas ou LibreOffice com colunas bem definidas
 */
export function exportSnapshotSpreadsheet(
  snapshotOrCantina: BackupSnapshot | { data: CantinaTenant; trigger?: string; formattedDate?: string; formattedTime?: string }
) {
  const cantina: CantinaTenant = 'data' in snapshotOrCantina && snapshotOrCantina.data 
    ? snapshotOrCantina.data 
    : (snapshotOrCantina as unknown as CantinaTenant);

  const triggerLabel = getTriggerLabel((snapshotOrCantina as any).trigger);
  const dateStr = (snapshotOrCantina as any).formattedDate || new Date().toLocaleDateString('pt-BR');
  const timeStr = (snapshotOrCantina as any).formattedTime || new Date().toLocaleTimeString('pt-BR');

  // Cálculos de totais
  const totalSalesAmount = (cantina.sales || []).reduce((acc, s) => acc + s.totalAmount, 0);
  const totalPendingFiado = (cantina.customers || []).reduce((acc, c) => {
    return acc + (c.items || []).filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0);
  }, 0);
  const totalProducts = (cantina.products || []).length;
  const totalStockItems = (cantina.products || []).reduce((acc, p) => acc + (p.stock || 0), 0);

  // Vendas por método
  let totalDinheiro = 0;
  let totalPix = 0;
  let totalCartao = 0;
  let totalFiado = 0;
  (cantina.sales || []).forEach(s => {
    const pm = s.paymentMethod as string;
    if (pm === 'dinheiro') totalDinheiro += s.totalAmount;
    else if (pm === 'pix') totalPix += s.totalAmount;
    else if (pm === 'cartao' || pm === 'debito' || pm === 'credito') totalCartao += s.totalAmount;
    else if (pm === 'fiado' || pm === 'a_prazo') totalFiado += s.totalAmount;
  });

  const lines: string[] = [];

  // CABEÇALHO HUMANIZADO
  lines.push(`RELATÓRIO E PLANILHA DE DADOS DA CANTINA;;;;;;;`);
  lines.push(`Cantina:;${escapeCSV(cantina.name)};;;;;;`);
  if (cantina.schoolName) {
    lines.push(`Escola / Unidade:;${escapeCSV(cantina.schoolName)};;;;;;`);
  }
  lines.push(`Identificação do Ponto:;${escapeCSV(triggerLabel)};;;;;;`);
  lines.push(`Data e Hora:;${escapeCSV(`${dateStr} às ${timeStr}`)};;;;;;`);
  lines.push(`Operador Responsável:;${escapeCSV(cantina.operatorName || 'Operador do Caixa')};;;;;;`);
  lines.push(``);

  // RESUMO FINANCEIRO
  lines.push(`RESUMO FINANCEIRO;;;;;;;`);
  lines.push(`Item de Caixa;Valor (R$);;;;;;`);
  lines.push(`Total Faturado em Vendas;R$ ${formatCurrencyBR(totalSalesAmount)};;;;;;`);
  lines.push(`Total Recebido em Dinheiro;R$ ${formatCurrencyBR(totalDinheiro)};;;;;;`);
  lines.push(`Total Recebido em PIX;R$ ${formatCurrencyBR(totalPix)};;;;;;`);
  lines.push(`Total Recebido em Cartão;R$ ${formatCurrencyBR(totalCartao)};;;;;;`);
  lines.push(`Vendas Anotadas a Prazo (Fiado);R$ ${formatCurrencyBR(totalFiado)};;;;;;`);
  lines.push(`Total de Fiados Pendentes a Receber;R$ ${formatCurrencyBR(totalPendingFiado)};;;;;;`);
  lines.push(``);

  // TABELA 1: ESTOQUE E PRODUTOS
  lines.push(`PRODUTOS E SITUAÇÃO DE ESTOQUE;;;;;;;`);
  lines.push(`Código;Produto;Categoria;Preço Venda (R$);Preço Custo (R$);Estoque Atual;Qtd Vendida;Situação`);
  (cantina.products || []).forEach(p => {
    const situacao = p.stock <= 0 ? 'SEM ESTOQUE' : p.stock <= (p.minStockAlert || 5) ? 'ESTOQUE BAIXO' : 'NORMAL';
    lines.push([
      escapeCSV(p.code || '-'),
      escapeCSV(p.name),
      escapeCSV(p.category),
      `R$ ${formatCurrencyBR(p.salePrice)}`,
      `R$ ${formatCurrencyBR(p.costPrice || 0)}`,
      p.stock,
      p.totalSold || 0,
      situacao
    ].join(';'));
  });
  lines.push(``);

  // TABELA 2: HISTÓRICO DE VENDAS
  lines.push(`REGISTRO DETALHADO DE VENDAS;;;;;;;`);
  lines.push(`Comprovante;Data;Hora;Forma Pagamento;Cliente / Aluno;Itens Vendidos;Valor Total (R$);Operador`);
  (cantina.sales || []).forEach(s => {
    const itemSummary = (s.items || []).map(i => `${i.quantity}x ${i.name}`).join(' + ');
    const pm = s.paymentMethod as string;
    const paymentLabel = 
      pm === 'dinheiro' ? 'Dinheiro' :
      pm === 'pix' ? 'PIX' :
      pm === 'cartao' || pm === 'debito' || pm === 'credito' ? 'Cartão' :
      pm === 'fiado' || pm === 'a_prazo' ? 'Fiado / A Prazo' : pm;

    lines.push([
      escapeCSV(s.receiptNumber),
      escapeCSV(s.formattedDate),
      escapeCSV(s.formattedTime),
      escapeCSV(paymentLabel),
      escapeCSV(s.customerName || 'Balcão / Anônimo'),
      escapeCSV(itemSummary),
      `R$ ${formatCurrencyBR(s.totalAmount)}`,
      escapeCSV(s.operatorName || '-')
    ].join(';'));
  });
  lines.push(``);

  // TABELA 3: CONTAS E FIADOS POR ALUNO
  lines.push(`CONTAS DE ALUNOS E FIADOS EM ABERTO;;;;;;;`);
  lines.push(`Nome do Aluno / Responsável;Turma / Série;Telefone;Total a Pagar (R$);Quantidade de Itens Devidos;Situação`);
  (cantina.customers || []).forEach(c => {
    const pendingItems = (c.items || []).filter(i => !i.paid);
    const debt = pendingItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const situacao = debt > 0 ? 'DÉBITO PENDENTE' : 'EM DIA';

    lines.push([
      escapeCSV(c.name),
      escapeCSV(c.grade || '-'),
      escapeCSV(c.phone || '-'),
      `R$ ${formatCurrencyBR(debt)}`,
      pendingItems.length,
      situacao
    ].join(';'));
  });

  // UTF-8 BOM (\uFEFF) para garantir acentuação perfeita no Microsoft Excel
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  const cleanName = cantina.name.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanTrigger = triggerLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanDate = dateStr.replace(/\//g, '-');
  link.setAttribute('download', `Planilha_${cleanName}_${cleanTrigger}_${cleanDate}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * 2. IMPRESSÃO DIRETA / SALVAMENTO EM PDF DO RELATÓRIO DO TURNO
 * Abre uma janela limpa com estilo A4 profissional pronta para Imprimir ou Salvar como PDF
 */
export function printSnapshotReport(
  snapshotOrCantina: BackupSnapshot | { data: CantinaTenant; trigger?: string; formattedDate?: string; formattedTime?: string }
) {
  const cantina: CantinaTenant = 'data' in snapshotOrCantina && snapshotOrCantina.data 
    ? snapshotOrCantina.data 
    : (snapshotOrCantina as unknown as CantinaTenant);

  const triggerLabel = getTriggerLabel((snapshotOrCantina as any).trigger);
  const dateStr = (snapshotOrCantina as any).formattedDate || new Date().toLocaleDateString('pt-BR');
  const timeStr = (snapshotOrCantina as any).formattedTime || new Date().toLocaleTimeString('pt-BR');

  // Cálculos financeiros
  const totalSalesAmount = (cantina.sales || []).reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCostAmount = (cantina.sales || []).reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const totalLucro = totalSalesAmount - totalCostAmount;

  let totalDinheiro = 0;
  let totalPix = 0;
  let totalCartao = 0;
  let totalFiado = 0;
  (cantina.sales || []).forEach(s => {
    const pm = s.paymentMethod as string;
    if (pm === 'dinheiro') totalDinheiro += s.totalAmount;
    else if (pm === 'pix') totalPix += s.totalAmount;
    else if (pm === 'cartao' || pm === 'debito' || pm === 'credito') totalCartao += s.totalAmount;
    else if (pm === 'fiado' || pm === 'a_prazo') totalFiado += s.totalAmount;
  });

  const totalPendingFiado = (cantina.customers || []).reduce((acc, c) => {
    return acc + (c.items || []).filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0);
  }, 0);

  const customersWithDebt = (cantina.customers || []).filter(c => {
    return (c.items || []).some(i => !i.paid);
  });

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Permita pop-ups no navegador para visualizar e imprimir o relatório em PDF.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório do Turno - ${cantina.name}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 12px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      margin: 0;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #334155;
    }
    .badge {
      display: inline-block;
      background: #e2e8f0;
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .badge-shift {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-closure {
      background: #f3e8ff;
      color: #6b21a8;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      background: #f8fafc;
    }
    .card-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .card-value {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .card-highlight {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .card-highlight .card-value {
      color: #065f46;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 16px 0 8px 0;
      display: flex;
      justify-content: space-between;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      text-align: left;
      padding: 6px 8px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-right {
      text-align: right;
    }
    .signatures {
      margin-top: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      page-break-inside: avoid;
    }
    .sign-line {
      border-top: 1px solid #475569;
      padding-top: 6px;
      text-align: center;
      font-size: 11px;
      color: #334155;
      font-weight: 600;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -20px -20px 20px -20px;
      font-size: 13px;
    }
    .btn-print {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-print:hover {
      background: #059669;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>Visualização de Impressão / PDF</strong> &bull; ${cantina.name} (${triggerLabel})
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">${cantina.name}</h1>
      <p class="subtitle">${cantina.schoolName ? `Escola: ${cantina.schoolName}` : 'Controle Operacional de Cantina'}</p>
    </div>
    <div class="meta-box">
      <div class="badge ${triggerLabel.includes('Turno') ? 'badge-shift' : 'badge-closure'}">${triggerLabel}</div>
      <div><strong>Data:</strong> ${dateStr} às ${timeStr}</div>
      <div><strong>Operador:</strong> ${cantina.operatorName || 'Operador do Caixa'}</div>
    </div>
  </div>

  <div class="cards-grid">
    <div class="card card-highlight">
      <div class="card-label">Total Vendas</div>
      <div class="card-value">R$ ${formatCurrencyBR(totalSalesAmount)}</div>
    </div>
    <div class="card">
      <div class="card-label">Dinheiro em Caixa</div>
      <div class="card-value">R$ ${formatCurrencyBR(totalDinheiro)}</div>
    </div>
    <div class="card">
      <div class="card-label">PIX Recebido</div>
      <div class="card-value">R$ ${formatCurrencyBR(totalPix)}</div>
    </div>
    <div class="card">
      <div class="card-label">Cartão (Déb/Créd)</div>
      <div class="card-value">R$ ${formatCurrencyBR(totalCartao)}</div>
    </div>
  </div>

  <div class="cards-grid">
    <div class="card">
      <div class="card-label">Fiados Marcados no Turno</div>
      <div class="card-value">R$ ${formatCurrencyBR(totalFiado)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Fiados a Receber</div>
      <div class="card-value">R$ ${formatCurrencyBR(totalPendingFiado)}</div>
    </div>
    <div class="card">
      <div class="card-label">Itens Cadastrados</div>
      <div class="card-value">${(cantina.products || []).length} produtos</div>
    </div>
    <div class="card">
      <div class="card-label">Lucro Bruto Estimado</div>
      <div class="card-value">R$ ${formatCurrencyBR(totalLucro)}</div>
    </div>
  </div>

  <div class="section-title">
    <span>Resumo de Estoque dos Produtos</span>
    <span style="font-size:11px; font-weight:normal; text-transform:none;">${(cantina.products || []).length} itens</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Código</th>
        <th>Nome do Produto</th>
        <th style="width: 18%;">Categoria</th>
        <th style="width: 14%;" class="text-right">Preço (R$)</th>
        <th style="width: 14%;" class="text-right">Estoque Atual</th>
        <th style="width: 14%;" class="text-right">Total Vendido</th>
      </tr>
    </thead>
    <tbody>
      ${(cantina.products || []).map(p => `
        <tr>
          <td>${p.code || '-'}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td class="text-right">R$ ${formatCurrencyBR(p.salePrice)}</td>
          <td class="text-right" style="${p.stock <= 0 ? 'color:#dc2626; font-weight:bold;' : ''}">${p.stock} un</td>
          <td class="text-right">${p.totalSold || 0} un</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${customersWithDebt.length > 0 ? `
    <div class="section-title" style="page-break-before: auto;">
      <span>Alunos com Fiado Pendente</span>
      <span style="font-size:11px; font-weight:normal; text-transform:none;">Total a Receber: R$ ${formatCurrencyBR(totalPendingFiado)}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Aluno / Responsável</th>
          <th>Turma</th>
          <th>Contato</th>
          <th class="text-right">Total Devido</th>
        </tr>
      </thead>
      <tbody>
        ${customersWithDebt.map(c => {
          const debt = (c.items || []).filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0);
          return `
            <tr>
              <td><strong>${c.name}</strong></td>
              <td>${c.grade || '-'}</td>
              <td>${c.phone || '-'}</td>
              <td class="text-right" style="color:#b91c1c; font-weight:bold;">R$ ${formatCurrencyBR(debt)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  ` : ''}

  <div class="signatures">
    <div class="sign-line">
      ${cantina.operatorName || 'Operador do Caixa'}<br>
      <span style="font-size:10px; color:#64748b; font-weight:normal;">Operador Responsável</span>
    </div>
    <div class="sign-line">
      Coordenação / Gerência da Cantina<br>
      <span style="font-size:10px; color:#64748b; font-weight:normal;">Visto e Conferência</span>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
