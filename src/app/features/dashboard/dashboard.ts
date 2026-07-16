import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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

  readonly selectedPlant = computed(() => this.data.plants().find((plant) => plant.id === this.data.selectedPlantId()) ?? null);
  readonly displayedPlants = computed(() => this.selectedPlant() ? [this.selectedPlant()!] : this.data.plants());
  readonly revenue = computed(() => this.data.ledger()
    .filter((entry) => !this.data.selectedPlantId() || entry.plantId === this.data.selectedPlantId())
    .reduce((sum, entry) => sum + entry.quantity * entry.rate, 0));

  readonly lineSeries = [{ name: 'Production', data: [148, 152, 157, 155, 162, 168, 171, 174, 179, 176, 183, 188] }];
  readonly monthCategories = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  readonly lineChart: any = { type: 'area', height: 255, toolbar: { show: false }, fontFamily: 'IBM Plex Sans', animations: { enabled: true, speed: 300 } };
  readonly lineStroke: any = { curve: 'straight', width: 2.5 };
  readonly lineFill: any = { type: 'gradient', gradient: { shadeIntensity: 0, opacityFrom: 0.22, opacityTo: 0.02, stops: [0, 90] } };
  readonly grid: any = { borderColor: '#e8e9ed', strokeDashArray: 3, padding: { left: 8, right: 8 } };
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
    type: 'bar', height: 255, toolbar: { show: false }, fontFamily: 'IBM Plex Sans',
    events: { dataPointSelection: (_event: unknown, _chart: unknown, options: { dataPointIndex: number }) => this.selectPlantByIndex(options.dataPointIndex) },
  };
  readonly barPlot: any = { bar: { columnWidth: '46%', borderRadius: 1, distributed: true } };
  readonly barDataLabels: any = { enabled: false };
  readonly barLegend: any = { show: false };
  readonly barYaxis: any = { labels: { formatter: (value: number) => `${Math.round(value / 1000)}k`, style: { colors: '#767986', fontSize: '10px' } } };

  readonly segmentSeries = [62, 24, 14];
  readonly segmentLabels = ['Passenger', 'Utility', 'Commercial'];
  readonly donutChart: any = { type: 'donut', height: 255, fontFamily: 'IBM Plex Sans' };
  readonly donutLegend: any = { position: 'bottom', fontSize: '11px', markers: { width: 8, height: 8, radius: 0 }, itemMargin: { horizontal: 8, vertical: 4 } };
  readonly donutPlot: any = { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Total units', formatter: () => '188k' } } } } };

  selectPlant(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.data.selectedPlantId.set(value || null);
  }

  selectPlantByIndex(index: number): void {
    const plant = this.displayedPlants().slice(0, 8)[index];
    if (plant) this.data.selectedPlantId.set(plant.id);
  }

  clearPlant(): void {
    this.data.selectedPlantId.set(null);
  }

  statusClass(status: string): string {
    return status === 'On target' ? 'success' : status === 'Behind' ? 'danger' : 'warning';
  }
}
