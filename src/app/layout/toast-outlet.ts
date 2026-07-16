import { Component, inject } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideInfo, LucideX } from '@lucide/angular';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [LucideCircleAlert, LucideCircleCheck, LucideInfo, LucideX],
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (toast of service.messages(); track toast.id) {
        <article class="toast" [class]="'toast ' + toast.type">
          <span class="toast-icon">
            @if (toast.type === 'success') { <svg lucideCircleCheck size="19"></svg> }
            @else if (toast.type === 'error') { <svg lucideCircleAlert size="19"></svg> }
            @else { <svg lucideInfo size="19"></svg> }
          </span>
          <div><strong>{{ toast.title }}</strong><p>{{ toast.message }}</p></div>
          <button type="button" aria-label="Dismiss notification" (click)="service.dismiss(toast.id)"><svg lucideX size="15"></svg></button>
        </article>
      }
    </div>
  `,
  styles: [`
    .toast-stack { position: fixed; z-index: 100; right: 18px; bottom: 18px; width: min(370px, calc(100vw - 28px)); display: grid; gap: 8px; }
    .toast { position: relative; min-height: 72px; padding: 12px 40px 12px 12px; display: grid; grid-template-columns: 31px 1fr; gap: 9px; background: white; border: 1px solid var(--border); border-left: 4px solid var(--blue-500); box-shadow: 0 12px 36px rgba(24,27,52,.18); animation: toast-in .18s ease-out; }
    .toast.success { border-left-color: var(--green-500); }.toast.error { border-left-color: var(--red-500); }
    .toast-icon { width: 29px; height: 29px; display: grid; place-items: center; color: var(--blue-600); background: #edf4fb; }
    .toast.success .toast-icon { color: var(--green-700); background: var(--green-50); }.toast.error .toast-icon { color: var(--red-700); background: var(--red-50); }
    .toast div { min-width: 0; }.toast strong { color: var(--ink-900); font-size: 11px; }.toast p { margin: 3px 0 0; color: var(--ink-500); font-size: 9px; line-height: 1.4; }
    .toast button { position: absolute; right: 8px; top: 8px; width: 27px; height: 27px; display: grid; place-items: center; border: 0; background: transparent; color: var(--ink-400); cursor: pointer; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(7px); } }
    @media (max-width: 820px) { .toast-stack { bottom: 78px; right: 14px; } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `],
})
export class ToastOutlet { readonly service = inject(ToastService); }
