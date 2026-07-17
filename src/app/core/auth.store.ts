import { computed, Injectable, signal } from '@angular/core';
import { UserRole } from './models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly roleState = signal<UserRole>('Corporate Admin');
  private readonly assignedPlantState = signal(1);
  readonly role = this.roleState.asReadonly();
  readonly assignedPlantId = this.assignedPlantState.asReadonly();
  readonly userName = computed(() => this.role() === 'Plant Operator' ? 'Rakesh Yadav' : this.role() === 'Sales' ? 'Nidhi Mehta' : 'Aditya Mehra');
  readonly initials = computed(() => this.userName().split(' ').map((part) => part[0]).join(''));

  setRole(role: UserRole): void {
    this.roleState.set(role);
  }
}
