import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  LucideArrowUpDown,
  LucideCalendarDays,
  LucideDownload,
  LucideIndianRupee,
  LucidePackageCheck,
  LucideSearch,
  LucideTruck,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { CsvExportService } from '../../core/csv-export.service';
import { LedgerEntry } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Pagination } from '../../shared/pagination/pagination';
import { SearchSelect } from '../../shared/search-select/search-select';

@Component({
  selector: 'app-sales',
  imports: [Pagination, SearchSelect, LucideArrowUpDown, LucideCalendarDays, LucideDownload, LucideIndianRupee, LucidePackageCheck, LucideSearch, LucideTruck],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sales {
  readonly data = inject(DataStore);
  readonly toast = inject(ToastService);
  private readonly csv = inject(CsvExportService);
  private readonly route = inject(ActivatedRoute);
  readonly search = signal('');
  readonly plantId = signal<number | null>(null);
  readonly plantOptions = computed(() => [{ value: null, label: 'All plants', description: 'All dispatch locations' }, ...this.data.plants().map((plant) => ({ value: plant.id, label: `${plant.code} — ${plant.name}`, description: `${plant.location}, ${plant.state}` }))]);
  readonly status = signal('All statuses');
  readonly statusOptions = ['All statuses', 'Delivered', 'In transit', 'Ready'].map((value) => ({ value, label: value }));
  readonly dateFrom = signal('2020-01-01');
  readonly dateTo = signal(new Date().toISOString().slice(0, 10));
  readonly sortKey = signal<keyof LedgerEntry>('date');
  readonly ascending = signal(false);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim(); const plantId = this.plantId(); const status = this.status(); const key = this.sortKey();
    return [...this.data.ledger()].filter((entry) => {
      const matchText = `${entry.invoice} ${entry.customer} ${this.data.articleName(entry.articleId)} ${this.data.plantName(entry.plantId)}`.toLowerCase();
      return (!query || matchText.includes(query)) && (!plantId || entry.plantId === plantId) && (status === 'All statuses' || entry.status === status) && entry.date >= this.dateFrom() && entry.date <= this.dateTo();
    }).sort((a, b) => { const result = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true }); return this.ascending() ? result : -result; });
  });
  readonly totalUnits = computed(() => this.filtered().reduce((sum, entry) => sum + entry.quantity, 0));
  readonly totalValue = computed(() => this.filtered().reduce((sum, entry) => sum + entry.quantity * entry.rate, 0));
  readonly averageRate = computed(() => this.totalUnits() ? this.totalValue() / this.totalUnits() : 0);
  readonly paged = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));

  constructor() { this.plantId.set(Number(this.route.snapshot.queryParamMap.get('plant')) || null); }

  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  setPlantValue(value: string | number | null): void { this.plantId.set(Number(value) || null); this.page.set(1); }
  setStatusValue(value: string | number | null): void { this.status.set(String(value)); this.page.set(1); }
  setDateFrom(event: Event): void { this.dateFrom.set((event.target as HTMLInputElement).value); this.page.set(1); }
  setDateTo(event: Event): void { this.dateTo.set((event.target as HTMLInputElement).value); this.page.set(1); }
  sort(key: keyof LedgerEntry): void { if (this.sortKey() === key) this.ascending.update((value) => !value); else { this.sortKey.set(key); this.ascending.set(true); } }
  ariaSort(key: keyof LedgerEntry): 'ascending' | 'descending' | null { return this.sortKey() === key ? (this.ascending() ? 'ascending' : 'descending') : null; }
  statusClass(status: string): string { return status === 'Delivered' ? 'success' : status === 'In transit' ? 'warning' : 'violet'; }
  value(entry: LedgerEntry): number { return entry.quantity * entry.rate; }
  exportCsv(): void {
    const header = ['Date', 'Plant', 'Article code', 'Article', 'Customer', 'Quantity', 'Rate', 'Total value', 'Status', 'Invoice'];
    const rows = this.filtered().map((entry) => {
      const article = this.data.articleById(entry.articleId);
      return [entry.date, this.data.plantCode(entry.plantId), article?.code ?? '—', article?.modelName ?? 'Unknown article', entry.customer, entry.quantity, entry.rate, this.value(entry), entry.status, entry.invoice];
    });
    this.csv.download('si-inter-pack-dispatch-ledger.csv', [header, ...rows]);
    this.toast.success('Ledger export ready', `${this.filtered().length} filtered dispatch records were exported.`);
  }
}
