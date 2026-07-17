import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = readonly CsvCell[];

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  private readonly document = inject(DOCUMENT);

  download(filename: string, rows: readonly CsvRow[]): void {
    const content = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    this.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
