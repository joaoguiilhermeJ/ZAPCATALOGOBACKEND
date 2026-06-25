/**
 * generate-excels.js
 *
 * Gera 3 planilhas .xlsx de exemplo estilizadas (Aura, Soleil, Mercadinho)
 * usando exceljs, salvando em /public/downloads/.
 *
 * Uso: node generate-excels.js
 */

import ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'public', 'downloads');

// ─── Configuração dos nichos ──────────────────────────────────────

const COLUMNS = ['Nome do Produto', 'Preço', 'Descrição', 'Categoria/Tag'];
const COL_WIDTHS = [30, 12, 40, 20, 22];

const NICHOS = [
  {
    slug: 'aura',
    title: 'Aura — Moda & Vestuário',
    extraCol: 'Tamanhos (P, M, G)',
    examples: [
      { nome: 'Blusa Silk Blend',        preco: 129.90, descricao: 'Seda ecológica · Gola V',                tag: 'Premium',    extra: 'P,M,G,GG' },
      { nome: 'Calça Jeans Premium',     preco: 189.90, descricao: 'Algodão orgânico · Comfort Fit',         tag: 'Novo',       extra: '38,40,42,44' },
      { nome: 'Vestido Floral Verão',    preco: 179.90, descricao: 'Viscose · Estampado floral',             tag: 'Novo',       extra: 'P,M,G' },
    ],
  },
  {
    slug: 'soleil',
    title: 'Soleil — Calçados & Esportes',
    extraCol: 'Numeração',
    examples: [
      { nome: 'Tênis Running Sport',     preco: 299.90, descricao: 'Amortecimento Max · Respirável',         tag: 'Mais Vendido', extra: '38,39,40,41,42' },
      { nome: 'Sandália Casual Verão',   preco: 89.90,  descricao: 'Borracha reciclada · Antiderrapante',    tag: 'Novo',        extra: '36,37,38,39,40' },
      { nome: 'Sapato Couro Nobre',      preco: 349.90, descricao: 'Couro legítimo · Solado antiderrapante', tag: 'Premium',     extra: '38,39,40,41,42' },
    ],
  },
  {
    slug: 'mercadinho',
    title: 'Mercadinho da Vila — Alimentos & Bebidas',
    extraCol: 'Unidade/Peso',
    examples: [
      { nome: 'Café Premium Grãos',            preco: 34.90, descricao: 'Grãos especiais · Torra média',       tag: 'Premium',   extra: '250g,500g' },
      { nome: 'Queijo Minas Artesanal',        preco: 42.90, descricao: 'Maturado por 60 dias · 300g',         tag: 'Gourmet',   extra: '300g,500g' },
      { nome: 'Cesta Hortifrúti Orgânica',     preco: 59.90, descricao: '10 itens selecionados · Sem agrotóxicos', tag: 'Orgânico', extra: 'Único' },
    ],
  },
];

// ─── Helpers de estilo ─────────────────────────────────────────────

function headerStyle(headerColor) {
  return {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF888888' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    },
  };
}

const fillStyle = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } },
  alignment: { vertical: 'middle', wrapText: true },
  border: {
    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
  },
};

const precoStyle = { ...fillStyle };
precoStyle.numFmt = '#,##0.00';

// ─── Geração ───────────────────────────────────────────────────────

