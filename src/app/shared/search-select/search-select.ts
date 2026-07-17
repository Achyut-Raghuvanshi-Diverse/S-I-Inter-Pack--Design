import { ChangeDetectionStrategy, Component, computed, ElementRef, forwardRef, HostListener, inject, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCheck, LucideChevronDown, LucideSearch } from '@lucide/angular';

export interface SearchSelectOption { value: string | number | null; label: string; description?: string; }
let nextSelectId = 0;

@Component({
  selector: 'app-search-select',
  imports: [LucideCheck, LucideChevronDown, LucideSearch],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelect), multi: true }],
  templateUrl: './search-select.html',
  styleUrl: './search-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchSelect implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly componentId = `search-select-${++nextSelectId}`;
  readonly listboxId = `${this.componentId}-listbox`;
  readonly options = input.required<SearchSelectOption[]>();
  readonly value = input<string | number | null>(null);
  readonly label = input('');
  readonly ariaLabel = input('Select an option');
  readonly placeholder = input('Select an option');
  readonly searchable = input(true);
  readonly variant = input<'compact' | 'field'>('compact');
  readonly align = input<'start' | 'end'>('start');
  readonly disabled = input(false);
  readonly valueChange = output<string | number | null>();
  readonly open = signal(false);
  readonly query = signal('');
  readonly activeIndex = signal(0);
  readonly menuPosition = signal<{ top: number | null; bottom: number | null; left: number; width: number }>({ top: 0, bottom: null, left: 0, width: 270 });
  private readonly formMode = signal(false);
  private readonly formValue = signal<string | number | null>(null);
  private readonly formDisabled = signal(false);
  readonly currentValue = computed(() => this.formMode() ? this.formValue() : this.value());
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  readonly selected = computed(() => this.options().find((option) => this.same(option.value, this.currentValue())) ?? null);
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.options().filter((option) => !query || `${option.label} ${option.description ?? ''}`.toLowerCase().includes(query));
  });
  readonly activeOptionId = computed(() => this.open() && this.filtered()[this.activeIndex()] ? `${this.componentId}-option-${this.activeIndex()}` : null);
  private onChange: (value: string | number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  toggle(): void {
    if (this.isDisabled()) return;
    const willOpen = !this.open();
    this.open.set(willOpen);
    this.query.set('');
    this.activeIndex.set(Math.max(0, this.options().findIndex((option) => this.same(option.value, this.currentValue()))));
    if (willOpen) this.positionMenu();
  }
  choose(option: SearchSelectOption): void {
    if (this.formMode()) this.formValue.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.valueChange.emit(option.value);
    this.open.set(false);
    this.query.set('');
  }
  updateQuery(event: Event): void { this.query.set((event.target as HTMLInputElement).value); this.activeIndex.set(0); }
  same(a: unknown, b: unknown): boolean { return String(a ?? '') === String(b ?? ''); }
  buttonKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    if (!this.open() && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); this.toggle(); return; }
    if (this.open()) this.navigate(event);
  }
  searchKeydown(event: KeyboardEvent): void { this.navigate(event); }
  touch(): void { this.onTouched(); }
  writeValue(value: string | number | null): void { this.formMode.set(true); this.formValue.set(value); }
  registerOnChange(fn: (value: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); if (disabled) this.open.set(false); }

  @HostListener('document:mousedown', ['$event'])
  outside(event: MouseEvent): void { if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false); }
  @HostListener('document:keydown.escape')
  escape(): void { this.open.set(false); }
  @HostListener('window:resize')
  resized(): void { if (this.open()) this.positionMenu(); }
  @HostListener('window:scroll')
  scrolled(): void { this.open.set(false); }

  private navigate(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.open.set(false); return; }
    if (event.key === 'Tab') { this.open.set(false); this.onTouched(); return; }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.activeIndex.set(event.key === 'Home' ? 0 : Math.max(0, this.filtered().length - 1));
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex.update((index) => Math.max(0, Math.min(this.filtered().length - 1, index + offset)));
    }
    if (event.key === 'Enter' && this.filtered()[this.activeIndex()]) { event.preventDefault(); this.choose(this.filtered()[this.activeIndex()]); }
  }

  private positionMenu(): void {
    const trigger = this.host.nativeElement.querySelector<HTMLElement>('.select-trigger');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    if (window.innerWidth <= 560) {
      this.menuPosition.set({ top: null, bottom: 10, left: 10, width: window.innerWidth - 20 });
      return;
    }
    const width = Math.max(rect.width, 270);
    const left = Math.max(10, Math.min(this.align() === 'end' ? rect.right - width : rect.left, window.innerWidth - width - 10));
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      this.menuPosition.set({ top: null, bottom: window.innerHeight - rect.top + 7, left, width });
    } else {
      this.menuPosition.set({ top: rect.bottom + 7, bottom: null, left, width });
    }
  }
}
