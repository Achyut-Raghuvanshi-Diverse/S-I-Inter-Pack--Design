import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideArrowLeft,
  LucideArrowUpDown,
  LucideBarcode,
  LucideBoxes,
  LucideChevronLeft,
  LucideChevronRight,
  LucideDownload,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { Article, VehicleSegment } from '../../core/models';

@Component({
  selector: 'app-articles',
  imports: [ReactiveFormsModule, LucideArrowLeft, LucideArrowUpDown, LucideBarcode, LucideBoxes, LucideChevronLeft, LucideChevronRight, LucideDownload, LucidePencil, LucidePlus, LucideSearch, LucideTrash2],
  templateUrl: './articles.html',
  styleUrl: './master-data.scss',
})
export class Articles {
  readonly data = inject(DataStore);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly view = signal<'list' | 'edit'>('list');
  readonly search = signal('');
  readonly sortKey = signal<keyof Article>('modelName');
  readonly ascending = signal(true);
  readonly page = signal(1);
  readonly pageSize = 8;
  readonly editingId = signal<number | null>(null);
  readonly selectedPlantIds = signal<number[]>([]);
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^SIP-[A-Z0-9-]{6,}$/)]],
    modelName: ['', Validators.required], segment: ['Passenger' as VehicleSegment, Validators.required],
    coverType: ['', Validators.required], material: ['', Validators.required],
    unitCost: [0, [Validators.required, Validators.min(1)]], unitPrice: [0, [Validators.required, Validators.min(1)]],
    barcode: ['', [Validators.required, Validators.pattern(/^\d{13}$/)]], active: [true],
  });
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase(); const key = this.sortKey();
    return [...this.data.articles()].filter((article) => !query || `${article.code} ${article.modelName} ${article.material} ${article.segment}`.toLowerCase().includes(query))
      .sort((a, b) => { const result = String(a[key]).localeCompare(String(b[key]), undefined, { numeric: true }); return this.ascending() ? result : -result; });
  });
  readonly paged = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.pages() }, (_, index) => index + 1));

  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  sort(key: keyof Article): void { if (this.sortKey() === key) this.ascending.update((value) => !value); else { this.sortKey.set(key); this.ascending.set(true); } }
  plantCodes(ids: number[]): string { return ids.map((id) => this.data.plants().find((plant) => plant.id === id)?.code).filter(Boolean).join(', '); }
  margin(article: Article): number { return (article.unitPrice - article.unitCost) / article.unitPrice * 100; }
  maxShown(): number { return Math.min(this.page() * this.pageSize, this.filtered().length); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.pages(), this.page() + 1)); }
  create(): void { this.editingId.set(null); this.selectedPlantIds.set([1]); this.form.reset({ code: '', modelName: '', segment: 'Passenger', coverType: '', material: '', unitCost: 0, unitPrice: 0, barcode: '', active: true }); this.view.set('edit'); }
  edit(article: Article): void { this.editingId.set(article.id); this.selectedPlantIds.set([...article.plantIds]); this.form.reset(article); this.view.set('edit'); }
  cancel(): void { this.view.set('list'); }
  togglePlant(id: number): void { this.selectedPlantIds.update((ids) => ids.includes(id) ? ids.filter((plantId) => plantId !== id) : [...ids, id]); }
  save(): void {
    if (this.form.invalid || !this.selectedPlantIds().length) { this.form.markAllAsTouched(); return; }
    this.data.saveArticle({ ...this.form.getRawValue(), plantIds: this.selectedPlantIds(), id: this.editingId() ?? undefined }); this.view.set('list');
  }
  remove(article: Article): void { if (confirm(`Delete ${article.modelName}? This cannot be undone.`)) this.data.deleteArticle(article.id); }
}
