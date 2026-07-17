import { Component, computed, inject, signal } from '@angular/core';
import {
  LucideBarcode,
  LucideCamera,
  LucideCheckCircle2,
  LucideDownload,
  LucideKeyboard,
  LucideSearch,
  LucideWifiOff,
} from '@lucide/angular';
import { AuthStore } from '../../core/auth.store';
import { DataStore } from '../../core/data.store';
import { ScanRecord, ScanSource } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Pagination } from '../../shared/pagination/pagination';
import { SearchSelect } from '../../shared/search-select/search-select';

@Component({
  selector: 'app-barcode-records',
  imports: [
    Pagination, SearchSelect, LucideBarcode, LucideCamera, LucideCheckCircle2, LucideDownload,
    LucideKeyboard, LucideSearch, LucideWifiOff,
  ],
  templateUrl: './barcode-records.html',
  styleUrl: './barcode-records.scss',
})
export class BarcodeRecords {
  readonly auth = inject(AuthStore);
  readonly data = inject(DataStore);
  readonly toast = inject(ToastService);
  readonly search = signal('');
  readonly plantId = signal<number | null>(null);
  readonly source = signal<'All methods' | ScanSource>('All methods');
  readonly syncStatus = signal<'All statuses' | ScanRecord['syncStatus']>('All statuses');
  readonly plantOptions = computed(() => [{ value: null, label: 'All plants', description: 'Every plant location' }, ...this.data.plants().map((plant) => ({ value: plant.id, label: `${plant.code} — ${plant.name}`, description: `${plant.location}, ${plant.state}` }))]);
  readonly sourceOptions = ['All methods', 'Camera', 'Manual'].map((value) => ({ value, label: value }));
  readonly syncOptions = ['All statuses', 'Synced', 'Pending'].map((value) => ({ value, label: value }));
  readonly page = signal(1);
  readonly pageSize = 10;

  readonly plantLocked = computed(() => this.auth.role() === 'Plant Operator');
  readonly scoped = computed(() => this.data.scans().filter((scan) =>
    !this.plantLocked() || scan.plantId === this.auth.assignedPlantId()));
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.scoped().filter((scan) => {
      const matchesQuery = !query || [scan.barcode, scan.articleCode, scan.articleName, this.data.plantName(scan.plantId)]
        .some((value) => value.toLowerCase().includes(query));
      const matchesPlant = this.plantLocked() || !this.plantId() || scan.plantId === this.plantId();
      const matchesSource = this.source() === 'All methods' || scan.source === this.source();
      const matchesStatus = this.syncStatus() === 'All statuses' || scan.syncStatus === this.syncStatus();
      return matchesQuery && matchesPlant && matchesSource && matchesStatus;
    });
  });
  readonly paged = computed(() => this.filtered().slice(
    (this.page() - 1) * this.pageSize,
    this.page() * this.pageSize,
  ));
  readonly cameraScans = computed(() => this.scoped().filter((scan) => scan.source === 'Camera').length);
  readonly manualScans = computed(() => this.scoped().filter((scan) => scan.source === 'Manual').length);
  readonly pendingScans = computed(() => this.scoped().filter((scan) => scan.syncStatus === 'Pending').length);

  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  setPlantValue(value: string | number | null): void { this.plantId.set(Number(value) || null); this.page.set(1); }
  setSourceValue(value: string | number | null): void { this.source.set(String(value) as 'All methods' | ScanSource); this.page.set(1); }
  setStatusValue(value: string | number | null): void { this.syncStatus.set(String(value) as 'All statuses' | ScanRecord['syncStatus']); this.page.set(1); }
  plantCode(id: number): string { return this.data.plants().find((plant) => plant.id === id)?.code ?? '—'; }
  date(value: Date): string { return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)); }
  time(value: Date): string { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }

  exportCsv(): void {
    const header = ['Date', 'Time', 'Barcode', 'Article code', 'Article', 'Plant', 'Entry method', 'Sync status'];
    const rows = this.filtered().map((scan) => [
      this.date(scan.timestamp), this.time(scan.timestamp), scan.barcode, scan.articleCode,
      scan.articleName, this.data.plantName(scan.plantId), scan.source, scan.syncStatus,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'si-inter-pack-barcode-records.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    this.toast.success('Barcode export ready', `${this.filtered().length} barcode records were exported.`);
  }
}
