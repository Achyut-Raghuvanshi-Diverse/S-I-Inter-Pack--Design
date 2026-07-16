import { Component, computed, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { LucideCheck, LucideChevronDown, LucideSearch } from '@lucide/angular';

export interface SearchSelectOption { value: string | number | null; label: string; description?: string; }

@Component({
  selector: 'app-search-select',
  imports: [LucideCheck, LucideChevronDown, LucideSearch],
  templateUrl: './search-select.html',
  styleUrl: './search-select.scss',
})
export class SearchSelect {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly options = input.required<SearchSelectOption[]>();
  readonly value = input<string | number | null>(null);
  readonly label = input('Select');
  readonly ariaLabel = input('Select an option');
  readonly searchable = input(true);
  readonly valueChange = output<string | number | null>();
  readonly open = signal(false);
  readonly query = signal('');
  readonly activeIndex = signal(0);
  readonly selected = computed(() => this.options().find((option) => String(option.value ?? '') === String(this.value() ?? '')) ?? this.options()[0]);
  readonly filtered = computed(() => { const query = this.query().trim().toLowerCase(); return this.options().filter((option) => !query || `${option.label} ${option.description ?? ''}`.toLowerCase().includes(query)); });

  toggle(): void { this.open.update((value) => !value); this.query.set(''); this.activeIndex.set(0); }
  choose(option: SearchSelectOption): void { this.valueChange.emit(option.value); this.open.set(false); this.query.set(''); }
  updateQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); this.activeIndex.set(0); }
  same(a: unknown, b: unknown): boolean { return String(a ?? '') === String(b ?? ''); }
  buttonKeydown(event: KeyboardEvent): void { if (['ArrowDown', 'Enter', ' '].includes(event.key)) { event.preventDefault(); if (!this.open()) this.toggle(); } }
  searchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.open.set(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const offset = event.key === 'ArrowDown' ? 1 : -1; this.activeIndex.update((index) => Math.max(0, Math.min(this.filtered().length - 1, index + offset))); }
    if (event.key === 'Enter' && this.filtered()[this.activeIndex()]) { event.preventDefault(); this.choose(this.filtered()[this.activeIndex()]); }
  }
  @HostListener('document:mousedown', ['$event']) outside(event: MouseEvent): void { if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false); }
}
