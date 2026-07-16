import { Component, computed, effect, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
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
  LucideRotateCcw,
  LucideScanBarcode,
  LucideWifiOff,
  LucideX,
} from '@lucide/angular';
import { DataStore } from '../../core/data.store';
import { AuthStore } from '../../core/auth.store';
import { ScanStage } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-scan',
  imports: [
    LucideArrowLeft, LucideArrowRight, LucideCamera, LucideCheck, LucideCircleAlert,
    LucideClock3, LucideKeyboard, LucidePackageCheck, LucideRotateCcw, LucideScanBarcode,
    LucideWifiOff, LucideX,
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
  readonly stage = signal<ScanStage>('Packed');
  readonly articleCode = signal('');
  readonly quantity = signal(24);
  readonly batch = signal(`B-2607-${String(120 + Math.floor(Math.random() * 20))}`);
  readonly result = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly cameraOpen = signal(false);
  readonly cameraError = signal('');
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('scannerVideo');
  readonly stages: { name: ScanStage; description: string }[] = [
    { name: 'Raw Material In', description: 'Material received at plant' },
    { name: 'WIP', description: 'Moved into production' },
    { name: 'QC Pass', description: 'Quality check accepted' },
    { name: 'Packed', description: 'Packed and ready' },
    { name: 'Dispatched', description: 'Loaded for dispatch' },
  ];
  readonly foundArticle = computed(() => {
    const code = this.articleCode().trim().toUpperCase();
    return this.data.articles().find((article) => article.code === code || article.barcode === this.articleCode().trim()) ?? null;
  });
  readonly plantLocked = computed(() => this.auth.role() === 'Plant Operator');
  readonly recentScans = computed(() => this.data.scans().filter((scan) => !this.plantLocked() || scan.plantId === this.auth.assignedPlantId()).slice(0, 10));
  readonly recentUnits = computed(() => this.recentScans().reduce((sum, scan) => sum + scan.quantity, 0));
  private reader?: BrowserMultiFormatReader;
  private controls?: IScannerControls;

  constructor() {
    if (this.auth.role() === 'Plant Operator') {
      this.plantId.set(this.auth.assignedPlantId());
      this.step.set(2);
    }
    effect(() => {
      if (this.data.online()) this.data.retryPending();
    });
  }

  setPlant(event: Event): void {
    if (this.plantLocked()) return;
    this.plantId.set(Number((event.target as HTMLSelectElement).value));
  }

  chooseStage(stage: ScanStage): void {
    this.stage.set(stage);
    this.step.set(3);
  }

  updateCode(event: Event): void {
    this.articleCode.set((event.target as HTMLInputElement).value);
    this.result.set(null);
  }

  updateQuantity(event: Event): void {
    this.quantity.set(Math.max(1, Number((event.target as HTMLInputElement).value) || 1));
  }

  updateBatch(event: Event): void {
    this.batch.set((event.target as HTMLInputElement).value.toUpperCase());
  }

  decreaseQuantity(): void { this.quantity.set(Math.max(1, this.quantity() - 1)); }
  increaseQuantity(): void { this.quantity.update((value) => value + 1); }

  goToConfirm(): void {
    if (!this.foundArticle()) {
      this.result.set({ type: 'error', message: 'Unknown article code. Scan again or check the code on the label.' });
      this.errorTone();
      return;
    }
    this.stopCamera();
    this.result.set(null);
    this.step.set(4);
  }

  submit(): void {
    const outcome = this.data.addScan({
      plantId: this.plantId(), stage: this.stage(), articleCode: this.articleCode(), quantity: this.quantity(), batch: this.batch(),
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
    this.quantity.set(24);
    this.batch.set(`B-2607-${String(120 + Math.floor(Math.random() * 70))}`);
    this.step.set(3);
  }

  async startCamera(): Promise<void> {
    this.cameraOpen.set(true);
    this.cameraError.set('');
    await new Promise((resolve) => setTimeout(resolve));
    const video = this.video()?.nativeElement;
    if (!video) return;
    try {
      this.reader = new BrowserMultiFormatReader();
      this.controls = await this.reader.decodeFromVideoDevice(undefined, video, (scanResult) => {
        if (scanResult) {
          this.articleCode.set(scanResult.getText());
          this.stopCamera();
          this.goToConfirm();
        }
      });
    } catch {
      this.cameraError.set('Camera could not start. Allow camera access or enter the article code below.');
    }
  }

  stopCamera(): void {
    this.controls?.stop();
    this.controls = undefined;
    this.cameraOpen.set(false);
  }

  plantName(): string { return this.data.plantName(this.plantId()); }
  time(date: Date): string { return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date)); }
  undo(id: number): void { this.data.undoScan(id); this.toast.info('Scan removed', 'The movement was removed from this device’s recent activity.'); }
  retrySync(): void { this.data.online.set(true); this.data.retryPending(); this.toast.success('Sync complete', 'Pending plant-floor scans have been sent successfully.'); }

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
