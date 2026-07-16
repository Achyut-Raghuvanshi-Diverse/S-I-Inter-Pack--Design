import { computed, Injectable, signal } from '@angular/core';
import { UserRole } from './models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  readonly role = signal<UserRole>('Corporate Admin');
  readonly userName = computed(() => this.role() === 'Plant Operator' ? 'Rakesh Yadav' : this.role() === 'Sales' ? 'Nidhi Mehta' : 'Aditya Mehra');
  readonly initials = computed(() => this.userName().split(' ').map((part) => part[0]).join(''));

  setRole(role: UserRole): void {
    this.role.set(role);
  }
}
