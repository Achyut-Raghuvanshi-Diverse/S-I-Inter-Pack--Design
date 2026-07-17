import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly modeState = signal<ThemeMode>(this.initialMode());
  readonly mode = this.modeState.asReadonly();

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.documentElement.dataset['theme'] = mode;
      this.document.documentElement.style.colorScheme = mode;
      if (this.isBrowser) localStorage.setItem('si-theme', mode);
    });
  }

  toggle(): void { this.modeState.update((mode) => mode === 'light' ? 'dark' : 'light'); }

  private initialMode(): ThemeMode {
    if (!this.isBrowser) return 'light';
    const saved = localStorage.getItem('si-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
