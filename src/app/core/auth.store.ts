import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { UserRole } from './models';

export interface DemoAccount {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: UserRole;
  readonly plantId: number | null;
  readonly employeeCode: string;
  readonly description: string;
  readonly token: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    name: 'Aditya Mehra',
    email: 'aditya.mehra@siinterpack.in',
    password: 'Admin@2026',
    role: 'Corporate Admin',
    plantId: null,
    employeeCode: 'SIP-COR-004',
    description: 'All plants, records and settings',
    token: 'AM',
  },
  {
    name: 'Rakesh Yadav',
    email: 'rakesh.yadav@siinterpack.in',
    password: 'Plant@2026',
    role: 'Plant Operator',
    plantId: 1,
    employeeCode: 'SIP-GGN-042',
    description: 'Assigned plant scanning workspace',
    token: 'RY',
  },
  {
    name: 'Nidhi Mehta',
    email: 'nidhi.mehta@siinterpack.in',
    password: 'Sales@2026',
    role: 'Sales',
    plantId: null,
    employeeCode: 'SIP-SAL-011',
    description: 'Orders, dispatch and reports',
    token: 'NM',
  },
] as const;

const SESSION_KEY = 'si-demo-session';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly accountState = signal<DemoAccount | null>(this.restoreSession());

  readonly demoAccounts = DEMO_ACCOUNTS;
  readonly currentAccount = this.accountState.asReadonly();
  readonly isAuthenticated = computed(() => this.currentAccount() !== null);
  readonly role = computed<UserRole>(() => this.currentAccount()?.role ?? 'Corporate Admin');
  readonly assignedPlantId = computed(() => this.currentAccount()?.plantId ?? 1);
  readonly userName = computed(() => this.currentAccount()?.name ?? 'Guest user');
  readonly userEmail = computed(() => this.currentAccount()?.email ?? '');
  readonly employeeCode = computed(() => this.currentAccount()?.employeeCode ?? '');
  readonly initials = computed(() => this.userName().split(' ').map((part) => part[0]).join(''));

  login(email: string, password: string): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    const account = this.demoAccounts.find((item) => item.email.toLowerCase() === normalizedEmail && item.password === password);
    if (!account) return false;
    this.setAccount(account);
    return true;
  }

  switchRole(role: UserRole): void {
    const account = this.demoAccounts.find((item) => item.role === role);
    if (account) this.setAccount(account);
  }

  logout(): void {
    this.accountState.set(null);
    if (this.isBrowser) sessionStorage.removeItem(SESSION_KEY);
  }

  landingUrl(role = this.role()): string {
    return role === 'Plant Operator' ? '/plant/dashboard' : role === 'Sales' ? '/master-data/orders' : '/dashboard';
  }

  private setAccount(account: DemoAccount): void {
    this.accountState.set(account);
    if (this.isBrowser) sessionStorage.setItem(SESSION_KEY, account.email);
  }

  private restoreSession(): DemoAccount | null {
    if (!this.isBrowser) return null;
    const email = sessionStorage.getItem(SESSION_KEY);
    return DEMO_ACCOUNTS.find((account) => account.email === email) ?? null;
  }
}
