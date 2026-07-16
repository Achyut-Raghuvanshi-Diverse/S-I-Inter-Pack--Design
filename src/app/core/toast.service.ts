import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; type: ToastType; title: string; message: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);

  success(title: string, message: string): void { this.show('success', title, message); }
  error(title: string, message: string): void { this.show('error', title, message); }
  info(title: string, message: string): void { this.show('info', title, message); }
  dismiss(id: number): void { this.messages.update((items) => items.filter((item) => item.id !== id)); }

  private show(type: ToastType, title: string, message: string): void {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    this.messages.update((items) => [...items.slice(-2), { id, type, title, message }]);
    window.setTimeout(() => this.dismiss(id), 4200);
  }
}
