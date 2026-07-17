import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideArrowRight,
  LucideBoxes,
  LucideFactory,
  LucideChevronDown,
  LucideCheck,
  LucideClipboardList,
  LucideDatabase,
  LucideFileChartColumn,
  LucideHandshake,
  LucideLayoutDashboard,
  LucideLogOut,
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
import { ConfirmOutlet } from './confirm-outlet';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, ToastOutlet, ConfirmOutlet, LucideArrowRight, LucideBell, LucideBoxes, LucideCheck, LucideChevronDown,
    LucideClipboardList, LucideDatabase, LucideFactory, LucideFileChartColumn, LucideHandshake, LucideLayoutDashboard, LucideLogOut, LucideMenu, LucideMoon,
    LucidePanelLeftClose, LucidePanelLeftOpen, LucideScanLine, LucideSearch, LucideShoppingCart, LucideSun, LucideTruck, LucideUsers, LucideWarehouse, LucideWifi, LucideWifiOff, LucideX,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  readonly auth = inject(AuthStore);
  readonly data = inject(DataStore);
  readonly router = inject(Router);
  readonly toast = inject(ToastService);
  readonly theme = inject(ThemeStore);
  private readonly document = inject(DOCUMENT);
  readonly mobileNavOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly notificationsOpen = signal(false);
  readonly notificationsRead = signal(false);
  readonly roleMenuOpen = signal(false);
  readonly roleOptions = this.auth.demoAccounts;
  private readonly navigation = toSignal(this.router.events, { initialValue: null });
  readonly today = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  readonly unreadNotifications = computed(() => this.notificationsRead() ? 0 : 3);
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
    this.auth.switchRole(role);
    this.roleMenuOpen.set(false);
    this.router.navigateByUrl(role === 'Plant Operator' ? '/plant/dashboard' : role === 'Sales' ? '/master-data/orders' : '/dashboard');
  }

  toggleRoleMenu(): void { this.roleMenuOpen.update((open) => !open); this.notificationsOpen.set(false); }

  roleMenuKeydown(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    if (!options.length) return;
    const current = options.indexOf(this.document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : event.key === 'ArrowDown' ? (current + 1) % options.length : (current - 1 + options.length) % options.length;
    options[next]?.focus();
  }

  toggleConnection(): void {
    this.data.toggleOnline();
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
  toggleNotifications(): void { this.notificationsOpen.update((value) => !value); this.roleMenuOpen.set(false); }
  openNotification(path: string): void { this.notificationsOpen.set(false); this.router.navigateByUrl(path); }
  markNotificationsRead(): void { this.notificationsRead.set(true); this.toast.success('Notifications cleared', 'All current updates were marked as read.'); }
  signOut(): void {
    this.auth.logout();
    this.roleMenuOpen.set(false);
    this.router.navigate(['/login'], { queryParams: { signedOut: true } });
  }

  @HostListener('document:mousedown', ['$event'])
  closeRoleMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-control')) this.roleMenuOpen.set(false);
    if (!target.closest('.notification') && !target.closest('.notification-panel')) this.notificationsOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeMenus(): void { this.roleMenuOpen.set(false); this.notificationsOpen.set(false); }
}
