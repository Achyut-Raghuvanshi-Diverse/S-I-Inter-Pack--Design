import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideArrowRight,
  LucideBarChart3,
  LucideCheck,
  LucideEye,
  LucideEyeOff,
  LucideFactory,
  LucideLockKeyhole,
  LucideMail,
  LucideScanLine,
  LucideShieldCheck,
} from '@lucide/angular';
import { AuthStore, DemoAccount } from '../../core/auth.store';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    LucideArrowRight,
    LucideBarChart3,
    LucideCheck,
    LucideEye,
    LucideEyeOff,
    LucideFactory,
    LucideLockKeyhole,
    LucideMail,
    LucideScanLine,
    LucideShieldCheck,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder).nonNullable;

  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly passwordVisible = signal(false);
  readonly errorMessage = signal('');
  readonly signedOut = this.route.snapshot.queryParamMap.get('signedOut') === 'true';

  selectAccount(account: DemoAccount): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.form.markAsPristine();
    this.errorMessage.set('');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    if (!this.auth.login(email, password)) {
      this.errorMessage.set('The email or password does not match a demo account. Select an account below to fill both fields.');
      return;
    }

    const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const safeReturnUrl = requestedUrl?.startsWith('/') && !requestedUrl.startsWith('//') ? requestedUrl : null;
    this.router.navigateByUrl(safeReturnUrl ?? this.auth.landingUrl());
  }
}
