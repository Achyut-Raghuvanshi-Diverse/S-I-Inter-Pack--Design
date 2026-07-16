import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { UserRole } from './models';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const allowed = (route.data['roles'] as UserRole[] | undefined) ?? [];
  if (!allowed.length || allowed.includes(auth.role())) return true;
  const landingPage = auth.role() === 'Plant Operator' ? '/plant/dashboard' : auth.role() === 'Sales' ? '/master-data/orders' : '/dashboard';
  return router.createUrlTree([landingPage]);
};

export const plantScopeGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const requestedPlant = Number(route.params['plantId']);
  if (auth.role() === 'Plant Operator' && requestedPlant && requestedPlant !== auth.assignedPlantId()) {
    return router.createUrlTree(['/plant/dashboard']);
  }
  return true;
};
