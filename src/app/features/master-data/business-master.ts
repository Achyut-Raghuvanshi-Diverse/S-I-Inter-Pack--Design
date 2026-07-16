import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideArrowLeft, LucideArrowUpDown, LucideBox, LucideChevronLeft, LucideChevronRight,
  LucideDownload, LucidePencil, LucidePlus, LucideRefreshCw, LucideSearch, LucideTrash2,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { AppUser, Customer, InventoryItem, Order } from '../../core/models';
import { ToastService } from '../../core/toast.service';

type EntityKind = 'customers' | 'orders' | 'inventory' | 'users';
type BusinessItem = Customer | Order | InventoryItem | AppUser;

const META: Record<EntityKind, { eyebrow: string; title: string; description: string; singular: string; add: string }> = {
  customers: { eyebrow: 'Commercial master', title: 'Customers & OEMs', description: 'Maintain OEM billing identity, contacts and commercial credit terms.', singular: 'customer', add: 'Add customer' },
  orders: { eyebrow: 'Order execution', title: 'Purchase orders', description: 'Track OEM purchase orders from confirmation through production and invoicing.', singular: 'order', add: 'Add order' },
  inventory: { eyebrow: 'Material control', title: 'Plant inventory', description: 'Monitor article stock, reorder exposure and inventory age by plant.', singular: 'stock record', add: 'Add stock record' },
  users: { eyebrow: 'Access control', title: 'Users & roles', description: 'Manage role access and plant assignment for SI Inter Pack personnel.', singular: 'user', add: 'Add user' },
};

@Component({
  selector: 'app-business-master',
  imports: [ReactiveFormsModule, LucideArrowLeft, LucideArrowUpDown, LucideBox, LucideChevronLeft, LucideChevronRight, LucideDownload, LucidePencil, LucidePlus, LucideRefreshCw, LucideSearch, LucideTrash2],
  templateUrl: './business-master.html',
  styleUrls: ['./master-data.scss', './business-master.scss'],
})
export class BusinessMaster {
  readonly data = inject(DataStore);
  readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly kind = this.route.snapshot.data['entity'] as EntityKind;
  readonly meta = META[this.kind];
  readonly view = signal<'list' | 'edit'>('list');
  readonly editingId = signal<number | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal('All');
  readonly plantScope = signal<number | null>(null);
  readonly page = signal(1);
  readonly pageSize = 9;
  readonly ascending = signal(true);
  readonly saving = signal(false);
  readonly form = this.buildForm();

