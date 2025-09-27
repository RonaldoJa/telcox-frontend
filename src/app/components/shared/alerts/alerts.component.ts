import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { UsageAlert } from '../../../models/customer.model';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts-container" [@staggerIn]="alerts.length">
      @for (alert of alerts; track alert.category + alert.type) {
        <div 
          class="alert-item"
          [class]="'alert alert-' + alert.type"
          [@fadeInUp]>
          
          <div class="alert-content">
            <div class="alert-icon">
              <i [class]="getIconClass(alert)"></i>
            </div>
            
            <div class="alert-text">
              <div class="alert-title">{{ alert.title }}</div>
              <div class="alert-message">{{ alert.message }}</div>
            </div>
            
            @if (alert.percentage > 0) {
              <div class="alert-badge">
                <span class="badge" [class]="'bg-' + alert.type">
                  {{ alert.percentage.toFixed(0) }}%
                </span>
              </div>
            }
          </div>
          
          @if (alert.category !== 'balance') {
            <div class="alert-progress">
              <div 
                class="progress-bar"
                [class]="'bg-' + alert.type"
                [style.width.%]="alert.percentage">
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./alerts.component.scss'],
  animations: [
    trigger('staggerIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(-20px)' }),
          stagger(100, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class AlertsComponent {
  @Input() alerts: UsageAlert[] = [];

  getIconClass(alert: UsageAlert): string {
    if (alert.category === 'data') {
      return 'fas fa-wifi';
    } else if (alert.category === 'minutes') {
      return 'fas fa-phone';
    } else if (alert.category === 'balance') {
      return 'fas fa-dollar-sign';
    }
    return 'fas fa-exclamation-circle';
  }
}