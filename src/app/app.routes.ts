import { Routes } from '@angular/router';
import { roleGuard } from './core/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', canActivate: [roleGuard], data: { roles: ['Corporate Admin'] }, loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'scan', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Plant Operator'] }, loadComponent: () => import('./features/scan/scan').then((m) => m.Scan) },
      { path: 'master-data/plants', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/master-data/plants').then((m) => m.Plants) },
      { path: 'master-data/articles', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/master-data/articles').then((m) => m.Articles) },
      { path: 'sales', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/sales/sales').then((m) => m.Sales) },
      { path: 'reports', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/reports/reports').then((m) => m.Reports) },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
