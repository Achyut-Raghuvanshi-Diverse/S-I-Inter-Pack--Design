import { Routes } from '@angular/router';
import { plantScopeGuard, roleGuard } from './core/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Corporate Dashboard | SI Inter Pack', canActivate: [roleGuard], data: { roles: ['Corporate Admin'] }, loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'plant/dashboard', title: 'Plant Dashboard | SI Inter Pack', canActivate: [roleGuard, plantScopeGuard], data: { roles: ['Corporate Admin', 'Plant Operator'] }, loadComponent: () => import('./features/dashboard/plant-dashboard').then((m) => m.PlantDashboard) },
      { path: 'plant/dashboard/:plantId', title: 'Plant Dashboard | SI Inter Pack', canActivate: [roleGuard, plantScopeGuard], data: { roles: ['Corporate Admin', 'Plant Operator'] }, loadComponent: () => import('./features/dashboard/plant-dashboard').then((m) => m.PlantDashboard) },
      { path: 'scan', title: 'Scan & Track | SI Inter Pack', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Plant Operator'] }, loadComponent: () => import('./features/scan/scan').then((m) => m.Scan) },
      { path: 'barcode-records', title: 'Barcode Records | SI Inter Pack', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Plant Operator'] }, loadComponent: () => import('./features/scan/barcode-records').then((m) => m.BarcodeRecords) },
      { path: 'master-data/plants', title: 'Plant Master | SI Inter Pack', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/master-data/plants').then((m) => m.Plants) },
      { path: 'master-data/articles', title: 'Article Master | SI Inter Pack', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/master-data/articles').then((m) => m.Articles) },
      { path: 'master-data/customers', title: 'Customers & OEMs | SI Inter Pack', canActivate: [roleGuard], data: { entity: 'customers', roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/master-data/business-master').then((m) => m.BusinessMaster) },
      { path: 'master-data/orders', title: 'Purchase Orders | SI Inter Pack', canActivate: [roleGuard], data: { entity: 'orders', roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/master-data/business-master').then((m) => m.BusinessMaster) },
      { path: 'master-data/inventory', title: 'Plant Inventory | SI Inter Pack', canActivate: [roleGuard], data: { entity: 'inventory', roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/master-data/business-master').then((m) => m.BusinessMaster) },
      { path: 'master-data/users', title: 'Users & Roles | SI Inter Pack', canActivate: [roleGuard], data: { entity: 'users', roles: ['Corporate Admin'] }, loadComponent: () => import('./features/master-data/business-master').then((m) => m.BusinessMaster) },
      { path: 'sales', title: 'Sales & Dispatch | SI Inter Pack', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/sales/sales').then((m) => m.Sales) },
      { path: 'reports', title: 'Reports Centre | SI Inter Pack', canActivate: [roleGuard], data: { roles: ['Corporate Admin', 'Sales'] }, loadComponent: () => import('./features/reports/reports').then((m) => m.Reports) },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
