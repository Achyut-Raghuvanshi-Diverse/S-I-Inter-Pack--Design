import { Directive, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[formControlName], textarea[formControlName]',
  host: {
    '[class.is-invalid]': 'invalid',
    '[attr.aria-invalid]': 'invalid ? "true" : null',
  },
})
export class ControlStateDirective {
  private readonly control = inject(NgControl, { self: true });
  get invalid(): boolean { return this.control.invalid === true && !!(this.control.touched || this.control.dirty); }
}
