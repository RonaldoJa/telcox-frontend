import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Customer, Consumption } from '../../models/customer.model';

@Component({
  selector: 'app-billing-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './billing-info.component.html',
  styleUrls: ['./billing-info.component.scss']
})
export class BillingInfoComponent {
  @Input() consumption: Consumption | null = null;
  @Input() customer: Customer | null = null;

  daysInCycle = computed(() => {
    if (!this.consumption) return 0;
    
    const start = new Date(this.consumption.billing_cycle_start);
    const end = new Date(this.consumption.billing_cycle_end);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  });

  daysRemaining = computed(() => {
    if (!this.consumption) return 0;
    
    const today = new Date();
    const end = new Date(this.consumption.billing_cycle_end);
    const diffTime = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  });

  daysElapsed = computed(() => {
    return this.daysInCycle() - this.daysRemaining();
  });

  cycleProgress = computed(() => {
    if (this.daysInCycle() === 0) return 0;
    return (this.daysElapsed() / this.daysInCycle()) * 100;
  });

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getCycleStatusColor(): string {
    const remaining = this.daysRemaining();
    if (remaining <= 3) return 'text-danger';
    if (remaining <= 7) return 'text-warning';
    return 'text-success';
  }

  getCycleStatusIcon(): string {
    const remaining = this.daysRemaining();
    if (remaining <= 3) return 'fas fa-exclamation-triangle';
    if (remaining <= 7) return 'fas fa-clock';
    return 'fas fa-check-circle';
  }
}