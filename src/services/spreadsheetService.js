/**
 * Serviço de processamento de planilhas Excel
 */

import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

export class SpreadsheetService {
  /**
   * Lê uma planilha Excel e retorna os dados como JSON
   */
  readSpreadsheet(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    return {
      sheets: workbook.SheetNames,
      activeSheet: sheetName,
      rowCount: data.length,
      columns: this.getColumns(worksheet),
      data,
    };
  }

  /**
   * Extrai as colunas da planilha
   */
  getColumns(worksheet) {
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const columns = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: col })];
      if (cell) {
        columns.push(cell.v);
      }
    }

    return columns;
  }

  /**
   * Cria um template de planilha para o usuário preencher
   */
  createTemplate() {
    const workbook = xlsx.utils.book_new();

    // Dados de exemplo para demonstrar o formato
    const exampleData = [
      {
        'Nome do Produto': 'Camiseta Polo azul',
        'Preço': 'R$ 89,90',
        'Descrição': 'Camiseta polo tradicional, malha piquet, cor azul',
        'Categoria': 'Camisetas',
        'Código': 'CAM-001',
        'Estoque': '25'
      },
      {
        'Nome do Produto': 'Calça Jeans slim',
        'Preço': 'R$ 149,90',
        'Descrição': 'Calça jeans slim fit, stretch, wash escuro',
        'Categoria': 'Calças',
        'Código': 'CAL-002',
        'Estoque': '15'
      },
      {
        'Nome do Produto': 'Tênis Nike Air Max',
        'Preço': 'R$ 459,90',
        'Descrição': 'Tênis esportivo com amortecimento Air Max, preto/branco',
        'Categoria': 'Tênis',
        'Código': 'TEN-003',
        'Estoque': '8'
      },
    ];

    // Converter para planilha
    const worksheet = xlsx.utils.json_to_sheet(exampleData);

    // Ajustar larguras das colunas
    worksheet['!cols'] = [
      { wch: 30 }, // Nome do Produto
      { wch: 15 }, // Preço
      { wch: 50 }, // Descrição
      { wch: 20 }, // Categoria
      { wch: 15 }, // Código
      { wch: 10 }, // Estoque
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Produtos');

    // Adicionar aba de instruções
    const instructionsData = [
      { 'Instrução': 'PREENCHA SEUS PRODUTOS ABAIXO DESTAS LINHAS DE EXEMPLO' },
      { 'Instrução': '' },
      { 'Instrução': 'CAMPOS OBRIGATÓRIOS:' },
      { 'Instrução': '- Nome do Produto: Nome do seu produto' },
      { 'Instrução': '- Preço: Preço de venda (ex: R$ 99,90)' },
      { 'Instrução': '- Descrição: Descrição do produto' },
      { 'Instrução': '' },
      { 'Instrução': 'CAMPOS OPCIONAIS:' },
      { 'Instrução': '- Categoria: Categoria do produto' },
      { 'Instrução': '- Código: Código interno/SKU' },
      { 'Instrução': '- Estoque: Quantidade disponível' },
      { 'Instrução': '' },
      { 'Instrução': 'APÓS PREENCHER, SALVE E FAÇA UPLOAD NA TELA INICIAL' },
    ];

    const instructionsSheet = xlsx.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 60 }];
    xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instruções');

    // Retornar como buffer
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Lê uma planilha Excel a partir de um Buffer (memoryStorage)
   * Necessário para compatibilidade com Vercel (serverless)
   */
  readSpreadsheetFromBuffer(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    return {
      sheets: workbook.SheetNames,
      activeSheet: sheetName,
      rowCount: data.length,
      columns: this.getColumns(worksheet),
      data,
    };
  }

  /**
   * Remove arquivo temporário
   */
  cleanup(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export default new SpreadsheetService();