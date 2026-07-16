import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChartComponent } from 'ng-apexcharts';
import {
  LucideArrowLeft, LucideArrowRight, LucideBoxes, LucideCalendarDays, LucideCheckCircle2,
  LucideFactory, LucideGauge, LucidePackageCheck, LucideScanLine, LucideTruck, LucideWarehouse,
} from '@lucide/angular';
import { AuthStore } from '../../core/auth.store';
import { DataStore } from '../../core/data.store';
import { ScanStage } from '../../core/models';

@Component({
  selector: 'app-plant-dashboard',
  imports: [ChartComponent, DecimalPipe, RouterLink, LucideArrowLeft, LucideArrowRight, LucideBoxes, LucideCalendarDays, LucideCheckCircle2, LucideFactory, LucideGauge, LucidePackageCheck, LucideScanLine, LucideTruck, LucideWarehouse],
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
  readonly todayUnits = computed(() => this.scans().reduce((sum, scan) => sum + scan.quantity, 0) + 612 + this.plantId() * 19);
  readonly mtdUnits = computed(() => this.plant().output);
  readonly utilization = computed(() => this.plant().output / this.plant().capacity * 100);
  readonly qcPass = computed(() => 98.2 - (this.plantId() % 3) * .3);
  readonly stages: ScanStage[] = ['Raw Material In', 'WIP', 'QC Pass', 'Packed', 'Dispatched'];
  readonly stageValues = computed(() => {
    const base = [920, 824, 781, 746, 698].map((value) => value + this.plantId() * 11);
    this.scans().forEach((scan) => { base[this.stages.indexOf(scan.stage)] += scan.quantity; });
    return base;
  });
  readonly stageSeries = computed(() => [{ name: 'Units', data: this.stageValues() }]);
  readonly trendSeries = computed(() => [{ name: 'Finished units', data: Array.from({ length: this.range() }, (_, index) => {
    const seed = this.plantId() * 31 + index * 17;
    return Math.round(this.plant().output / 26 + (seed % 120) - 55);
  }) }]);
  readonly trendCategories = computed(() => Array.from({ length: this.range() }, (_, index) => this.range() === 7 ? ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'][index] : String(index + 1)));
  readonly trendChart: any = { type: 'area', height: 245, toolbar: { show: false }, fontFamily: 'IBM Plex Sans', animations: { speed: 280 } };
  readonly stageChart: any = { type: 'bar', height: 245, toolbar: { show: false }, fontFamily: 'IBM Plex Sans' };
  readonly stagePlot: any = { bar: { horizontal: true, barHeight: '44%', borderRadius: 1, distributed: true } };
  readonly dataLabels: any = { enabled: true, style: { fontSize: '9px', fontWeight: 700 }, offsetX: 8, formatter: (value: number) => value.toLocaleString('en-IN') };
  readonly lineStroke: any = { width: 2.5, curve: 'straight' };
  readonly lineFill: any = { type: 'gradient', gradient: { opacityFrom: .2, opacityTo: .02, stops: [0, 95] } };
  readonly grid: any = { borderColor: '#e8e9ed', strokeDashArray: 3 };
  readonly yaxis: any = { labels: { style: { colors: '#767986', fontSize: '9px' } } };

  time(value: Date): string { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
  statusClass(): string { return this.plant().status === 'On target' ? 'success' : this.plant().status === 'Behind' ? 'warning' : 'danger'; }
}
