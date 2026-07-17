import { Component, computed, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCamera,
  LucideCheck,
  LucideCircleAlert,
  LucideClock3,
  LucideKeyboard,
  LucidePackageCheck,
  LucideScanBarcode,
  LucideWifiOff,
  LucideX,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { AuthStore } from '../../core/auth.store';
import { ScanSource } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { SearchSelect } from '../../shared/search-select/search-select';

@Component({
  selector: 'app-scan',
  imports: [
    LucideArrowLeft, LucideArrowRight, LucideCamera, LucideCheck, LucideCircleAlert,
    RouterLink, SearchSelect, LucideClock3, LucideKeyboard, LucidePackageCheck, LucideScanBarcode, LucideWifiOff, LucideX,
  ],
  templateUrl: './scan.html',
  styleUrl: './scan.scss',
})
export class Scan implements OnDestroy {
  readonly data = inject(DataStore);
  readonly auth = inject(AuthStore);
  readonly toast = inject(ToastService);
  readonly step = signal(1);
  readonly plantId = signal(1);
  readonly articleCode = signal('');
  readonly entrySource = signal<ScanSource>('Camera');
  readonly result = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly cameraOpen = signal(false);
  readonly cameraError = signal('');
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('scannerVideo');
  readonly foundArticle = computed(() => {
    const scannedValue = this.articleCode().trim();
    const code = scannedValue.toUpperCase();
    return this.data.articles().find((article) => article.code === code || article.barcode === scannedValue) ?? null;
  });
  readonly plantLocked = computed(() => this.auth.role() === 'Plant Operator');
  readonly plantOptions = computed(() => this.data.plants().map((plant) => ({ value: plant.id, label: `${plant.code} — ${plant.name}`, description: `${plant.location}, ${plant.state}` })));
  readonly recentScans = computed(() => this.data.scans()
    .filter((scan) => !this.plantLocked() || scan.plantId === this.auth.assignedPlantId())
    .slice(0, 10));
  private reader?: BrowserMultiFormatReader;
  private controls?: IScannerControls;

  constructor() {
    if (this.plantLocked()) this.plantId.set(this.auth.assignedPlantId());
    effect(() => {
      if (this.data.online()) this.data.retryPending();
    });
  }

  setPlantValue(value: string | number | null): void {
    if (this.plantLocked()) return;
    this.plantId.set(Number(value));
  }

  updateCode(event: Event): void {
    this.articleCode.set((event.target as HTMLInputElement).value);
    this.entrySource.set('Manual');
    this.result.set(null);
  }

  goToConfirm(): void {
    if (!this.foundArticle()) {
      this.result.set({ type: 'error', message: 'Barcode not recognised. Scan the label again or ask a supervisor to check it.' });
      this.errorTone();
      return;
    }
    this.stopCamera();
    this.result.set(null);
    this.step.set(3);
  }

  submit(): void {
    const outcome = this.data.addScan({
      plantId: this.plantId(),
      articleCode: this.articleCode(),
      source: this.entrySource(),
    });
    this.result.set({ type: outcome.ok ? 'success' : 'error', message: outcome.message });
    if (outcome.ok) {
      this.successTone();
      if (navigator.vibrate) navigator.vibrate(80);
    } else {
      this.errorTone();
    }
  }

  scanAnother(): void {
    this.result.set(null);
    this.articleCode.set('');
    this.entrySource.set('Camera');
    this.cameraError.set('');
    this.step.set(2);
  }

  async startCamera(): Promise<void> {
    this.cameraOpen.set(true);
    this.cameraError.set('');
    this.result.set(null);
    await new Promise((resolve) => setTimeout(resolve));
    const video = this.video()?.nativeElement;
    if (!video) return;
    try {
      this.reader = new BrowserMultiFormatReader();
      this.controls = await this.reader.decodeFromVideoDevice(undefined, video, (scanResult) => {
        if (scanResult) {
          this.articleCode.set(scanResult.getText());
          this.entrySource.set('Camera');
          this.stopCamera();
          this.goToConfirm();
        }
      });
    } catch {
      this.stopCamera();
      this.cameraError.set('Camera could not start. Allow camera access and try again.');
    }
  }

  stopCamera(): void {
    this.controls?.stop();
    this.controls = undefined;
    this.cameraOpen.set(false);
  }

  plantName(): string { return this.data.plantName(this.plantId()); }
  plantCode(): string { return this.data.plants().find((plant) => plant.id === this.plantId())?.code ?? ''; }
  time(date: Date): string { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)); }
  retrySync(): void { this.data.online.set(true); this.data.retryPending(); this.toast.success('Sync complete', 'Pending barcode scans have been sent successfully.'); }

  private tone(frequency: number, duration: number): void {
    try {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch { /* Device does not support WebAudio. Visual feedback remains. */ }
  }
  private successTone(): void { this.tone(880, 0.12); }
  private errorTone(): void { this.tone(180, 0.2); }
  ngOnDestroy(): void { this.stopCamera(); }
}
