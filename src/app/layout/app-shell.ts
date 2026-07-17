import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideBoxes,
  LucideFactory,
  LucideChevronDown,
  LucideCheck,
  LucideClipboardList,
  LucideDatabase,
  LucideFileChartColumn,
  LucideHandshake,
  LucideLayoutDashboard,
  LucideMenu,
  LucideMoon,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideScanLine,
  LucideSearch,
  LucideShoppingCart,
  LucideSun,
  LucideTruck,
  LucideUsers,
  LucideWarehouse,
  LucideWifi,
  LucideWifiOff,
  LucideX,
} from '@lucide/angular';
import { AuthStore } from '../core/auth.store';
import { DataStore } from '../core/data.store';
import { UserRole } from '../core/models';
import { ToastService } from '../core/toast.service';
import { ThemeStore } from '../core/theme.store';
import { ToastOutlet } from './toast-outlet';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, ToastOutlet, LucideBell, LucideBoxes, LucideCheck, LucideChevronDown,
    LucideClipboardList, LucideDatabase, LucideFactory, LucideFileChartColumn, LucideHandshake, LucideLayoutDashboard, LucideMenu, LucideMoon,
    LucidePanelLeftClose, LucidePanelLeftOpen, LucideScanLine, LucideSearch, LucideShoppingCart, LucideSun, LucideTruck, LucideUsers, LucideWarehouse, LucideWifi, LucideWifiOff, LucideX,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly auth = inject(AuthStore);
  readonly data = inject(DataStore);
  readonly router = inject(Router);
  readonly toast = inject(ToastService);
  readonly theme = inject(ThemeStore);
  readonly mobileNavOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly notificationsOpen = signal(false);
  readonly roleMenuOpen = signal(false);
  readonly roleOptions: { role: UserRole; description: string; token: string }[] = [
    { role: 'Corporate Admin', description: 'All plants, records and settings', token: 'CA' },
    { role: 'Plant Operator', description: 'Assigned plant scanning workspace', token: 'PO' },
    { role: 'Sales', description: 'Orders, dispatch and reports', token: 'SA' },
  ];
  private readonly navigation = toSignal(this.router.events, { initialValue: null });
  readonly today = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  readonly pageTitle = computed(() => {
    this.navigation();
    const path = this.router.url;
    if (path.includes('/barcode-records')) return 'Barcode Records';
    if (path.includes('/scan')) return 'Scan & Track';
    if (path.includes('/plant/dashboard')) return this.auth.role() === 'Plant Operator' ? 'My Plant' : 'Plant Dashboard';
    if (path.includes('/master-data/plants')) return 'Plant Master';
    if (path.includes('/master-data/articles')) return 'Article Master';
    if (path.includes('/master-data/customers')) return 'Customers & OEMs';
    if (path.includes('/master-data/orders')) return 'Purchase Orders';
    if (path.includes('/master-data/inventory')) return 'Plant Inventory';
    if (path.includes('/master-data/users')) return 'Users & Roles';
    if (path.includes('/sales')) return 'Sales & Dispatch';
    if (path.includes('/reports')) return 'Reports Centre';
    return 'Corporate Dashboard';
  });

  chooseRole(role: UserRole): void {
    this.auth.setRole(role);
    this.roleMenuOpen.set(false);
    this.router.navigateByUrl(role === 'Plant Operator' ? '/plant/dashboard' : role === 'Sales' ? '/master-data/orders' : '/dashboard');
  }

  toggleRoleMenu(): void { this.roleMenuOpen.update((open) => !open); this.notificationsOpen.set(false); }

  toggleConnection(): void {
    this.data.online.update((online) => !online);
    if (this.data.online()) this.data.retryPending();
  }

  closeNav(): void {
    this.mobileNavOpen.set(false);
  }

  toggleSidebar(): void { this.sidebarCollapsed.update((value) => !value); }

  performSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.trim();
    if (!query) return;
    const path = /^PO\//i.test(query) ? '/master-data/orders' : /^SIP-/i.test(query) ? '/master-data/articles' : '/master-data/customers';
    this.router.navigate([path], { queryParams: { q: query } });
    this.toast.info('Search applied', `Showing records that match “${query}”.`);
  }

  openSupport(): void { this.toast.info('Plant systems support', 'Call extension 224 or email ops.support@siinterpack.in.'); }
  toggleNotifications(): void { this.notificationsOpen.update((value) => !value); }
  signOut(): void {
    this.auth.setRole('Corporate Admin');
    this.router.navigateByUrl('/dashboard');
    this.toast.success('Demo session reset', 'Returned to the Corporate Admin demonstration account.');
  }

  @HostListener('document:mousedown', ['$event'])
  closeRoleMenu(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.user-control')) this.roleMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeMenus(): void { this.roleMenuOpen.set(false); this.notificationsOpen.set(false); }
}
