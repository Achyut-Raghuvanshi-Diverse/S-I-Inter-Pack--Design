import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApexChart, ApexGrid, ApexLegend, ApexPlotOptions, ApexYAxis, ChartComponent } from 'ng-apexcharts';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideBarcode,
  LucideBoxes,
  LucideCamera,
  LucideCheckCircle2,
  LucideClipboardList,
  LucideFactory,
  LucideKeyboard,
  LucidePackageCheck,
  LucideScanLine,
  LucideWifiOff,
} from '@lucide/angular';
import { AuthStore } from '../../core/auth.store';
import { DataStore } from '../../core/data.store';
import { CHART_FONT_FAMILY, CHART_GRID_COLOR } from '../../shared/chart-theme';

@Component({
  selector: 'app-plant-dashboard',
  imports: [
    ChartComponent, RouterLink, LucideArrowLeft, LucideArrowRight, LucideBarcode,
    LucideBoxes, LucideCamera, LucideCheckCircle2, LucideClipboardList, LucideFactory,
    LucideKeyboard, LucidePackageCheck, LucideScanLine, LucideWifiOff,
  ],
  templateUrl: './plant-dashboard.html',
  styleUrl: './plant-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlantDashboard {
  readonly data = inject(DataStore);
  readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  readonly range = signal<7 | 30>(7);
  readonly plantId = computed(() => this.auth.role() === 'Plant Operator'
    ? this.auth.assignedPlantId()
    : Number(this.route.snapshot.paramMap.get('plantId')) || this.data.selectedPlantId() || 1);
  readonly plant = computed(() => this.data.plantById(this.plantId()) ?? this.data.plants()[0]);
  readonly scans = computed(() => this.data.scans().filter((scan) => scan.plantId === this.plantId()));
  readonly recentScans = computed(() => this.scans().slice(0, 8));
  readonly scanMetrics = computed(() => {
    let today = 0; let camera = 0; let manual = 0; let pending = 0;
    for (const scan of this.scans()) {
      if (this.isToday(scan.timestamp)) today += 1;
      if (scan.source === 'Camera') camera += 1; else manual += 1;
      if (scan.syncStatus === 'Pending') pending += 1;
    }
    return { today, camera, manual, pending };
  });
  readonly todayScans = computed(() => this.scanMetrics().today);
  readonly cameraScans = computed(() => this.scanMetrics().camera);
  readonly manualScans = computed(() => this.scanMetrics().manual);
  readonly pendingScans = computed(() => this.scanMetrics().pending);
  readonly syncedScans = computed(() => this.scans().length - this.pendingScans());
  readonly trendDays = computed(() => Array.from({ length: this.range() }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (this.range() - index - 1));
    return date;
  }));
  readonly trendSeries = computed(() => [{
    name: 'Barcode scans',
    data: this.trendDays().map((day) => this.scans().filter((scan) => this.sameDay(scan.timestamp, day)).length),
  }]);
  readonly trendCategories = computed(() => this.trendDays().map((day) =>
    new Intl.DateTimeFormat('en-IN', this.range() === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }).format(day)));
  readonly methodSeries = computed(() => [this.cameraScans(), this.manualScans()]);
  readonly trendChart: ApexChart = { type: 'bar', height: 275, toolbar: { show: false }, fontFamily: CHART_FONT_FAMILY, animations: { speed: 320 }, accessibility: { enabled: true, description: 'Plant barcode scan trend', keyboard: { enabled: true } } };
  readonly trendPlot: ApexPlotOptions = { bar: { columnWidth: '45%', borderRadius: 4 } };
  readonly methodChart: ApexChart = { type: 'donut', height: 275, toolbar: { show: false }, fontFamily: CHART_FONT_FAMILY, accessibility: { enabled: true, description: 'Camera and manual barcode entry methods', keyboard: { enabled: true } } };
  readonly methodPlot: ApexPlotOptions = { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'All scans', formatter: () => String(this.scans().length) } } } } };
  readonly methodLegend: ApexLegend = { position: 'bottom', fontSize: '10px', markers: { size: 5 } };
  readonly grid: ApexGrid = { borderColor: CHART_GRID_COLOR, strokeDashArray: 4 };
  readonly yaxis: ApexYAxis = { min: 0, forceNiceScale: true, labels: { style: { colors: '#767986', fontSize: '9px' } } };

  time(value: Date): string { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  private isToday(value: Date): boolean { return this.sameDay(value, new Date()); }
  private sameDay(value: Date, day: Date): boolean {
    const date = new Date(value);
    return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
  }
}
