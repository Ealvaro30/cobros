import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);
  private readonly excelPath = path.resolve(__dirname, '../../../../plantilla_clientes.xlsx');

  constructor() {}

  public async updateClientRow(cliente: any) {
    try {
      this.logger.log(`Updating Excel row for client ${cliente.id}`);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.excelPath);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheets found in template');
      }

      let rowIndex = -1;
      
      // Iterate over rows to find the matching client ID or Phone.
      // Assuming headers are on row 1, and 'ID ' is column A (1), 'WAP ' is column H (8)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const cellId = row.getCell(1).value; // A
        const cellWap = row.getCell(8).value; // H
        
        // Match by exact ID or phone number
        if (cellId === cliente.id || cellWap?.toString() === cliente.telefono) {
          rowIndex = rowNumber;
        }
      });

      if (rowIndex !== -1) {
        const row = worksheet.getRow(rowIndex);
        
        // Assuming headers: 
        // 1: ID, 2: NOMBRE, 3: CEDULA, 4: CAPITAL, 5: DOLARES, 6: BUCKET, 7: ESTADO, 8: WAP, 9: PROMESA, 10: AGENTE
        
        if (cliente.estado) {
          row.getCell(7).value = cliente.estado;
        }
        if (cliente.bucket) {
          row.getCell(6).value = cliente.bucket;
        }
        if (cliente.promesa_pago) {
          row.getCell(9).value = 'SI';
        } else if (cliente.estado === 'PROMESA DE PAGO') {
          row.getCell(9).value = 'SI';
        }

        row.commit();
        await workbook.xlsx.writeFile(this.excelPath);
        this.logger.log(`Excel updated successfully for row ${rowIndex}`);
      } else {
        this.logger.warn(`Client ${cliente.id} not found in Excel file.`);
      }
    } catch (err) {
      this.logger.error(`Failed to update Excel file: ${(err as Error).message}`, err);
    }
  }

  public getExcelPath(): string {
    return this.excelPath;
  }
}
