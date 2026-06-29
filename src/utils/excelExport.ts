export type ExcelSheet = {
  name: string;
  rows: Array<Record<string, unknown>>;
};

const escapeXml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const cleanSheetName = (name: string): string => name.replace(/[\\/?*:[\]]/g, ' ').slice(0, 31) || 'Sheet';

const cellXml = (value: unknown, styleId?: string): string => {
  const style = styleId ? ` ss:StyleID="${styleId}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  if (typeof value === 'boolean') {
    return `<Cell${style}><Data ss:Type="Boolean">${value ? 1 : 0}</Data></Cell>`;
  }
  return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
};

const sheetXml = (sheet: ExcelSheet): string => {
  const headers = Array.from(sheet.rows.reduce<Set<string>>((result, row) => {
    Object.keys(row).forEach(key => result.add(key));
    return result;
  }, new Set<string>()));
  const headerRow = headers.length
    ? `<Row>${headers.map(header => cellXml(header, 'Header')).join('')}</Row>`
    : '';
  const dataRows = sheet.rows.map(row => (
    `<Row>${headers.map(header => cellXml(row[header])).join('')}</Row>`
  )).join('');

  return `
    <Worksheet ss:Name="${escapeXml(cleanSheetName(sheet.name))}">
      <Table>${headerRow}${dataRows}</Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane>
      </WorksheetOptions>
    </Worksheet>`;
};

export const exportExcelWorkbook = (sheets: ExcelSheet[], fileName: string): string => {
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Borders/><Font/><Interior/><NumberFormat/><Protection/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4F46E5" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  </Styles>
  ${sheets.map(sheetXml).join('')}
</Workbook>`;
  const downloadName = `${fileName}.xls`;
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return downloadName;
};
