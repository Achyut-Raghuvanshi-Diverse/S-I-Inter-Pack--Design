import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartComponent } from 'ng-apexcharts';
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

@Component({
  selector: 'app-plant-dashboard',
  imports: [
    ChartComponent, RouterLink, LucideArrowLeft, LucideArrowRight, LucideBarcode,
    LucideBoxes, LucideCamera, LucideCheckCircle2, LucideClipboardList, LucideFactory,
    LucideKeyboard, LucidePackageCheck, LucideScanLine, LucideWifiOff,
  ],
  templateUrl: './plant-dashboard.html',
  styleUrl: './plant-dashboard.scss',
})
export class PlantDashboard {
  readonly data = inject(DataStore);
  readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  readonly range = signal<7 | 30>(7);
  readonly plantId = computed(() => this.auth.role() === 'Plant Operator'
    ? this.auth.assignedPlantId()
    : Number(this.route.snapshot.paramMap.get('plantId')) || this.data.selectedPlantId() || 1);
  readonly plant = computed(() => this.data.plants().find((item) => item.id === this.plantId())!);
  readonly scans = computed(() => this.data.scans().filter((scan) => scan.plantId === this.plantId()));
  readonly recentScans = computed(() => this.scans().slice(0, 8));
  readonly todayScans = computed(() => this.scans().filter((scan) => this.isToday(scan.timestamp)).length);
  readonly cameraScans = computed(() => this.scans().filter((scan) => scan.source === 'Camera').length);
  readonly manualScans = computed(() => this.scans().filter((scan) => scan.source === 'Manual').length);
  readonly pendingScans = computed(() => this.scans().filter((scan) => scan.syncStatus === 'Pending').length);
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
  readonly trendChart: any = { type: 'bar', height: 275, toolbar: { show: false }, fontFamily: 'IBM Plex Sans', animations: { speed: 320 } };
  readonly trendPlot: any = { bar: { columnWidth: '45%', borderRadius: 4 } };
  readonly methodChart: any = { type: 'donut', height: 275, toolbar: { show: false }, fontFamily: 'IBM Plex Sans' };
  readonly methodPlot: any = { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'All scans', formatter: () => String(this.scans().length) } } } } };
  readonly methodLegend: any = { position: 'bottom', fontSize: '10px', markers: { size: 5 } };
  readonly grid: any = { borderColor: '#ececf3', strokeDashArray: 4 };
  readonly yaxis: any = { min: 0, forceNiceScale: true, labels: { style: { colors: '#767986', fontSize: '9px' } } };

  time(value: Date): string { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  private isToday(value: Date): boolean { return this.sameDay(value, new Date()); }
  private sameDay(value: Date, day: Date): boolean {
    const date = new Date(value);
    return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
  }
}
