import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  LucideArrowUpDown, LucideBox,
  LucideDownload, LucidePencil, LucidePlus, LucideRefreshCw, LucideSearch, LucideTrash2,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { ConfirmService } from '../../core/confirm.service';
import { CsvExportService } from '../../core/csv-export.service';
import { AppUser, Customer, InventoryItem, Order } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { Modal } from '../../shared/modal/modal';
import { Pagination } from '../../shared/pagination/pagination';
import { SearchSelect } from '../../shared/search-select/search-select';
import { ControlStateDirective } from '../../shared/control-state.directive';

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
  imports: [ReactiveFormsModule, ControlStateDirective, Modal, Pagination, SearchSelect, LucideArrowUpDown, LucideBox, LucideDownload, LucidePencil, LucidePlus, LucideRefreshCw, LucideSearch, LucideTrash2],
  templateUrl: './business-master.html',
  styleUrls: ['./master-data.scss', './business-master.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessMaster {
  readonly data = inject(DataStore);
  readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly csv = inject(CsvExportService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly kind = this.route.snapshot.data['entity'] as EntityKind;
  readonly meta = META[this.kind];
  readonly usesModal = true;
  readonly view = signal<'list' | 'edit'>('list');
  readonly editingId = signal<number | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal('All');
  readonly plantScope = signal<number | null>(null);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly ascending = signal(true);
  readonly saving = signal(false);
  readonly form = this.buildForm();
  readonly filterStatusOptions = [{ value: 'All', label: 'All' }, ...this.statuses().map((value) => ({ value, label: value }))];
  readonly customerStatusOptions = ['Active', 'On hold'].map((value) => ({ value, label: value }));
  readonly orderStatusOptions = ['Draft', 'Confirmed', 'In Production', 'Dispatched', 'Invoiced'].map((value) => ({ value, label: value }));
  readonly roleOptions = ['Corporate Admin', 'Plant Operator', 'Sales'].map((value) => ({ value, label: value }));
  readonly userStatusOptions = ['Active', 'Suspended'].map((value) => ({ value, label: value }));
  readonly customerOptions = computed(() => this.data.customers().map((customer) => ({ value: customer.id, label: customer.name, description: customer.code })));
  readonly articleOptions = computed(() => this.data.articles().map((article) => ({ value: article.id, label: article.modelName, description: article.code })));
  readonly plantOptions = computed(() => this.data.plants().map((plant) => ({ value: plant.id, label: plant.name, description: `${plant.code} · ${plant.location}` })));
  readonly assignedPlantOptions = computed(() => [{ value: null, label: 'All plants', description: 'Corporate or sales access' }, ...this.plantOptions()]);

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
  readonly paged = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly pagedCustomers = computed(() => this.paged().filter((item): item is Customer => 'gstin' in item));
  readonly pagedOrders = computed(() => this.paged().filter((item): item is Order => 'poNumber' in item));
  readonly pagedInventory = computed(() => this.paged().filter((item): item is InventoryItem => 'reorderLevel' in item));
  readonly pagedUsers = computed(() => this.paged().filter((item): item is AppUser => 'employeeCode' in item));

  constructor() { this.search.set(this.route.snapshot.queryParamMap.get('q') ?? ''); this.plantScope.set(Number(this.route.snapshot.queryParamMap.get('plant')) || null); }

  statuses(): string[] {
    if (this.kind === 'customers') return ['Active', 'On hold'];
    if (this.kind === 'orders') return ['Draft', 'Confirmed', 'In Production', 'Dispatched', 'Invoiced'];
    if (this.kind === 'users') return ['Active', 'Suspended'];
    return ['Healthy', 'Reorder', 'Critical'];
  }
  updateSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); this.page.set(1); }
  updateStatusValue(value: string | number | null): void { this.statusFilter.set(String(value)); this.page.set(1); }
  sort(): void { this.ascending.update((value) => !value); }
  clearPlantScope(): void { this.plantScope.set(null); this.page.set(1); }

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
  async remove(item: BusinessItem): Promise<void> {
    const confirmed = await this.confirm.confirm({ title: `Delete ${this.primaryLabel(item)}?`, message: `This ${this.meta.singular} will be permanently removed from ${this.meta.title.toLowerCase()}.`, confirmLabel: `Delete ${this.meta.singular}`, eyebrow: this.meta.eyebrow, tone: 'danger' });
    if (!confirmed) return;
    if (this.kind === 'customers') this.data.deleteCustomer(item.id);
    if (this.kind === 'orders') this.data.deleteOrder(item.id);
    if (this.kind === 'inventory') this.data.deleteInventory(item.id);
    if (this.kind === 'users') this.data.deleteUser(item.id);
    this.page.set(Math.min(this.page(), this.pages()));
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
    this.csv.download(`si-inter-pack-${this.kind}.csv`, [['ID', 'Record', 'Details', 'Status'], ...rows]);
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
