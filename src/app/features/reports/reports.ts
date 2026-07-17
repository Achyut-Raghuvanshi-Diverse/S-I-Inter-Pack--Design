import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid, ApexLegend, ApexPlotOptions, ApexYAxis, ChartComponent } from 'ng-apexcharts';
import {
  LucideBoxes,
  LucideCalendarDays,
  LucideChevronRight,
  LucideDownload,
  LucideFactory,
  LucideFileChartColumn,
  LucideIndianRupee,
  LucidePackageOpen,
  LucidePrinter,
  LucideRefreshCw,
  LucideUsers,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { CsvExportService, CsvRow } from '../../core/csv-export.service';
import { ToastService } from '../../core/toast.service';
import { Pagination } from '../../shared/pagination/pagination';
import { SearchSelect } from '../../shared/search-select/search-select';
import { CHART_FONT_FAMILY, CHART_GRID_COLOR } from '../../shared/chart-theme';

type ReportType = 'Plant-wise Production' | 'Article-wise Sales' | 'Profitability' | 'Customer-wise Sales' | 'Inventory Aging';

@Component({
  selector: 'app-reports',
  imports: [ChartComponent, Pagination, SearchSelect, LucideBoxes, LucideCalendarDays, LucideChevronRight, LucideDownload, LucideFactory, LucideFileChartColumn, LucideIndianRupee, LucidePackageOpen, LucidePrinter, LucideRefreshCw, LucideUsers],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
  readonly data = inject(DataStore);
  readonly historyStart = '2020-01-01';
  readonly historyEnd = new Date().toISOString().slice(0, 10);
  readonly toast = inject(ToastService);
  private readonly csv = inject(CsvExportService);
  readonly selectedReport = signal<ReportType>('Plant-wise Production');
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly printAll = signal(false);
  readonly plantId = signal<number | null>(null);
  readonly productCategory = signal('All product categories');
  readonly plantOptions = computed(() => [{ value: null, label: 'All 15 plants', description: 'Enterprise-wide scope' }, ...this.data.plants().map((plant) => ({ value: plant.id, label: `${plant.code} — ${plant.name}`, description: `${plant.location}, ${plant.state}` }))]);
  readonly categoryOptions = ['All product categories', 'Seat covers', 'Interior sets'].map((value) => ({ value, label: value }));
  readonly reportTypes: { name: ReportType; description: string; icon: string; tag: string }[] = [
    { name: 'Plant-wise Production', description: 'Target, actual output, rejection and utilization by facility.', icon: 'factory', tag: 'Production' },
    { name: 'Article-wise Sales', description: 'Sales volume and realization by article and vehicle model.', icon: 'boxes', tag: 'Sales' },
    { name: 'Profitability', description: 'Standard cost against sale price by article and plant.', icon: 'rupee', tag: 'Finance' },
    { name: 'Customer-wise Sales', description: 'OEM sales, dispatch volume and outstanding value.', icon: 'users', tag: 'Sales' },
    { name: 'Inventory Aging', description: 'Plant stock classified by age and reorder exposure.', icon: 'package', tag: 'Inventory' },
  ];
  readonly selectedMeta = computed(() => this.reportTypes.find((report) => report.name === this.selectedReport())!);
  readonly rows = computed(() => this.data.productionRows().filter((row) => !this.plantId() || row.plantId === this.plantId()));
  readonly targetTotal = computed(() => this.rows().reduce((sum, row) => sum + row.target, 0));
  readonly actualTotal = computed(() => this.rows().reduce((sum, row) => sum + row.actual, 0));
  readonly rejectedTotal = computed(() => this.rows().reduce((sum, row) => sum + row.rejected, 0));
  readonly achievement = computed(() => this.targetTotal() ? this.actualTotal() / this.targetTotal() * 100 : 0);
  readonly filteredArticles = computed(() => this.data.articles().filter((article) => this.matchesCategory(article.modelName)));
  readonly filteredArticleIds = computed(() => new Set(this.filteredArticles().map((article) => article.id)));
  readonly filteredLedger = computed(() => {
    const allowedArticles = this.filteredArticleIds();
    return this.data.ledger().filter((entry) => allowedArticles.has(entry.articleId) && (!this.plantId() || entry.plantId === this.plantId()));
  });
  readonly articleSalesRows = computed(() => {
    const totals = new Map<number, { units: number; revenue: number; orders: number }>();
    for (const entry of this.filteredLedger()) {
      const current = totals.get(entry.articleId) ?? { units: 0, revenue: 0, orders: 0 };
      current.units += entry.quantity;
      current.revenue += entry.quantity * entry.rate;
      current.orders += 1;
      totals.set(entry.articleId, current);
    }
    return this.filteredArticles().flatMap((article) => {
      const total = totals.get(article.id);
      return total ? [{ article, ...total, averageRate: total.units ? total.revenue / total.units : article.unitPrice }] : [];
    }).sort((a, b) => b.revenue - a.revenue);
  });
  readonly profitabilityRows = computed(() => this.filteredArticles().filter((article) => article.active).map((article) => ({
    article,
    margin: article.unitPrice - article.unitCost,
    marginPercent: (article.unitPrice - article.unitCost) / article.unitPrice * 100,
  })).sort((a, b) => b.marginPercent - a.marginPercent));
  readonly customerSalesRows = computed(() => {
    const totals = new Map<string, { units: number; revenue: number; shipments: number; delivered: number }>();
    for (const entry of this.filteredLedger()) {
      const current = totals.get(entry.customer) ?? { units: 0, revenue: 0, shipments: 0, delivered: 0 };
      current.units += entry.quantity;
      current.revenue += entry.quantity * entry.rate;
      current.shipments += 1;
      current.delivered += entry.status === 'Delivered' ? 1 : 0;
      totals.set(entry.customer, current);
    }
    return [...totals.entries()].map(([name, total]) => ({
      name,
      customer: this.data.customers().find((item) => item.name.startsWith(name.split(' ')[0])),
      ...total,
    })).sort((a, b) => b.revenue - a.revenue);
  });
  readonly inventoryRows = computed(() => this.data.inventory()
    .filter((item) => (!this.plantId() || item.plantId === this.plantId()) && this.filteredArticleIds().has(item.articleId))
    .flatMap((item) => {
      const plant = this.data.plantById(item.plantId);
      const article = this.data.articleById(item.articleId);
      return plant && article ? [{ item, plant, article }] : [];
    })
    .sort((a, b) => b.item.ageDays - a.item.ageDays));
  readonly displayProductionRows = computed(() => this.pageSlice(this.rows()));
  readonly displayArticleSalesRows = computed(() => this.pageSlice(this.articleSalesRows()));
  readonly displayProfitabilityRows = computed(() => this.pageSlice(this.profitabilityRows()));
  readonly displayCustomerSalesRows = computed(() => this.pageSlice(this.customerSalesRows()));
  readonly displayInventoryRows = computed(() => this.pageSlice(this.inventoryRows()));
  readonly summaryCards = computed<{ label: string; value: string; tone?: string }[]>(() => {
    switch (this.selectedReport()) {
      case 'Article-wise Sales': {
        const rows = this.articleSalesRows();
        const units = rows.reduce((sum, row) => sum + row.units, 0);
        const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
        return [{ label: 'Sales value', value: this.currency(revenue) }, { label: 'Units sold', value: units.toLocaleString('en-IN') }, { label: 'Selling articles', value: String(rows.length) }, { label: 'Average realisation', value: this.currency(units ? revenue / units : 0) }];
      }
      case 'Profitability': {
        const rows = this.profitabilityRows();
        const average = rows.reduce((sum, row) => sum + row.marginPercent, 0) / Math.max(rows.length, 1);
        return [{ label: 'Active articles', value: String(rows.length) }, { label: 'Average margin', value: `${average.toFixed(1)}%`, tone: 'positive' }, { label: 'Highest margin', value: `${Math.max(...rows.map((row) => row.marginPercent)).toFixed(1)}%` }, { label: 'Review threshold', value: '< 25%' }];
      }
      case 'Customer-wise Sales': {
        const rows = this.customerSalesRows();
        return [{ label: 'Sales value', value: this.currency(rows.reduce((sum, row) => sum + row.revenue, 0)) }, { label: 'Units dispatched', value: rows.reduce((sum, row) => sum + row.units, 0).toLocaleString('en-IN') }, { label: 'Active OEMs', value: String(rows.length) }, { label: 'Completed shipments', value: String(rows.reduce((sum, row) => sum + row.delivered, 0)) }];
      }
      case 'Inventory Aging': {
        const rows = this.inventoryRows();
        return [{ label: 'Stock on hand', value: rows.reduce((sum, row) => sum + row.item.quantity, 0).toLocaleString('en-IN') }, { label: 'Stock lines', value: String(rows.length) }, { label: 'Below reorder', value: String(rows.filter((row) => row.item.quantity < row.item.reorderLevel).length), tone: 'negative' }, { label: 'Aged over 30 days', value: String(rows.filter((row) => row.item.ageDays > 30).length) }];
      }
      default:
        return [{ label: 'Planned output', value: this.targetTotal().toLocaleString('en-IN') }, { label: 'Actual output', value: this.actualTotal().toLocaleString('en-IN') }, { label: 'Plan achievement', value: `${this.achievement().toFixed(1)}%`, tone: this.achievement() >= 95 ? 'positive' : '' }, { label: 'Rejected units', value: this.rejectedTotal().toLocaleString('en-IN'), tone: 'negative' }];
    }
  });
  readonly reportCode = computed(() => ({ 'Plant-wise Production': 'PRD-001', 'Article-wise Sales': 'SAL-002', Profitability: 'FIN-003', 'Customer-wise Sales': 'CRM-004', 'Inventory Aging': 'INV-005' })[this.selectedReport()]);
  readonly previewCount = computed(() => {
    switch (this.selectedReport()) {
      case 'Article-wise Sales': return this.articleSalesRows().length;
      case 'Profitability': return this.profitabilityRows().length;
      case 'Customer-wise Sales': return this.customerSalesRows().length;
      case 'Inventory Aging': return this.inventoryRows().length;
      default: return this.rows().length;
    }
  });
  get chartSeries(): ApexAxisChartSeries {
    switch (this.selectedReport()) {
      case 'Article-wise Sales': return [{ name: 'Units sold', data: this.articleSalesRows().slice(0, 10).map((row) => row.units) }];
      case 'Profitability': return [{ name: 'Standard cost', data: this.profitabilityRows().slice(0, 10).map((row) => row.article.unitCost) }, { name: 'Sale price', data: this.profitabilityRows().slice(0, 10).map((row) => row.article.unitPrice) }];
      case 'Customer-wise Sales': return [{ name: 'Sales value (₹ lakh)', data: this.customerSalesRows().map((row) => Number((row.revenue / 100000).toFixed(2))) }];
      case 'Inventory Aging': return [{ name: 'Stock', data: this.inventoryRows().slice(0, 10).map((row) => row.item.quantity) }, { name: 'Reorder level', data: this.inventoryRows().slice(0, 10).map((row) => row.item.reorderLevel) }];
      default: return [{ name: 'Target', data: this.rows().slice(0, 10).map((row) => row.target) }, { name: 'Actual', data: this.rows().slice(0, 10).map((row) => row.actual) }];
    }
  }
  get categories(): string[] {
    switch (this.selectedReport()) {
      case 'Article-wise Sales': return this.articleSalesRows().slice(0, 10).map((row) => row.article.code.split('-').slice(1, 3).join('-'));
      case 'Profitability': return this.profitabilityRows().slice(0, 10).map((row) => row.article.code.split('-').slice(1, 3).join('-'));
      case 'Customer-wise Sales': return this.customerSalesRows().map((row) => row.customer?.code ?? row.name.slice(0, 4));
      case 'Inventory Aging': return this.inventoryRows().slice(0, 10).map((row) => row.plant.code);
      default: return this.rows().slice(0, 10).map((row) => this.data.plantCode(row.plantId));
    }
  }
  readonly chart: ApexChart = { type: 'bar', height: 220, toolbar: { show: false }, animations: { speed: 350 }, fontFamily: CHART_FONT_FAMILY, accessibility: { enabled: true, description: 'Visualization of the selected report', keyboard: { enabled: true } } };
  readonly plotOptions: ApexPlotOptions = { bar: { columnWidth: '52%', borderRadius: 4 } };
  readonly dataLabels: ApexDataLabels = { enabled: false };
  readonly legend: ApexLegend = { position: 'top', horizontalAlign: 'right', fontSize: '10px', markers: { size: 8, shape: 'square' } };
  readonly grid: ApexGrid = { borderColor: CHART_GRID_COLOR, strokeDashArray: 3 };
  readonly yaxis: ApexYAxis = { labels: { formatter: (value: number) => `${Math.round(value / 1000)}k`, style: { colors: '#767986', fontSize: '10px' } } };

  selectReport(report: ReportType): void { this.selectedReport.set(report); this.page.set(1); }
  selectPlantValue(value: string | number | null): void { this.plantId.set(Number(value) || null); this.page.set(1); }
  selectCategoryValue(value: string | number | null): void { this.productCategory.set(String(value)); this.page.set(1); }
  variance(row: { target: number; actual: number }): number { return row.actual - row.target; }
  utilization(plantId: number): number { const plant = this.data.plantById(plantId); return plant ? plant.output / plant.capacity * 100 : 0; }
  currency(value: number): string { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value); }
  printReport(): void {
    const previousTitle = document.title;
    document.title = `SI Inter Pack - ${this.selectedReport()}`;
    this.printAll.set(true);
    window.addEventListener('afterprint', () => { document.title = previousTitle; this.printAll.set(false); }, { once: true });
    window.setTimeout(() => window.print());
  }
  runReport(): void { this.data.refresh(); this.toast.info('Report running', `Refreshing ${this.selectedReport()} with the selected plant and date range.`); }
  exportCsv(): void {
    let table: CsvRow[];
    switch (this.selectedReport()) {
      case 'Article-wise Sales': table = [['Article', 'Model', 'Units', 'Revenue', 'Orders'], ...this.articleSalesRows().map((row) => [row.article.code, row.article.modelName, row.units, row.revenue, row.orders])]; break;
      case 'Profitability': table = [['Article', 'Model', 'Standard cost', 'Sale price', 'Margin', 'Margin %'], ...this.profitabilityRows().map((row) => [row.article.code, row.article.modelName, row.article.unitCost, row.article.unitPrice, row.margin, row.marginPercent.toFixed(1)])]; break;
      case 'Customer-wise Sales': table = [['Customer', 'Units', 'Revenue', 'Shipments', 'Delivered'], ...this.customerSalesRows().map((row) => [row.name, row.units, row.revenue, row.shipments, row.delivered])]; break;
      case 'Inventory Aging': table = [['Plant', 'Article', 'Stock', 'Reorder level', 'Age days', 'Updated'], ...this.inventoryRows().map((row) => [row.plant.code, row.article.code, row.item.quantity, row.item.reorderLevel, row.item.ageDays, row.item.updatedAt])]; break;
      default: table = [['Plant code', 'Plant', 'Location', 'Target units', 'Actual units', 'Variance', 'Rejected units', 'Utilization'], ...this.rows().flatMap((row) => { const plant = this.data.plantById(row.plantId); return plant ? [[plant.code, plant.name, `${plant.location}, ${plant.state}`, row.target, row.actual, this.variance(row), row.rejected, `${this.utilization(row.plantId).toFixed(1)}%`]] : []; })];
    }
    this.csv.download(`${this.selectedReport().toLowerCase().replaceAll(' ', '-')}-report.csv`, table);
    this.toast.success('Report export ready', `${this.previewCount()} rows were exported.`);
  }

  private pageSlice<T>(rows: T[]): T[] {
    if (this.printAll()) return rows;
    const start = (this.page() - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  private matchesCategory(modelName: string): boolean {
    if (this.productCategory() === 'All product categories') return true;
    const isSeatCover = modelName.toLowerCase().includes('seat cover');
    return this.productCategory() === 'Seat covers' ? isSeatCover : !isSeatCover;
  }
}
