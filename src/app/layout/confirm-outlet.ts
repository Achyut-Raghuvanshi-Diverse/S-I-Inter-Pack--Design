import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';
import { ConfirmService } from '../core/confirm.service';
import { Modal } from '../shared/modal/modal';

@Component({
  selector: 'app-confirm-outlet',
  imports: [Modal, LucideTriangleAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (service.request(); as request) {
      <app-modal [open]="true" [title]="request.title" [description]="request.message" [eyebrow]="request.eyebrow ?? 'Confirm action'" (closed)="service.resolve(false)">
        <div modal-body class="confirm-body" [class.danger]="request.tone === 'danger'">
          <span><svg lucideTriangleAlert size="23"></svg></span>
          <div><strong>This action needs confirmation</strong><p>Please review the details above before continuing.</p></div>
        </div>
        <div modal-footer class="confirm-actions">
          <button class="btn btn-secondary" type="button" (click)="service.resolve(false)">Cancel</button>
          <button class="btn" [class.btn-danger-solid]="request.tone === 'danger'" [class.btn-primary]="request.tone !== 'danger'" type="button" (click)="service.resolve(true)">{{ request.confirmLabel ?? 'Confirm' }}</button>
        </div>
      </app-modal>
    }
  `,
  styles: [`
    .confirm-body { padding: 20px; display: flex; align-items: center; gap: 13px; }
    .confirm-body > span { flex: 0 0 43px; width: 43px; height: 43px; display: grid; place-items: center; border-radius: 11px; color: var(--amber-800); background: var(--amber-50); border: 1px solid var(--amber-200); }
    .confirm-body.danger > span { color: var(--red-700); background: var(--red-50); border-color: var(--red-200); }
    .confirm-body div { min-width: 0; }.confirm-body strong { color: var(--ink-900); font-size: 11px; }.confirm-body p { margin: 3px 0 0; color: var(--ink-500); font-size: 9px; }
    .confirm-actions { display: flex; gap: 8px; }.btn-danger-solid { color: white; background: var(--red-700); border-color: var(--red-700); }.btn-danger-solid:hover { filter: brightness(.94); }
    @media (max-width: 680px) { .confirm-actions { width: 100%; }.confirm-actions .btn { flex: 1; } }
  `],
})
export class ConfirmOutlet { readonly service = inject(ConfirmService); }
