import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideArrowUpDown,
  LucideDownload,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { ConfirmService } from '../../core/confirm.service';
import { CsvExportService } from '../../core/csv-export.service';
import { Plant, PlantStatus } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Modal } from '../../shared/modal/modal';
import { Pagination } from '../../shared/pagination/pagination';
import { SearchSelect } from '../../shared/search-select/search-select';
import { ControlStateDirective } from '../../shared/control-state.directive';

@Component({
  selector: 'app-plants',
  imports: [ReactiveFormsModule, ControlStateDirective, Modal, Pagination, SearchSelect, LucideArrowUpDown, LucideDownload, LucidePencil, LucidePlus, LucideSearch, LucideTrash2],
  templateUrl: './plants.html',
  styleUrl: './master-data.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Plants {
  readonly data = inject(DataStore);
  readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly csv = inject(CsvExportService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly view = signal<'list' | 'edit'>('list');
  readonly search = signal('');
  readonly statusFilter = signal('All statuses');
  readonly statusOptions = ['All statuses', 'On target', 'Behind', 'Over capacity'].map((value) => ({ value, label: value }));
  readonly operatingStatusOptions = ['On target', 'Behind', 'Over capacity'].map((value) => ({ value, label: value }));
  readonly sortKey = signal<keyof Plant>('name');
  readonly ascending = signal(true);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly selected = signal<number[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-\d{2}$/)]],
    name: ['', Validators.required], location: ['', Validators.required], state: ['', Validators.required],
    capacity: [10000, [Validators.required, Validators.min(1)]], output: [0, [Validators.required, Validators.min(0)]],
    status: ['On target' as PlantStatus, Validators.required], contact: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\+91\s\d{5}\s\d{5}$/)]],
  });

  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const key = this.sortKey();
    return [...this.data.plants()].filter((plant) => (!query || `${plant.code} ${plant.name} ${plant.location} ${plant.state} ${plant.contact}`.toLowerCase().includes(query)) && (this.statusFilter() === 'All statuses' || plant.status === this.statusFilter()))
      .sort((a, b) => {
        const comparison = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true });
        return this.ascending() ? comparison : -comparison;
      });
  });
  readonly paged = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  constructor() { this.search.set(this.route.snapshot.queryParamMap.get('q') ?? ''); }

  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  sort(key: keyof Plant): void { if (this.sortKey() === key) this.ascending.update((value) => !value); else { this.sortKey.set(key); this.ascending.set(true); } }
  ariaSort(key: keyof Plant): 'ascending' | 'descending' | null { return this.sortKey() === key ? (this.ascending() ? 'ascending' : 'descending') : null; }
  setStatusValue(value: string | number | null): void { this.statusFilter.set(String(value)); this.page.set(1); }
  statusClass(status: string): string { return status === 'On target' ? 'success' : status === 'Behind' ? 'warning' : 'danger'; }
  toggle(id: number): void { this.selected.update((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); }
  toggleAll(): void { this.selected.set(this.selected().length === this.paged().length ? [] : this.paged().map((plant) => plant.id)); }
  bulkOnTarget(): void { this.data.markPlants(this.selected(), 'On target'); this.toast.success('Plant statuses updated', `${this.selected().length} selected plant records were marked on target.`); this.selected.set([]); }
  exportCsv(): void { this.csv.download('si-inter-pack-plants.csv', [['Code','Plant','Location','Capacity','Output','Status'], ...this.filtered().map((plant) => [plant.code, plant.name, `${plant.location}, ${plant.state}`, plant.capacity, plant.output, plant.status])]); this.toast.success('Export ready', `${this.filtered().length} plant records were exported.`); }

  create(): void {
    this.editingId.set(null); this.form.reset({ code: '', name: '', location: '', state: '', capacity: 10000, output: 0, status: 'On target', contact: '', phone: '' }); this.view.set('edit');
  }
  edit(plant: Plant): void { this.editingId.set(plant.id); this.form.reset(plant); this.view.set('edit'); }
  cancel(): void { this.view.set('list'); this.form.markAsUntouched(); }
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const edited = !!this.editingId(); this.data.savePlant({ ...this.form.getRawValue(), id: this.editingId() ?? undefined }); this.view.set('list'); this.toast.success(edited ? 'Plant updated' : 'Plant created', `${this.form.controls.name.value} is visible in the plant master.`);
  }
  async remove(plant: Plant): Promise<void> {
    const confirmed = await this.confirm.confirm({ title: `Delete ${plant.name}?`, message: 'This plant record will be permanently removed and cannot be restored.', confirmLabel: 'Delete plant', eyebrow: 'Plant master', tone: 'danger' });
    if (!confirmed) return;
    this.data.deletePlant(plant.id);
    this.page.set(Math.min(this.page(), this.pages()));
    this.toast.success('Plant deleted', `${plant.name} was removed from the plant master.`);
  }
}