async function gerarPlanilha(nicho) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ZapCatálogo';
  wb.created = new Date();

  // ═══════ Aba 1: Instruções ═══════
  const wsInstr = wb.addWorksheet('Instruções');

  // Cores dos nichos
  const colors = {
    aura: 'FF1A5276',
    soleil: 'FFB45F06',
    mercadinho: 'FF38761D',
  };
  const headerColor = colors[nicho.slug] || 'FF1A5276';

  wsInstr.columns = [
    { header: '', key: 'info', width: 55 },
    { header: '', key: 'detalhe', width: 45 },
  ];

  // Título
  const titleRow = wsInstr.addRow([`📋 Instruções — ${nicho.title}`, '']);
  wsInstr.mergeCells(`A${titleRow.number}:B${titleRow.number}`);
  titleRow.eachCell((cell) => {
    cell.font = { bold: true, size: 14, color: { argb: headerColor } };
    cell.alignment = { vertical: 'middle' };
  });
  wsInstr.addRow(['', '']);

  // Instruções
  const instrucoes = [
    '📌 Como preencher esta planilha:',
    '',
    '1. Vá até a aba "Produtos" (ao lado).',
    '2. Substitua os dados de exemplo pelos seus produtos.',
    '3. Mantenha os cabeçalhos exatamente como estão (linha 1).',
    '4. As células com fundo cinza claro (linhas 2 em diante) são onde você deve digitar.',
    '5. Na coluna Preço, digite apenas números (ex: 29.90).',
    `6. Na coluna "${nicho.extraCol}", use valores separados por vírgula se houver múltiplas opções.`,
    '7. Após preencher, faça upload da planilha no site ZapCatálogo.',
    '',
    '✅ Importante: não altere os nomes das colunas na aba Produtos.',
  ];

  for (const linha of instrucoes) {
    const r = wsInstr.addRow([linha, '']);
    if (linha.startsWith('📌')) {
      r.eachCell((cell) => {
        cell.font = { bold: true, size: 11, color: { argb: headerColor } };
      });
    }
  }

  // ═══════ Aba 2: Produtos ═══════
  const wsProd = wb.addWorksheet('Produtos');

  // Cabeçalho com a cor do nicho
  const headerLabels = [...COLUMNS, nicho.extraCol];
  const headerRow = wsProd.addRow(headerLabels);

  wsProd.columns = COL_WIDTHS.map((w, i) => ({
    header: headerLabels[i],
    key: `col${i}`,
    width: w,
  }));

  headerRow.eachCell((cell) => {
    cell.style = headerStyle(headerColor);
  });

  // Linhas de dados de exemplo (mockups) + linhas cinzas vazias até 50
  const TOTAL_ROWS = 50;

  // Primeiro: dados de exemplo
  const allRows = [];

  for (const ex of nicho.examples) {
    allRows.push({
      nome: ex.nome,
      preco: ex.preco,
      descricao: ex.descricao,
      tag: ex.tag,
      extra: ex.extra,
    });
  }

  // Preencher o restante com linhas vazias até TOTAL_ROWS
  while (allRows.length < TOTAL_ROWS) {
    allRows.push(null);
  }

  for (let i = 0; i < allRows.length; i++) {
    const data = allRows[i];
    const rowNum = i + 2; // linha 2 em diante (linha 1 é cabeçalho)

    let row;
    if (data) {
      row = wsProd.addRow([data.nome, data.preco, data.descricao, data.tag, data.extra]);
    } else {
      row = wsProd.addRow(['', '', '', '', '']);
    }

    // Aplica fundo cinza e bordas em TODAS as células da linha
    row.eachCell((cell, colNumber) => {
      // Coluna 2 = Preço — formata como número
      if (colNumber === 2 && data) {
        cell.style = { ...precoStyle };
      } else {
        cell.style = { ...fillStyle };
      }
    });
  }

  // Mescla as células da última linha (linha 51) com uma observação
  const obsRowNum = TOTAL_ROWS + 2; // 52 (1 header + 50 data)
  const obsRow = wsProd.addRow([
    '⬆ Preencha acima com seus produtos (substitua os exemplos)',
    '', '', '', '',
  ]);
  wsProd.mergeCells(`A${obsRowNum}:E${obsRowNum}`);
  obsRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF888888' }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
  });

  // Ajusta altura das linhas
  for (let r = 2; r <= obsRowNum; r++) {
    wsProd.getRow(r).height = 22;
  }
  wsProd.getRow(1).height = 30;

  return wb;
}

// ─── Execução ────────────────────────────────────────────────────

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

for (const nicho of NICHOS) {
  const caminho = join(OUT_DIR, `modelo_${nicho.slug}.xlsx`);
  const wb = await gerarPlanilha(nicho);
  await wb.xlsx.writeFile(caminho);
  console.log(`✓ ${caminho}`);
}

console.log('\n✅ 3 planilhas geradas com sucesso em /public/downloads/');
