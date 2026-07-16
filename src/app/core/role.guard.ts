import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { UserRole } from './models';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const allowed = (route.data['roles'] as UserRole[] | undefined) ?? [];
  if (!allowed.length || allowed.includes(auth.role())) return true;
  const landingPage = auth.role() === 'Plant Operator' ? '/scan' : auth.role() === 'Sales' ? '/sales' : '/dashboard';
  return router.createUrlTree([landingPage]);
};

