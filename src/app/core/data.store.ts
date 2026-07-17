import { computed, Injectable, signal } from '@angular/core';
import { INITIAL_ARTICLES, INITIAL_CUSTOMERS, INITIAL_INVENTORY, INITIAL_LEDGER, INITIAL_ORDERS, INITIAL_PLANTS, INITIAL_SCANS, INITIAL_USERS, PRODUCTION_ROWS } from './mock-data';
import { AppUser, Article, Customer, InventoryItem, LedgerEntry, Order, Plant, PlantStatus, ProductionRow, ScanRecord, ScanSource } from './models';

export type DataState = 'ready' | 'loading' | 'error';

@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly plantState = signal<Plant[]>(structuredClone(INITIAL_PLANTS));
  private readonly articleState = signal<Article[]>(structuredClone(INITIAL_ARTICLES));
  private readonly scanState = signal<ScanRecord[]>(structuredClone(INITIAL_SCANS));
  private readonly ledgerState = signal<LedgerEntry[]>(structuredClone(INITIAL_LEDGER));
  private readonly productionState = signal<ProductionRow[]>(structuredClone(PRODUCTION_ROWS));
  private readonly customerState = signal<Customer[]>(structuredClone(INITIAL_CUSTOMERS));
  private readonly orderState = signal<Order[]>(structuredClone(INITIAL_ORDERS));
  private readonly inventoryState = signal<InventoryItem[]>(structuredClone(INITIAL_INVENTORY));
  private readonly userState = signal<AppUser[]>(structuredClone(INITIAL_USERS));
  private readonly selectedPlantState = signal<number | null>(null);
  private readonly onlineState = signal(true);
  private readonly loadState = signal<DataState>('ready');
  private readonly errorState = signal('');
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly plants = this.plantState.asReadonly();
  readonly articles = this.articleState.asReadonly();
  readonly scans = this.scanState.asReadonly();
  readonly ledger = this.ledgerState.asReadonly();
  readonly productionRows = this.productionState.asReadonly();
  readonly customers = this.customerState.asReadonly();
  readonly orders = this.orderState.asReadonly();
  readonly inventory = this.inventoryState.asReadonly();
  readonly users = this.userState.asReadonly();
  readonly selectedPlantId = this.selectedPlantState.asReadonly();
  readonly online = this.onlineState.asReadonly();
  readonly dataState = this.loadState.asReadonly();
  readonly dataError = this.errorState.asReadonly();

  private readonly plantsById = computed(() => new Map(this.plants().map((plant) => [plant.id, plant])));
  private readonly articlesById = computed(() => new Map(this.articles().map((article) => [article.id, article])));
  private readonly customersById = computed(() => new Map(this.customers().map((customer) => [customer.id, customer])));

  readonly pendingScans = computed(() => this.scans().filter((scan) => scan.syncStatus === 'Pending').length);
  readonly lowStockItems = computed(() => this.inventory().filter((item) => item.quantity < item.reorderLevel).length);
  readonly totalRecords = computed(() => this.plants().length + this.articles().length + this.scans().length + this.ledger().length + this.customers().length + this.orders().length + this.inventory().length + this.users().length);
  readonly totalOutput = computed(() => this.plants().reduce((sum, plant) => sum + plant.output, 0));
  readonly activePlants = computed(() => this.plants().length);

  plantById(id: number): Plant | undefined { return this.plantsById().get(id); }
  articleById(id: number): Article | undefined { return this.articlesById().get(id); }
  customerById(id: number): Customer | undefined { return this.customersById().get(id); }
  plantName(id: number): string { return this.plantById(id)?.name ?? 'Unknown plant'; }
  plantCode(id: number): string { return this.plantById(id)?.code ?? '—'; }
  articleName(id: number): string { return this.articleById(id)?.modelName ?? 'Unknown article'; }
  articleCode(id: number): string { return this.articleById(id)?.code ?? '—'; }
  customerName(id: number): string { return this.customerById(id)?.name ?? 'Unknown customer'; }

  selectPlant(id: number | null): void { this.selectedPlantState.set(id); }
  setOnline(online: boolean): void { this.onlineState.set(online); if (online) this.retryPending(); }
  toggleOnline(): void { this.setOnline(!this.online()); }

  refresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.loadState.set('loading');
    this.errorState.set('');
    this.refreshTimer = setTimeout(() => { this.loadState.set('ready'); this.refreshTimer = null; }, 450);
  }

  retry(): void { this.refresh(); }

  savePlant(value: Omit<Plant, 'id'> & { id?: number }): void { this.plantState.update((items) => this.upsert(items, value)); }
  deletePlant(id: number): void { this.plantState.update((items) => items.filter((item) => item.id !== id)); }
  markPlants(ids: readonly number[], status: PlantStatus): void {
    const selected = new Set(ids);
    this.plantState.update((plants) => plants.map((plant) => selected.has(plant.id) ? { ...plant, status } : plant));
  }

  saveArticle(value: Omit<Article, 'id'> & { id?: number }): void { this.articleState.update((items) => this.upsert(items, value)); }
  deleteArticle(id: number): void { this.articleState.update((items) => items.filter((item) => item.id !== id)); }
  saveCustomer(value: Omit<Customer, 'id'> & { id?: number }): void { this.customerState.update((items) => this.upsert(items, value)); }
  deleteCustomer(id: number): void { this.customerState.update((items) => items.filter((item) => item.id !== id)); }
  saveOrder(value: Omit<Order, 'id'> & { id?: number }): void { this.orderState.update((items) => this.upsert(items, value)); }
  deleteOrder(id: number): void { this.orderState.update((items) => items.filter((item) => item.id !== id)); }
  saveInventory(value: Omit<InventoryItem, 'id'> & { id?: number }): void { this.inventoryState.update((items) => this.upsert(items, value)); }
  deleteInventory(id: number): void { this.inventoryState.update((items) => items.filter((item) => item.id !== id)); }
  saveUser(value: Omit<AppUser, 'id'> & { id?: number }): void { this.userState.update((items) => this.upsert(items, value)); }
  deleteUser(id: number): void { this.userState.update((items) => items.filter((item) => item.id !== id)); }

  addScan(input: { plantId: number; articleCode: string; source: ScanSource }): { ok: boolean; message: string } {
    const rawCode = input.articleCode.trim();
    const normalized = rawCode.toUpperCase();
    const article = this.articles().find((item) => item.code === normalized || item.barcode === rawCode);
    if (!article) return { ok: false, message: 'Barcode not recognised. Scan the label again.' };
    if (!article.plantIds.includes(input.plantId)) return { ok: false, message: 'This article is not assigned to the selected plant.' };

    const timestamp = new Date();
    const record: ScanRecord = {
      id: Math.max(timestamp.getTime(), (this.scans()[0]?.id ?? 0) + 1),
      timestamp,
      plantId: input.plantId,
      articleId: article.id,
      articleCode: article.code,
      articleName: article.modelName,
      barcode: article.barcode,
      source: input.source,
      syncStatus: this.online() ? 'Synced' : 'Pending',
    };
    this.scanState.update((scans) => [record, ...scans]);
    return { ok: true, message: this.online() ? 'The barcode was saved successfully.' : 'Saved on this device. It will sync when the connection returns.' };
  }

  retryPending(): void {
    if (!this.online() || !this.pendingScans()) return;
    this.scanState.update((scans) => scans.map((scan) => scan.syncStatus === 'Pending' ? { ...scan, syncStatus: 'Synced' } : scan));
  }

  private upsert<T extends { id: number }>(items: T[], value: Omit<T, 'id'> & { id?: number }): T[] {
    if (value.id !== undefined) return items.map((item) => item.id === value.id ? { ...item, ...value } as T : item);
    const id = Math.max(...items.map((item) => item.id), 0) + 1;
    return [...items, { ...value, id } as T];
  }
}
