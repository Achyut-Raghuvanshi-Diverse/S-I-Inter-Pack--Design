import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideInfo, LucideX } from '@lucide/angular';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [LucideCircleAlert, LucideCircleCheck, LucideInfo, LucideX],
  template: `
    <div class="toast-stack" aria-live="polite">
      @for (toast of service.messages(); track toast.id) {
        <article class="toast" [class]="'toast ' + toast.type" [attr.role]="toast.type === 'error' ? 'alert' : 'status'" aria-atomic="true">
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
    .toast-stack { position: fixed; z-index: 100; right: 20px; bottom: 20px; width: min(390px, calc(100vw - 28px)); display: grid; gap: 10px; }
    .toast { position: relative; min-height: 78px; padding: 14px 42px 14px 14px; display: grid; grid-template-columns: 35px 1fr; gap: 11px; background: color-mix(in srgb, var(--surface-card) 96%, transparent); border: 1px solid var(--border); border-left: 4px solid var(--blue-500); border-radius: 10px; box-shadow: var(--shadow-float); backdrop-filter: blur(12px); animation: toast-in .18s ease-out; }
    .toast.success { border-left-color: var(--green-500); }.toast.error { border-left-color: var(--red-500); }
    .toast-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 8px; color: var(--blue-500); background: var(--violet-50); }
    .toast.success .toast-icon { color: var(--green-700); background: var(--green-50); }.toast.error .toast-icon { color: var(--red-700); background: var(--red-50); }
    .toast div { min-width: 0; }.toast strong { color: var(--ink-900); font: 750 12px var(--font-display); }.toast p { margin: 4px 0 0; color: var(--ink-500); font-size: 9px; line-height: 1.45; }
    .toast button { position: absolute; right: 8px; top: 8px; width: 27px; height: 27px; display: grid; place-items: center; border: 0; background: transparent; color: var(--ink-400); cursor: pointer; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(7px); } }
    @media (max-width: 820px) { .toast-stack { bottom: 78px; right: 14px; } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet { readonly service = inject(ToastService); }
