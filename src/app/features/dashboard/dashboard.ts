import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApexChart, ApexDataLabels, ApexFill, ApexGrid, ApexLegend, ApexPlotOptions, ApexStroke, ApexTooltip, ApexYAxis, ChartComponent } from 'ng-apexcharts';
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
import { CHART_FONT_FAMILY, CHART_GRID_COLOR } from '../../shared/chart-theme';

@Component({
  selector: 'app-dashboard',
  imports: [
    ChartComponent, SearchSelect, LucideCamera, LucideClipboardList, LucideFactory,
    LucideFilter, LucideKeyboard, LucideRefreshCw, LucideScanLine, LucideWifiOff,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly data = inject(DataStore);
  readonly router = inject(Router);
  readonly toast = inject(ToastService);
  readonly selectedPlant = computed(() => this.data.selectedPlantId() ? this.data.plantById(this.data.selectedPlantId()!) ?? null : null);
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
      const article = this.data.articleById(scan.articleId);
      const matchesDate = this.dateRange() === 'All records' || new Date(scan.timestamp) >= cutoff;
      const matchesPlant = !this.data.selectedPlantId() || scan.plantId === this.data.selectedPlantId();
      const matchesCategory = this.category() === 'All product categories' || article?.segment === this.category();
      return matchesDate && matchesPlant && matchesCategory;
    });
  });
  readonly scanMetrics = computed(() => {
    const today = new Date();
    const activePlants = new Set<number>();
    const byPlant = new Map<number, { total: number; pending: number }>();
    const bySegment = new Map<string, number>();
    let todayCount = 0; let camera = 0; let manual = 0; let pending = 0;
    for (const scan of this.filteredScans()) {
      if (this.sameDay(scan.timestamp, today)) todayCount += 1;
      if (scan.source === 'Camera') camera += 1; else manual += 1;
      if (scan.syncStatus === 'Pending') pending += 1;
      activePlants.add(scan.plantId);
      const plant = byPlant.get(scan.plantId) ?? { total: 0, pending: 0 };
      plant.total += 1; plant.pending += scan.syncStatus === 'Pending' ? 1 : 0; byPlant.set(scan.plantId, plant);
      const segment = this.data.articleById(scan.articleId)?.segment;
      if (segment) bySegment.set(segment, (bySegment.get(segment) ?? 0) + 1);
    }
    return { today: todayCount, camera, manual, pending, activePlants: activePlants.size, byPlant, bySegment };
  });
  readonly todayScans = computed(() => this.scanMetrics().today);
  readonly cameraScans = computed(() => this.scanMetrics().camera);
  readonly manualScans = computed(() => this.scanMetrics().manual);
  readonly pendingScans = computed(() => this.scanMetrics().pending);
  readonly activeScanPlants = computed(() => this.scanMetrics().activePlants);
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
  readonly lineChart: ApexChart = { type: 'area', height: 285, toolbar: { show: false }, fontFamily: CHART_FONT_FAMILY, animations: { enabled: true, speed: 360 }, accessibility: { enabled: true, description: 'Barcode scan trend over the last seven days', keyboard: { enabled: true } } };
  readonly lineStroke: ApexStroke = { curve: 'smooth', width: 3 };
  readonly lineFill: ApexFill = { type: 'gradient', gradient: { shadeIntensity: 0, opacityFrom: 0.25, opacityTo: 0.015, stops: [0, 92] } };
  readonly grid: ApexGrid = { borderColor: CHART_GRID_COLOR, strokeDashArray: 4, padding: { left: 8, right: 8 } };
  readonly lineYaxis: ApexYAxis = { min: 0, forceNiceScale: true, labels: { style: { colors: '#767986', fontSize: '10px' } } };
  readonly tooltip: ApexTooltip = { theme: 'light', x: { show: true } };
  readonly barSeries = computed(() => [{ name: 'Barcode scans', data: this.displayedPlants().slice(0, 8).map((plant) => this.plantScanCount(plant.id)) }]);
  readonly barCategories = computed(() => this.displayedPlants().slice(0, 8).map((plant) => plant.code));
  readonly barChart: ApexChart = {
    type: 'bar', height: 285, toolbar: { show: false }, fontFamily: CHART_FONT_FAMILY,
    accessibility: { enabled: true, description: 'Barcode scan totals by plant', keyboard: { enabled: true } },
    events: { dataPointSelection: (_event: unknown, _chart: unknown, options: { dataPointIndex: number }) => this.selectPlantByIndex(options.dataPointIndex) },
  };
  readonly barPlot: ApexPlotOptions = { bar: { columnWidth: '42%', borderRadius: 4, distributed: true } };
  readonly barDataLabels: ApexDataLabels = { enabled: false };
  readonly barLegend: ApexLegend = { show: false };
  readonly barYaxis: ApexYAxis = { min: 0, forceNiceScale: true, labels: { style: { colors: '#767986', fontSize: '10px' } } };
  readonly segmentLabels = ['Passenger', 'Utility', 'Commercial'];
  readonly segmentSeries = computed(() => this.segmentLabels.map((segment) => this.scanMetrics().bySegment.get(segment) ?? 0));
  readonly donutChart: ApexChart = { type: 'donut', height: 285, fontFamily: CHART_FONT_FAMILY, accessibility: { enabled: true, description: 'Barcode scans by product segment', keyboard: { enabled: true } } };
  readonly donutLegend: ApexLegend = { position: 'bottom', fontSize: '11px', markers: { size: 5 }, itemMargin: { horizontal: 8, vertical: 4 } };
  readonly donutPlot: ApexPlotOptions = { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'All scans', formatter: () => String(this.filteredScans().length) } } } } };

  selectPlantValue(value: string | number | null): void { this.data.selectPlant(Number(value) || null); }
  setDateRangeValue(value: string | number | null): void { this.dateRange.set(String(value)); }
  setCategoryValue(value: string | number | null): void { this.category.set(String(value)); }
  selectPlantByIndex(index: number): void { const plant = this.displayedPlants().slice(0, 8)[index]; if (plant) this.data.selectPlant(plant.id); }
  clearPlant(): void { this.data.selectPlant(null); }
  refresh(): void { this.data.refresh(); this.toast.info('Dashboard refreshing', 'Loading the latest barcode records.'); }
  openPlant(id = this.data.selectedPlantId()): void { if (id) this.router.navigate(['/plant/dashboard', id]); }
  viewAllRecords(): void { this.router.navigateByUrl('/barcode-records'); }
  plantScanCount(id: number): number { return this.scanMetrics().byPlant.get(id)?.total ?? 0; }
  plantPendingCount(id: number): number { return this.scanMetrics().byPlant.get(id)?.pending ?? 0; }
  private sameDay(value: Date, day: Date): boolean { const date = new Date(value); return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate(); }
}
