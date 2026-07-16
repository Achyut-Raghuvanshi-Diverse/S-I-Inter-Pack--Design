import { Component, computed, inject, signal } from '@angular/core';
import { ChartComponent } from 'ng-apexcharts';
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

type ReportType = 'Plant-wise Production' | 'Article-wise Sales' | 'Profitability' | 'Customer-wise Sales' | 'Inventory Aging';

@Component({
  selector: 'app-reports',
  imports: [ChartComponent, LucideBoxes, LucideCalendarDays, LucideChevronRight, LucideDownload, LucideFactory, LucideFileChartColumn, LucideIndianRupee, LucidePackageOpen, LucidePrinter, LucideRefreshCw, LucideUsers],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  readonly data = inject(DataStore);
  readonly selectedReport = signal<ReportType>('Plant-wise Production');
  readonly plantId = signal<number | null>(null);
  readonly reportTypes: { name: ReportType; description: string; icon: string; tag: string }[] = [
    { name: 'Plant-wise Production', description: 'Target, actual output, rejection and utilization by facility.', icon: 'factory', tag: 'Production' },
    { name: 'Article-wise Sales', description: 'Sales volume and realization by article and vehicle model.', icon: 'boxes', tag: 'Sales' },
    { name: 'Profitability', description: 'Standard cost against sale price by article and plant.', icon: 'rupee', tag: 'Finance' },
    { name: 'Customer-wise Sales', description: 'OEM sales, dispatch volume and outstanding value.', icon: 'users', tag: 'Sales' },
    { name: 'Inventory Aging', description: 'Plant stock classified by age and reorder exposure.', icon: 'package', tag: 'Inventory' },
  ];
  readonly rows = computed(() => this.data.productionRows().filter((row) => !this.plantId() || row.plantId === this.plantId()));
  readonly targetTotal = computed(() => this.rows().reduce((sum, row) => sum + row.target, 0));
  readonly actualTotal = computed(() => this.rows().reduce((sum, row) => sum + row.actual, 0));
  readonly rejectedTotal = computed(() => this.rows().reduce((sum, row) => sum + row.rejected, 0));
  readonly achievement = computed(() => this.targetTotal() ? this.actualTotal() / this.targetTotal() * 100 : 0);
  get chartSeries(): any[] { return [
    { name: 'Target', data: this.rows().slice(0, 10).map((row) => row.target) },
    { name: 'Actual', data: this.rows().slice(0, 10).map((row) => row.actual) },
  ]; }
  get categories(): string[] { return this.rows().slice(0, 10).map((row) => this.data.plants().find((plant) => plant.id === row.plantId)?.code ?? ''); }
  readonly chart: any = { type: 'bar', height: 255, toolbar: { show: false }, fontFamily: 'IBM Plex Sans' };
  readonly plotOptions: any = { bar: { columnWidth: '58%', borderRadius: 1 } };
  readonly dataLabels: any = { enabled: false };
  readonly legend: any = { position: 'top', horizontalAlign: 'right', fontSize: '10px', markers: { width: 8, height: 8, radius: 0 } };
  readonly grid: any = { borderColor: '#e8e9ed', strokeDashArray: 3 };
  readonly yaxis: any = { labels: { formatter: (value: number) => `${Math.round(value / 1000)}k`, style: { colors: '#767986', fontSize: '10px' } } };

  selectPlant(event: Event): void { this.plantId.set(Number((event.target as HTMLSelectElement).value) || null); }
  variance(row: { target: number; actual: number }): number { return row.actual - row.target; }
  utilization(plantId: number): number { const plant = this.data.plants().find((item) => item.id === plantId); return plant ? plant.output / plant.capacity * 100 : 0; }
  printReport(): void { window.print(); }
  exportCsv(): void {
    const content = [['Plant code', 'Plant', 'Location', 'Target units', 'Actual units', 'Variance', 'Rejected units', 'Utilization'], ...this.rows().map((row) => {
      const plant = this.data.plants().find((item) => item.id === row.plantId)!;
      return [plant.code, plant.name, `${plant.location}, ${plant.state}`, row.target, row.actual, this.variance(row), row.rejected, `${this.utilization(row.plantId).toFixed(1)}%`];
    })].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' })); link.download = 'plant-wise-production-report.csv'; link.click(); URL.revokeObjectURL(link.href);
  }
}
