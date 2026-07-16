import { Component, computed, inject, signal } from '@angular/core';
import {
  LucideArrowUpDown,
  LucideCalendarDays,
  LucideChevronLeft,
  LucideChevronRight,
  LucideDownload,
  LucideIndianRupee,
  LucidePackageCheck,
  LucideSearch,
  LucideTruck,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { LedgerEntry } from '../../core/models';

@Component({
  selector: 'app-sales',
  imports: [LucideArrowUpDown, LucideCalendarDays, LucideChevronLeft, LucideChevronRight, LucideDownload, LucideIndianRupee, LucidePackageCheck, LucideSearch, LucideTruck],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
})
export class Sales {
  readonly data = inject(DataStore);
  readonly search = signal('');
  readonly plantId = signal<number | null>(null);
  readonly status = signal('All statuses');
  readonly sortKey = signal<keyof LedgerEntry>('date');
  readonly ascending = signal(false);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim(); const plantId = this.plantId(); const status = this.status(); const key = this.sortKey();
    return [...this.data.ledger()].filter((entry) => {
      const matchText = `${entry.invoice} ${entry.customer} ${this.data.articleName(entry.articleId)} ${this.data.plantName(entry.plantId)}`.toLowerCase();
      return (!query || matchText.includes(query)) && (!plantId || entry.plantId === plantId) && (status === 'All statuses' || entry.status === status);
    }).sort((a, b) => { const result = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true }); return this.ascending() ? result : -result; });
  });
  readonly totalUnits = computed(() => this.filtered().reduce((sum, entry) => sum + entry.quantity, 0));
  readonly totalValue = computed(() => this.filtered().reduce((sum, entry) => sum + entry.quantity * entry.rate, 0));
  readonly averageRate = computed(() => this.totalUnits() ? this.totalValue() / this.totalUnits() : 0);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.pages() }, (_, index) => index + 1));
  readonly paged = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));

  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  setPlant(event: Event): void { this.plantId.set(Number((event.target as HTMLSelectElement).value) || null); this.page.set(1); }
  setStatus(event: Event): void { this.status.set((event.target as HTMLSelectElement).value); this.page.set(1); }
  sort(key: keyof LedgerEntry): void { if (this.sortKey() === key) this.ascending.update((value) => !value); else { this.sortKey.set(key); this.ascending.set(true); } }
  statusClass(status: string): string { return status === 'Delivered' ? 'success' : status === 'In transit' ? 'warning' : 'violet'; }
  value(entry: LedgerEntry): number { return entry.quantity * entry.rate; }
  maxShown(): number { return Math.min(this.page() * this.pageSize, this.filtered().length); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.pages(), this.page() + 1)); }
  plantCode(id: number): string { return this.data.plants().find((plant) => plant.id === id)?.code ?? '—'; }

  exportCsv(): void {
    const header = ['Date', 'Plant', 'Article code', 'Article', 'Customer', 'Quantity', 'Rate', 'Total value', 'Status', 'Invoice'];
    const rows = this.filtered().map((entry) => {
      const article = this.data.articles().find((item) => item.id === entry.articleId)!;
      return [entry.date, this.data.plantName(entry.plantId), article.code, article.modelName, entry.customer, entry.quantity, entry.rate, this.value(entry), entry.status, entry.invoice];
    });
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'si-inter-pack-dispatch-ledger.csv'; link.click(); URL.revokeObjectURL(link.href);
  }
}
