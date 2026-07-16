import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ChartComponent } from 'ng-apexcharts';
import {
  LucideArrowDownRight,
  LucideArrowUpRight,
  LucideCircleDollarSign,
  LucideFactory,
  LucideFilter,
  LucidePercent,
  LucideRefreshCw,
  LucideShoppingCart,
  LucideTruck,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    ChartComponent, DecimalPipe, LucideArrowDownRight, LucideArrowUpRight,
    LucideCircleDollarSign, LucideFactory, LucideFilter,
    LucidePercent, LucideRefreshCw, LucideShoppingCart, LucideTruck,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly data = inject(DataStore);
  readonly router = inject(Router);
  readonly toast = inject(ToastService);

  readonly selectedPlant = computed(() => this.data.plants().find((plant) => plant.id === this.data.selectedPlantId()) ?? null);
  readonly dateRange = signal('Month to date · Jul 2026');
  readonly category = signal('All product categories');
  readonly customer = signal('All customers');
  readonly displayedPlants = computed(() => this.selectedPlant() ? [this.selectedPlant()!] : this.data.plants());
  readonly revenue = computed(() => this.data.ledger()
    .filter((entry) => (!this.data.selectedPlantId() || entry.plantId === this.data.selectedPlantId()) && (this.customer() === 'All customers' || entry.customer === this.customer()) && (this.category() === 'All product categories' || this.data.articles().find((article) => article.id === entry.articleId)?.segment === this.category()))
    .reduce((sum, entry) => sum + entry.quantity * entry.rate, 0));

  readonly lineSeries = [{ name: 'Production', data: [148, 152, 157, 155, 162, 168, 171, 174, 179, 176, 183, 188] }];
  readonly monthCategories = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  readonly lineChart: any = { type: 'area', height: 285, toolbar: { show: false }, fontFamily: 'IBM Plex Sans', animations: { enabled: true, speed: 360 } };
  readonly lineStroke: any = { curve: 'smooth', width: 3 };
  readonly lineFill: any = { type: 'gradient', gradient: { shadeIntensity: 0, opacityFrom: 0.25, opacityTo: 0.015, stops: [0, 92] } };
  readonly grid: any = { borderColor: '#ececf3', strokeDashArray: 4, padding: { left: 8, right: 8 } };
  readonly xaxis: any = { categories: this.monthCategories, labels: { style: { colors: '#767986', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } };
  readonly lineYaxis: any = { labels: { formatter: (value: number) => `${value}k`, style: { colors: '#767986', fontSize: '10px' } } };
  readonly tooltip: any = { theme: 'light', x: { show: true } };

  get barSeries(): any[] {
    return [{ name: 'Units produced', data: this.displayedPlants().slice(0, 8).map((plant) => plant.output) }];
  }
  get barCategories(): string[] {
    return this.displayedPlants().slice(0, 8).map((plant) => plant.code);
  }
  readonly barChart: any = {
    type: 'bar', height: 285, toolbar: { show: false }, fontFamily: 'IBM Plex Sans',
    events: { dataPointSelection: (_event: unknown, _chart: unknown, options: { dataPointIndex: number }) => this.selectPlantByIndex(options.dataPointIndex) },
  };
  readonly barPlot: any = { bar: { columnWidth: '42%', borderRadius: 4, distributed: true } };
  readonly barDataLabels: any = { enabled: false };
  readonly barLegend: any = { show: false };
  readonly barYaxis: any = { labels: { formatter: (value: number) => `${Math.round(value / 1000)}k`, style: { colors: '#767986', fontSize: '10px' } } };

  readonly segmentSeries = [62, 24, 14];
  readonly segmentLabels = ['Passenger', 'Utility', 'Commercial'];
  readonly donutChart: any = { type: 'donut', height: 285, fontFamily: 'IBM Plex Sans' };
  readonly donutLegend: any = { position: 'bottom', fontSize: '11px', markers: { width: 8, height: 8, radius: 0 }, itemMargin: { horizontal: 8, vertical: 4 } };
  readonly donutPlot: any = { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Total units', formatter: () => '188k' } } } } };

  selectPlant(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.data.selectedPlantId.set(value || null);
  }
  setDateRange(event: Event): void { this.dateRange.set((event.target as HTMLSelectElement).value); }
  setCategory(event: Event): void { this.category.set((event.target as HTMLSelectElement).value); }
  setCustomer(event: Event): void { this.customer.set((event.target as HTMLSelectElement).value); }

  selectPlantByIndex(index: number): void {
    const plant = this.displayedPlants().slice(0, 8)[index];
    if (plant) this.data.selectedPlantId.set(plant.id);
  }

  clearPlant(): void {
    this.data.selectedPlantId.set(null);
  }

  refresh(): void { this.data.refresh(); this.toast.info('Dashboard refreshing', 'Loading the latest production and dispatch position.'); }
  openPlant(id = this.data.selectedPlantId()): void { if (id) this.router.navigate(['/plant/dashboard', id]); }
  viewAllPlants(): void { this.router.navigateByUrl('/master-data/plants'); }

  statusClass(status: string): string {
    return status === 'On target' ? 'success' : status === 'Behind' ? 'warning' : 'danger';
  }
}