  readonly items = computed<BusinessItem[]>(() => {
    switch (this.kind) {
      case 'customers': return this.data.customers();
      case 'orders': return this.data.orders();
      case 'inventory': return this.data.inventory();
      case 'users': return this.data.users();
    }
  });
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return [...this.items()].filter((item) => {
      const matchesQuery = !query || this.searchText(item).includes(query);
      const matchesStatus = status === 'All' || this.itemStatus(item) === status;
      const matchesPlant = !this.plantScope() || !('plantId' in item) || item.plantId === this.plantScope();
      return matchesQuery && matchesStatus && matchesPlant;
    }).sort((a, b) => {
      const result = this.primaryLabel(a).localeCompare(this.primaryLabel(b), undefined, { numeric: true });
      return this.ascending() ? result : -result;
    });
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageNumbers = computed(() => Array.from({ length: this.pages() }, (_, index) => index + 1));
  readonly paged = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));

  constructor() { this.search.set(this.route.snapshot.queryParamMap.get('q') ?? ''); this.plantScope.set(Number(this.route.snapshot.queryParamMap.get('plant')) || null); }

  statuses(): string[] {
    if (this.kind === 'customers') return ['Active', 'On hold'];
    if (this.kind === 'orders') return ['Draft', 'Confirmed', 'In Production', 'Dispatched', 'Invoiced'];
    if (this.kind === 'users') return ['Active', 'Suspended'];
    return ['Healthy', 'Reorder', 'Critical'];
  }
  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  updateStatus(event: Event): void { this.statusFilter.set((event.target as HTMLSelectElement).value); this.page.set(1); }
  sort(): void { this.ascending.update((value) => !value); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.pages(), this.page() + 1)); }
  clearPlantScope(): void { this.plantScope.set(null); }
  maxShown(): number { return Math.min(this.page() * this.pageSize, this.filtered().length); }

  create(): void { this.editingId.set(null); this.form.reset(this.defaults()); this.view.set('edit'); }
  edit(item: BusinessItem): void { this.editingId.set(item.id); this.form.reset(item as never); this.view.set('edit'); }
  cancel(): void { this.view.set('list'); this.form.markAsUntouched(); }
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Check the form', 'Complete the highlighted fields before saving.'); return; }
    this.saving.set(true);
    window.setTimeout(() => {
      const value = this.normalizedValue();
      if (this.kind === 'customers') this.data.saveCustomer(value as Omit<Customer, 'id'> & { id?: number });
      if (this.kind === 'orders') this.data.saveOrder(value as Omit<Order, 'id'> & { id?: number });
      if (this.kind === 'inventory') this.data.saveInventory(value as Omit<InventoryItem, 'id'> & { id?: number });
      if (this.kind === 'users') this.data.saveUser(value as Omit<AppUser, 'id'> & { id?: number });
      this.saving.set(false); this.view.set('list');
      this.toast.success(`${this.meta.singular[0].toUpperCase()}${this.meta.singular.slice(1)} saved`, `${this.primaryLabel(value as unknown as BusinessItem)} is now visible in the ${this.meta.title.toLowerCase()} list.`);
    }, 260);
  }
  remove(item: BusinessItem): void {
    if (!confirm(`Delete ${this.primaryLabel(item)}? This cannot be undone.`)) return;
    if (this.kind === 'customers') this.data.deleteCustomer(item.id);
    if (this.kind === 'orders') this.data.deleteOrder(item.id);
    if (this.kind === 'inventory') this.data.deleteInventory(item.id);
    if (this.kind === 'users') this.data.deleteUser(item.id);
    this.toast.success(`${this.meta.singular[0].toUpperCase()}${this.meta.singular.slice(1)} deleted`, `${this.primaryLabel(item)} was removed.`);
  }

  primaryLabel(item: BusinessItem): string {
    if ('poNumber' in item) return item.poNumber;
    if ('gstin' in item) return item.name;
    if ('employeeCode' in item) return item.name;
    return `${this.data.plantName(item.plantId)} · ${this.data.articleName(item.articleId)}`;
  }
  itemStatus(item: BusinessItem): string {
    if ('status' in item) return item.status;
    return item.quantity <= item.reorderLevel * .5 ? 'Critical' : item.quantity <= item.reorderLevel ? 'Reorder' : 'Healthy';
  }
  statusClass(status: string): string {
    if (['Active', 'Invoiced', 'Healthy', 'Dispatched'].includes(status)) return 'success';
    if (['On hold', 'Draft', 'Reorder', 'Confirmed'].includes(status)) return 'warning';
    if (['Suspended', 'Critical'].includes(status)) return 'danger';
    return 'violet';
  }
  orderValue(order: Order): number { return order.quantity * order.rate; }
  inventoryCoverage(item: InventoryItem): number { return Math.max(1, Math.round(item.quantity / Math.max(item.reorderLevel / 10, 1))); }

  exportCsv(): void {
    const rows = this.filtered().map((item) => [item.id, this.primaryLabel(item), this.searchText(item), this.itemStatus(item)]);
    const csv = [['ID', 'Record', 'Details', 'Status'], ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = `si-inter-pack-${this.kind}.csv`; link.click(); URL.revokeObjectURL(link.href);
    this.toast.success('Export ready', `${this.filtered().length} ${this.meta.title.toLowerCase()} records were exported.`);
  }

  private searchText(item: BusinessItem): string {
    if ('poNumber' in item) return `${item.poNumber} ${this.data.customerName(item.customerId)} ${this.data.articleName(item.articleId)} ${this.data.plantName(item.plantId)} ${item.status}`.toLowerCase();
    if ('gstin' in item) return `${item.name} ${item.code} ${item.gstin} ${item.contact} ${item.city} ${item.status}`.toLowerCase();
    if ('employeeCode' in item) return `${item.name} ${item.email} ${item.employeeCode} ${item.role} ${item.status}`.toLowerCase();
    return `${this.data.plantName(item.plantId)} ${this.data.articleName(item.articleId)} ${item.quantity} ${this.itemStatus(item)}`.toLowerCase();
  }
  private buildForm(): FormGroup {
    if (this.kind === 'customers') return this.fb.group({ code: ['', Validators.required], name: ['', Validators.required], gstin: ['', [Validators.required, Validators.pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z]\dZ[A-Z\d]$/)]], contact: ['', Validators.required], phone: ['', Validators.required], city: ['', Validators.required], creditDays: [45, [Validators.required, Validators.min(0)]], status: ['Active', Validators.required] });
    if (this.kind === 'orders') return this.fb.group({ poNumber: ['', Validators.required], customerId: [1, Validators.required], articleId: [1, Validators.required], plantId: [1, Validators.required], quantity: [100, [Validators.required, Validators.min(1)]], rate: [1000, [Validators.required, Validators.min(1)]], dueDate: ['2026-07-31', Validators.required], status: ['Draft', Validators.required] });
    if (this.kind === 'inventory') return this.fb.group({ plantId: [1, Validators.required], articleId: [1, Validators.required], quantity: [0, [Validators.required, Validators.min(0)]], reorderLevel: [200, [Validators.required, Validators.min(1)]], ageDays: [0, [Validators.required, Validators.min(0)]], updatedAt: ['2026-07-16', Validators.required] });
    return this.fb.group({ name: ['', Validators.required], email: ['', [Validators.required, Validators.email]], role: ['Plant Operator', Validators.required], plantId: [1], employeeCode: ['', Validators.required], status: ['Active', Validators.required] });
  }
  private defaults(): Record<string, unknown> {
    if (this.kind === 'customers') return { code: '', name: '', gstin: '', contact: '', phone: '', city: '', creditDays: 45, status: 'Active' };
    if (this.kind === 'orders') return { poNumber: '', customerId: 1, articleId: 1, plantId: 1, quantity: 100, rate: 1000, dueDate: '2026-07-31', status: 'Draft' };
    if (this.kind === 'inventory') return { plantId: 1, articleId: 1, quantity: 0, reorderLevel: 200, ageDays: 0, updatedAt: '2026-07-16' };
    return { name: '', email: '', role: 'Plant Operator', plantId: 1, employeeCode: '', status: 'Active' };
  }
  private normalizedValue(): Record<string, unknown> & { id?: number } {
    const value = this.form.getRawValue(); const id = this.editingId() ?? undefined;
    if (this.kind === 'customers') return { ...value, id, creditDays: Number(value.creditDays) };
    if (this.kind === 'orders') return { ...value, id, customerId: Number(value.customerId), articleId: Number(value.articleId), plantId: Number(value.plantId), quantity: Number(value.quantity), rate: Number(value.rate) };
    if (this.kind === 'inventory') return { ...value, id, plantId: Number(value.plantId), articleId: Number(value.articleId), quantity: Number(value.quantity), reorderLevel: Number(value.reorderLevel), ageDays: Number(value.ageDays) };
    return { ...value, id, plantId: value.role === 'Plant Operator' ? Number(value.plantId) : null };
  }
}
