import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChartComponent } from 'ng-apexcharts';
import {
  LucideCamera,
  LucideClipboardList,
  LucideFactory,
  LucideFilter,
  LucideKeyboard,
  LucideRefreshCw,
  LucideScanLine,
  LucideWifiOff,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { ToastService } from '../../core/toast.service';
import { SearchSelect } from '../../shared/search-select/search-select';

@Component({
  selector: 'app-dashboard',
  imports: [
    ChartComponent, SearchSelect, LucideCamera, LucideClipboardList, LucideFactory,
    LucideFilter, LucideKeyboard, LucideRefreshCw, LucideScanLine, LucideWifiOff,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly data = inject(DataStore);
  readonly router = inject(Router);
  readonly toast = inject(ToastService);
  readonly selectedPlant = computed(() => this.data.plants().find((plant) => plant.id === this.data.selectedPlantId()) ?? null);
  readonly dateRange = signal('Last 30 days');
  readonly category = signal('All product categories');
  readonly dateRangeOptions = ['Last 7 days', 'Last 30 days', 'All records'].map((value) => ({ value, label: value }));
  readonly categoryOptions = ['All product categories', 'Passenger', 'Commercial', 'Utility'].map((value) => ({ value, label: value }));
  readonly plantOptions = computed(() => [{ value: null, label: 'All 15 plants', description: 'Enterprise-wide activity' }, ...this.data.plants().map((plant) => ({ value: plant.id, label: plant.name, description: `${plant.code} · ${plant.location}` }))]);
  readonly displayedPlants = computed(() => this.selectedPlant() ? [this.selectedPlant()!] : this.data.plants());
  readonly filteredScans = computed(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (this.dateRange() === 'Last 7 days' ? 6 : 29));
    return this.data.scans().filter((scan) => {
      const article = this.data.articles().find((item) => item.id === scan.articleId);
      const matchesDate = this.dateRange() === 'All records' || new Date(scan.timestamp) >= cutoff;
      const matchesPlant = !this.data.selectedPlantId() || scan.plantId === this.data.selectedPlantId();
      const matchesCategory = this.category() === 'All product categories' || article?.segment === this.category();
      return matchesDate && matchesPlant && matchesCategory;
    });
  });
  readonly todayScans = computed(() => this.filteredScans().filter((scan) => this.sameDay(scan.timestamp, new Date())).length);
  readonly cameraScans = computed(() => this.filteredScans().filter((scan) => scan.source === 'Camera').length);
  readonly manualScans = computed(() => this.filteredScans().filter((scan) => scan.source === 'Manual').length);
  readonly pendingScans = computed(() => this.filteredScans().filter((scan) => scan.syncStatus === 'Pending').length);
  readonly activeScanPlants = computed(() => new Set(this.filteredScans().map((scan) => scan.plantId)).size);
  readonly trendDays = computed(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  }));
  readonly lineSeries = computed(() => [{
    name: 'Barcode scans',
    data: this.trendDays().map((day) => this.filteredScans().filter((scan) => this.sameDay(scan.timestamp, day)).length),
  }]);
  readonly lineCategories = computed(() => this.trendDays().map((day) => new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(day)));
  readonly lineChart: any = { type: 'area', height: 285, toolbar: { show: false }, fontFamily: 'IBM Plex Sans', animations: { enabled: true, speed: 360 } };
  readonly lineStroke: any = { curve: 'smooth', width: 3 };
  readonly lineFill: any = { type: 'gradient', gradient: { shadeIntensity: 0, opacityFrom: 0.25, opacityTo: 0.015, stops: [0, 92] } };
  readonly grid: any = { borderColor: '#ececf3', strokeDashArray: 4, padding: { left: 8, right: 8 } };
  readonly lineYaxis: any = { min: 0, forceNiceScale: true, labels: { style: { colors: '#767986', fontSize: '10px' } } };
  readonly tooltip: any = { theme: 'light', x: { show: true } };
  readonly barSeries = computed(() => [{ name: 'Barcode scans', data: this.displayedPlants().slice(0, 8).map((plant) => this.plantScanCount(plant.id)) }]);
  readonly barCategories = computed(() => this.displayedPlants().slice(0, 8).map((plant) => plant.code));
  readonly barChart: any = {
    type: 'bar', height: 285, toolbar: { show: false }, fontFamily: 'IBM Plex Sans',
    events: { dataPointSelection: (_event: unknown, _chart: unknown, options: { dataPointIndex: number }) => this.selectPlantByIndex(options.dataPointIndex) },
  };
  readonly barPlot: any = { bar: { columnWidth: '42%', borderRadius: 4, distributed: true } };
  readonly barDataLabels: any = { enabled: false };
  readonly barLegend: any = { show: false };
  readonly barYaxis: any = { min: 0, forceNiceScale: true, labels: { style: { colors: '#767986', fontSize: '10px' } } };
  readonly segmentLabels = ['Passenger', 'Utility', 'Commercial'];
  readonly segmentSeries = computed(() => this.segmentLabels.map((segment) => this.filteredScans().filter((scan) =>
    this.data.articles().find((article) => article.id === scan.articleId)?.segment === segment).length));
  readonly donutChart: any = { type: 'donut', height: 285, fontFamily: 'IBM Plex Sans' };
  readonly donutLegend: any = { position: 'bottom', fontSize: '11px', markers: { size: 5 }, itemMargin: { horizontal: 8, vertical: 4 } };
  readonly donutPlot: any = { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'All scans', formatter: () => String(this.filteredScans().length) } } } } };

  selectPlantValue(value: string | number | null): void { this.data.selectedPlantId.set(Number(value) || null); }
  setDateRangeValue(value: string | number | null): void { this.dateRange.set(String(value)); }
  setCategoryValue(value: string | number | null): void { this.category.set(String(value)); }
  selectPlantByIndex(index: number): void { const plant = this.displayedPlants().slice(0, 8)[index]; if (plant) this.data.selectedPlantId.set(plant.id); }
  clearPlant(): void { this.data.selectedPlantId.set(null); }
  refresh(): void { this.data.refresh(); this.toast.info('Dashboard refreshing', 'Loading the latest barcode records.'); }
  openPlant(id = this.data.selectedPlantId()): void { if (id) this.router.navigate(['/plant/dashboard', id]); }
  viewAllRecords(): void { this.router.navigateByUrl('/barcode-records'); }
  plantScanCount(id: number): number { return this.filteredScans().filter((scan) => scan.plantId === id).length; }
  plantPendingCount(id: number): number { return this.filteredScans().filter((scan) => scan.plantId === id && scan.syncStatus === 'Pending').length; }
  private sameDay(value: Date, day: Date): boolean { const date = new Date(value); return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate(); }
}
