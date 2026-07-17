import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import { UserRole } from './models';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree([auth.landingUrl()]) : true;
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const allowed = (route.data['roles'] as UserRole[] | undefined) ?? [];
  if (!allowed.length || allowed.includes(auth.role())) return true;
  return router.createUrlTree([auth.landingUrl()]);
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
