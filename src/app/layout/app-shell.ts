import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideBoxes,
  LucideChevronDown,
  LucideDatabase,
  LucideFileChartColumn,
  LucideHelpCircle,
  LucideLayoutDashboard,
  LucideMenu,
  LucideScanLine,
  LucideSearch,
  LucideSettings,
  LucideTruck,
  LucideWifi,
  LucideWifiOff,
  LucideX,
} from '@lucide/angular';
import { AuthStore } from '../core/auth.store';
import { DataStore } from '../core/data.store';
import { UserRole } from '../core/models';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, LucideBell, LucideBoxes, LucideChevronDown,
    LucideDatabase, LucideFileChartColumn, LucideHelpCircle, LucideLayoutDashboard, LucideMenu,
    LucideScanLine, LucideSearch, LucideSettings, LucideTruck, LucideWifi, LucideWifiOff, LucideX,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly auth = inject(AuthStore);
  readonly data = inject(DataStore);
  readonly router = inject(Router);
  readonly mobileNavOpen = signal(false);
  readonly today = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  readonly pageTitle = computed(() => {
    const path = this.router.url;
    if (path.includes('/scan')) return 'Scan & Track';
    if (path.includes('/master-data/plants')) return 'Plant Master';
    if (path.includes('/master-data/articles')) return 'Article Master';
    if (path.includes('/sales')) return 'Sales & Dispatch';
    if (path.includes('/reports')) return 'Reports Centre';
    return 'Corporate Dashboard';
  });

  canSee(area: 'corporate' | 'scan' | 'sales' | 'master'): boolean {
    const role = this.auth.role();
    if (role === 'Corporate Admin') return true;
    if (role === 'Plant Operator') return area === 'scan';
    return area === 'sales' || area === 'master';
  }

  setRole(event: Event): void {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    this.auth.setRole(role);
    this.router.navigateByUrl(role === 'Plant Operator' ? '/scan' : role === 'Sales' ? '/sales' : '/dashboard');
  }

  toggleConnection(): void {
    this.data.online.update((online) => !online);
    if (this.data.online()) this.data.retryPending();
  }

  closeNav(): void {
    this.mobileNavOpen.set(false);
  }
}

