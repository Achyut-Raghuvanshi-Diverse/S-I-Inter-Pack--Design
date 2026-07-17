import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideArrowUpDown,
  LucideBarcode,
  LucideBoxes,
  LucideDownload,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { ConfirmService } from '../../core/confirm.service';
import { CsvExportService } from '../../core/csv-export.service';
import { Article, VehicleSegment } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Modal } from '../../shared/modal/modal';
import { Pagination } from '../../shared/pagination/pagination';
import { SearchSelect } from '../../shared/search-select/search-select';
import { ControlStateDirective } from '../../shared/control-state.directive';

@Component({
  selector: 'app-articles',
  imports: [ReactiveFormsModule, ControlStateDirective, Modal, Pagination, SearchSelect, LucideArrowUpDown, LucideBarcode, LucideBoxes, LucideDownload, LucidePencil, LucidePlus, LucideSearch, LucideTrash2],
  templateUrl: './articles.html',
  styleUrl: './master-data.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Articles {
  readonly data = inject(DataStore);
  readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly csv = inject(CsvExportService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly view = signal<'list' | 'edit'>('list');
  readonly search = signal('');
  readonly segmentFilter = signal('All segments');
  readonly activeFilter = signal('Active and inactive');
  readonly segmentOptions = ['All segments', 'Passenger', 'Commercial', 'Utility'].map((value) => ({ value, label: value }));
  readonly articleSegmentOptions = ['Passenger', 'Commercial', 'Utility'].map((value) => ({ value, label: value }));
  readonly availabilityOptions = ['Active and inactive', 'Active only'].map((value) => ({ value, label: value }));
  readonly plantFilter = signal<number | null>(null);
  readonly sortKey = signal<keyof Article>('modelName');
  readonly ascending = signal(true);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly editingId = signal<number | null>(null);
  readonly selectedPlantIds = signal<number[]>([]);
  readonly plantSearch = signal('');
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^SIP-[A-Z0-9-]{6,}$/)]],
    modelName: ['', Validators.required], segment: ['Passenger' as VehicleSegment, Validators.required],
    coverType: ['', Validators.required], material: ['', Validators.required],
    unitCost: [0, [Validators.required, Validators.min(1)]], unitPrice: [0, [Validators.required, Validators.min(1)]],
    barcode: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]], active: [true],
  });
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase(); const key = this.sortKey();
    return [...this.data.articles()].filter((article) => (!query || `${article.code} ${article.modelName} ${article.material} ${article.segment}`.toLowerCase().includes(query)) && (this.segmentFilter() === 'All segments' || article.segment === this.segmentFilter()) && (this.activeFilter() === 'Active and inactive' || article.active) && (!this.plantFilter() || article.plantIds.includes(this.plantFilter()!)))
      .sort((a, b) => { const result = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true }); return this.ascending() ? result : -result; });
  });
  readonly filteredPlants = computed(() => {
    const query = this.plantSearch().trim().toLowerCase();
    return this.data.plants().filter((plant) => !query || `${plant.code} ${plant.name} ${plant.location}`.toLowerCase().includes(query));
  });
  readonly paged = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  constructor() { this.search.set(this.route.snapshot.queryParamMap.get('q') ?? ''); this.plantFilter.set(Number(this.route.snapshot.queryParamMap.get('plant')) || null); }

  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  updatePlantSearch(event: Event): void { this.plantSearch.set((event.target as HTMLInputElement).value); }
  setSegmentValue(value: string | number | null): void { this.segmentFilter.set(String(value)); this.page.set(1); }
  setActiveValue(value: string | number | null): void { this.activeFilter.set(String(value)); this.page.set(1); }
  sort(key: keyof Article): void { if (this.sortKey() === key) this.ascending.update((value) => !value); else { this.sortKey.set(key); this.ascending.set(true); } }
  ariaSort(key: keyof Article): 'ascending' | 'descending' | null { return this.sortKey() === key ? (this.ascending() ? 'ascending' : 'descending') : null; }
  plantCodes(ids: number[]): string { return ids.map((id) => this.data.plantCode(id)).join(', '); }
  margin(article: Article): number { return (article.unitPrice - article.unitCost) / article.unitPrice * 100; }
  clearPlantFilter(): void { this.plantFilter.set(null); this.page.set(1); }
  exportCsv(): void { this.csv.download('si-inter-pack-articles.csv', [['Code','Article','Segment','Material','Cost','Price','Plants','Status'], ...this.filtered().map((article) => [article.code, article.modelName, article.segment, article.material, article.unitCost, article.unitPrice, this.plantCodes(article.plantIds), article.active ? 'Active' : 'Inactive'])]); this.toast.success('Export ready', `${this.filtered().length} article records were exported.`); }
  create(): void { this.editingId.set(null); this.plantSearch.set(''); this.selectedPlantIds.set([1]); this.form.reset({ code: '', modelName: '', segment: 'Passenger', coverType: '', material: '', unitCost: 0, unitPrice: 0, barcode: '', active: true }); this.view.set('edit'); }
  edit(article: Article): void { this.editingId.set(article.id); this.plantSearch.set(''); this.selectedPlantIds.set([...article.plantIds]); this.form.reset(article); this.view.set('edit'); }
  cancel(): void { this.view.set('list'); }
  togglePlant(id: number): void { this.selectedPlantIds.update((ids) => ids.includes(id) ? ids.filter((plantId) => plantId !== id) : [...ids, id]); }
  save(): void {
    if (this.form.invalid || !this.selectedPlantIds().length) { this.form.markAllAsTouched(); return; }
    const edited = !!this.editingId(); this.data.saveArticle({ ...this.form.getRawValue(), plantIds: this.selectedPlantIds(), id: this.editingId() ?? undefined }); this.view.set('list'); this.toast.success(edited ? 'Article updated' : 'Article created', `${this.form.controls.modelName.value} is visible in the article master.`);
  }
  async remove(article: Article): Promise<void> {
    const confirmed = await this.confirm.confirm({ title: `Delete ${article.modelName}?`, message: 'This article and its plant assignments will be permanently removed.', confirmLabel: 'Delete article', eyebrow: 'Article master', tone: 'danger' });
    if (!confirmed) return;
    this.data.deleteArticle(article.id);
    this.page.set(Math.min(this.page(), this.pages()));
    this.toast.success('Article deleted', `${article.modelName} was removed from the article master.`);
  }
}
