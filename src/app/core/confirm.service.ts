import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  eyebrow?: string;
  tone?: 'default' | 'danger';
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly activeRequest = signal<ConfirmOptions | null>(null);
  private resolver: ((confirmed: boolean) => void) | null = null;
  readonly request = this.activeRequest.asReadonly();

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.resolver?.(false);
    this.activeRequest.set(options);
    return new Promise<boolean>((resolve) => { this.resolver = resolve; });
  }

  resolve(confirmed: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.activeRequest.set(null);
    resolver?.(confirmed);
  }
}
