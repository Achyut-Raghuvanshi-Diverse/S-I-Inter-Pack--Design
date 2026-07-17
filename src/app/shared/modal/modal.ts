import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, ElementRef, HostListener, inject, input, OnDestroy, output, viewChild } from '@angular/core';
import { LucideX } from '@lucide/angular';
let nextModalId = 0;

@Component({
  selector: 'app-modal',
  imports: [LucideX],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private restoreFocus: HTMLElement | null = null;
  private inertSiblings: HTMLElement[] = [];
  private wasOpen = false;
  readonly componentId = `app-modal-${++nextModalId}`;
  readonly titleId = `${this.componentId}-title`;
  readonly descriptionId = `${this.componentId}-description`;

  readonly open = input(false);
  readonly inline = input(false);
  readonly title = input.required<string>();
  readonly description = input('');
  readonly eyebrow = input('Record details');
  readonly size = input<'medium' | 'large'>('medium');
  readonly closed = output<void>();

  constructor() {
    effect(() => {
      if (!this.open() || this.inline()) {
        this.document.body.classList.remove('modal-open');
        this.setBackgroundInert(false);
        if (this.wasOpen) window.setTimeout(() => this.restoreFocus?.focus());
        this.wasOpen = false;
        return;
      }
      if (!this.wasOpen) this.restoreFocus = this.document.activeElement as HTMLElement;
      this.wasOpen = true;
      this.document.body.classList.add('modal-open');
      this.setBackgroundInert(true);
      window.setTimeout(() => this.focusInitialControl());
    });
  }

  close(): void {
    this.closed.emit();
  }

  backdrop(event: MouseEvent): void {
    if (!this.inline() && event.target === event.currentTarget) this.close();
  }

  @HostListener('document:keydown', ['$event'])
  keydown(event: KeyboardEvent): void {
    if (!this.open() || this.inline()) return;
    if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
    if (event.key !== 'Tab') return;
    const controls = this.focusableControls();
    if (!controls.length) { event.preventDefault(); this.panel()?.nativeElement.focus(); return; }
    const first = controls[0]; const last = controls[controls.length - 1];
    if (event.shiftKey && this.document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && this.document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('modal-open');
    this.setBackgroundInert(false);
    if (this.wasOpen) window.setTimeout(() => this.restoreFocus?.focus());
    this.wasOpen = false;
  }

  private focusInitialControl(): void {
    const controls = this.focusableControls();
    (controls[0] ?? this.panel()?.nativeElement)?.focus();
  }

  private focusableControls(): HTMLElement[] {
    const panel = this.panel()?.nativeElement;
    if (!panel) return [];
    return [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((item) => item.offsetParent !== null);
  }

  private setBackgroundInert(inert: boolean): void {
    if (inert) {
      let current: HTMLElement | null = this.host.nativeElement;
      this.inertSiblings = [];
      while (current.parentElement && current.parentElement !== this.document.body) {
        const parent: HTMLElement = current.parentElement;
        this.inertSiblings.push(...[...parent.children].filter((item): item is HTMLElement => item instanceof HTMLElement && item !== current));
        current = parent;
      }
      for (const sibling of this.inertSiblings) { sibling.inert = true; sibling.setAttribute('aria-hidden', 'true'); }
      return;
    }
    for (const sibling of this.inertSiblings) { sibling.inert = false; sibling.removeAttribute('aria-hidden'); }
    this.inertSiblings = [];
  }
}
