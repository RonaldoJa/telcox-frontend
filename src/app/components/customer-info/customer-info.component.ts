import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Customer } from '../../models/customer.model';
import { CurrencyEcPipe } from '../../pipes/currency-ec.pipe';

@Component({
  selector: 'app-customer-info',
  standalone: true,
  imports: [CommonModule, CurrencyEcPipe],
  templateUrl: './customer-info.component.html',
  styleUrls: ['./customer-info.component.scss']
})
export class CustomerInfoComponent {
  @Input() customer: Customer | null = null;
  @Input() balance: number = 0;
  
  // Computed properties usando signals
  customerName = computed(() => this.customer?.name || 'Cliente');
  customerInitials = computed(() => {
    if (!this.customer?.name) return 'C';
    return this.customer.name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  });
  
  planTypeColor = computed(() => {
    switch (this.customer?.plan_type) {
      case 'Premium': return 'bg-gradient-primary';
      case 'Empresarial': return 'bg-gradient-success';
      case 'Familiar': return 'bg-gradient-warning';
      case 'Básico': return 'bg-gradient-secondary';
      default: return 'bg-gradient-primary';
    }
  });
  
  balanceStatus = computed(() => {
    if (this.balance <= 5) return { class: 'text-danger', icon: 'fas fa-exclamation-triangle' };
    if (this.balance <= 15) return { class: 'text-warning', icon: 'fas fa-exclamation-circle' };
    return { class: 'text-success', icon: 'fas fa-check-circle' };
  });
}