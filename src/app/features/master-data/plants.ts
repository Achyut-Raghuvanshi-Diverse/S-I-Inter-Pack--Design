import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowUpDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideDownload,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { Plant, PlantStatus } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-plants',
  imports: [ReactiveFormsModule, LucideArrowLeft, LucideArrowUpDown, LucideChevronLeft, LucideChevronRight, LucideDownload, LucidePencil, LucidePlus, LucideSearch, LucideTrash2],
  templateUrl: './plants.html',
  styleUrl: './master-data.scss',
})
export class Plants {
  readonly data = inject(DataStore);
  readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly view = signal<'list' | 'edit'>('list');
  readonly search = signal('');
  readonly statusFilter = signal('All statuses');
  readonly sortKey = signal<keyof Plant>('name');
  readonly ascending = signal(true);
  readonly page = signal(1);
  readonly pageSize = 8;
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
  readonly pageNumbers = computed(() => Array.from({ length: this.pages() }, (_, index) => index + 1));

  constructor() { this.search.set(this.route.snapshot.queryParamMap.get('q') ?? ''); }

  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  sort(key: keyof Plant): void { if (this.sortKey() === key) this.ascending.update((value) => !value); else { this.sortKey.set(key); this.ascending.set(true); } }
  setStatus(event: Event): void { this.statusFilter.set((event.target as HTMLSelectElement).value); this.page.set(1); }
  statusClass(status: string): string { return status === 'On target' ? 'success' : status === 'Behind' ? 'warning' : 'danger'; }
  toggle(id: number): void { this.selected.update((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); }
  toggleAll(): void { this.selected.set(this.selected().length === this.paged().length ? [] : this.paged().map((plant) => plant.id)); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.pages(), this.page() + 1)); }
  maxShown(): number { return Math.min(this.page() * this.pageSize, this.filtered().length); }
  bulkOnTarget(): void { this.data.plants.update((plants) => plants.map((plant) => this.selected().includes(plant.id) ? { ...plant, status: 'On target' } : plant)); this.toast.success('Plant statuses updated', `${this.selected().length} selected plant records were marked on target.`); this.selected.set([]); }
  exportCsv(): void { const csv = [['Code','Plant','Location','Capacity','Output','Status'], ...this.filtered().map((plant) => [plant.code, plant.name, `${plant.location}, ${plant.state}`, plant.capacity, plant.output, plant.status])].map((row) => row.map((value) => `"${value}"`).join(',')).join('\r\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'si-inter-pack-plants.csv'; link.click(); URL.revokeObjectURL(link.href); this.toast.success('Export ready', `${this.filtered().length} plant records were exported.`); }

  create(): void {
    this.editingId.set(null); this.form.reset({ code: '', name: '', location: '', state: '', capacity: 10000, output: 0, status: 'On target', contact: '', phone: '' }); this.view.set('edit');
  }
  edit(plant: Plant): void { this.editingId.set(plant.id); this.form.reset(plant); this.view.set('edit'); }
  cancel(): void { this.view.set('list'); this.form.markAsUntouched(); }
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const edited = !!this.editingId(); this.data.savePlant({ ...this.form.getRawValue(), id: this.editingId() ?? undefined }); this.view.set('list'); this.toast.success(edited ? 'Plant updated' : 'Plant created', `${this.form.controls.name.value} is visible in the plant master.`);
  }
  remove(plant: Plant): void { if (confirm(`Delete ${plant.name}? This cannot be undone.`)) { this.data.deletePlant(plant.id); this.toast.success('Plant deleted', `${plant.name} was removed from the plant master.`); } }
}
