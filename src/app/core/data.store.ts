import { computed, Injectable, signal } from '@angular/core';
import { INITIAL_ARTICLES, INITIAL_CUSTOMERS, INITIAL_INVENTORY, INITIAL_LEDGER, INITIAL_ORDERS, INITIAL_PLANTS, INITIAL_SCANS, INITIAL_USERS, PRODUCTION_ROWS } from './mock-data';
import { AppUser, Article, Customer, InventoryItem, LedgerEntry, Order, Plant, ScanRecord, ScanStage } from './models';

@Injectable({ providedIn: 'root' })
export class DataStore {
  readonly plants = signal<Plant[]>(structuredClone(INITIAL_PLANTS));
  readonly articles = signal<Article[]>(structuredClone(INITIAL_ARTICLES));
  readonly scans = signal<ScanRecord[]>(structuredClone(INITIAL_SCANS));
  readonly ledger = signal<LedgerEntry[]>(structuredClone(INITIAL_LEDGER));
  readonly productionRows = signal(structuredClone(PRODUCTION_ROWS));
  readonly customers = signal<Customer[]>(structuredClone(INITIAL_CUSTOMERS));
  readonly orders = signal<Order[]>(structuredClone(INITIAL_ORDERS));
  readonly inventory = signal<InventoryItem[]>(structuredClone(INITIAL_INVENTORY));
  readonly users = signal<AppUser[]>(structuredClone(INITIAL_USERS));
  readonly selectedPlantId = signal<number | null>(null);
  readonly online = signal(true);
  readonly dataState = signal<'ready' | 'loading' | 'error'>('ready');
  readonly dataError = signal('');

  readonly pendingScans = computed(() => this.scans().filter((scan) => scan.syncStatus === 'Pending').length);
  readonly totalOutput = computed(() => this.plants().reduce((sum, plant) => sum + plant.output, 0));
  readonly activePlants = computed(() => this.plants().length);

  plantName(id: number): string {
    return this.plants().find((plant) => plant.id === id)?.name ?? 'Unknown plant';
  }

  articleName(id: number): string {
    return this.articles().find((article) => article.id === id)?.modelName ?? 'Unknown article';
  }

  customerName(id: number): string {
    return this.customers().find((customer) => customer.id === id)?.name ?? 'Unknown customer';
  }

  refresh(): void {
    this.dataState.set('loading');
    this.dataError.set('');
    window.setTimeout(() => this.dataState.set('ready'), 450);
  }

  retry(): void { this.refresh(); }

  savePlant(value: Omit<Plant, 'id'> & { id?: number }): void {
    this.plants.update((plants) => {
      if (value.id) return plants.map((plant) => plant.id === value.id ? { ...plant, ...value } as Plant : plant);
      const id = Math.max(...plants.map((plant) => plant.id), 0) + 1;
      return [...plants, { ...value, id } as Plant];
    });
  }

  deletePlant(id: number): void {
    this.plants.update((plants) => plants.filter((plant) => plant.id !== id));
  }

  saveArticle(value: Omit<Article, 'id'> & { id?: number }): void {
    this.articles.update((articles) => {
      if (value.id) return articles.map((article) => article.id === value.id ? { ...article, ...value } as Article : article);
      const id = Math.max(...articles.map((article) => article.id), 0) + 1;
      return [...articles, { ...value, id } as Article];
    });
  }

  deleteArticle(id: number): void {
    this.articles.update((articles) => articles.filter((article) => article.id !== id));
  }

  saveCustomer(value: Omit<Customer, 'id'> & { id?: number }): void {
    this.customers.update((items) => this.upsert(items, value));
  }
  deleteCustomer(id: number): void { this.customers.update((items) => items.filter((item) => item.id !== id)); }

  saveOrder(value: Omit<Order, 'id'> & { id?: number }): void {
    this.orders.update((items) => this.upsert(items, value));
  }
  deleteOrder(id: number): void { this.orders.update((items) => items.filter((item) => item.id !== id)); }

  saveInventory(value: Omit<InventoryItem, 'id'> & { id?: number }): void {
    this.inventory.update((items) => this.upsert(items, value));
  }
  deleteInventory(id: number): void { this.inventory.update((items) => items.filter((item) => item.id !== id)); }

  saveUser(value: Omit<AppUser, 'id'> & { id?: number }): void {
    this.users.update((items) => this.upsert(items, value));
  }
  deleteUser(id: number): void { this.users.update((items) => items.filter((item) => item.id !== id)); }

  addScan(input: { plantId: number; stage: ScanStage; articleCode: string; quantity: number; batch: string }): { ok: boolean; message: string } {
    const normalized = input.articleCode.trim().toUpperCase();
    const article = this.articles().find((item) => item.code === normalized || item.barcode === input.articleCode.trim());
    if (!article) return { ok: false, message: 'Unknown article code. Check the label or enter the code manually.' };
    if (!article.plantIds.includes(input.plantId)) return { ok: false, message: 'This article is not assigned to the selected plant.' };
    const duplicate = this.scans().find((scan) => scan.batch === input.batch && scan.articleId === article.id && scan.stage === input.stage);
    if (duplicate) return { ok: false, message: `Duplicate scan. Batch ${input.batch} is already recorded at this stage.` };

    const record: ScanRecord = {
      id: Date.now(),
      timestamp: new Date(),
      plantId: input.plantId,
      stage: input.stage,
      articleId: article.id,
      articleCode: article.code,
      articleName: article.modelName,
      quantity: input.quantity,
      batch: input.batch,
      syncStatus: this.online() ? 'Synced' : 'Pending',
    };
    this.scans.update((scans) => [record, ...scans].slice(0, 50));
    return { ok: true, message: this.online() ? `${input.quantity} units recorded successfully.` : 'Saved on this device. It will sync when the connection returns.' };
  }

  undoScan(id: number): void {
    this.scans.update((scans) => scans.filter((scan) => scan.id !== id));
  }

  retryPending(): void {
    if (!this.online()) return;
    this.scans.update((scans) => scans.map((scan) => scan.syncStatus === 'Pending' ? { ...scan, syncStatus: 'Synced' } : scan));
  }

  private upsert<T extends { id: number }>(items: T[], value: Omit<T, 'id'> & { id?: number }): T[] {
    if (value.id) return items.map((item) => item.id === value.id ? { ...item, ...value } as T : item);
    const id = Math.max(...items.map((item) => item.id), 0) + 1;
    return [...items, { ...value, id } as T];
  }
}
