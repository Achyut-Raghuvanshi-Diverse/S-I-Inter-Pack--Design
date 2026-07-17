import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-pagination',
  imports: [LucideChevronLeft, LucideChevronRight],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly total = input.required<number>();
  readonly pageSize = input(10);
  readonly noun = input('records');
  readonly pageChange = output<number>();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly from = computed(() => this.total() ? (this.page() - 1) * this.pageSize() + 1 : 0);
  readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
  readonly pageNumbers = computed(() => {
    const count = this.pages(); const current = this.page();
    if (count <= 5) return Array.from({ length: count }, (_, index) => index + 1);
    const start = Math.max(1, Math.min(current - 2, count - 4));
    return Array.from({ length: 5 }, (_, index) => start + index);
  });
  go(page: number): void { this.pageChange.emit(Math.max(1, Math.min(this.pages(), page))); }
}
