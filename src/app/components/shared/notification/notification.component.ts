import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NotificationService, Notification } from '../../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      @for (notification of notifications; track notification.id) {
        <div 
          class="notification-item"
          [class]="'alert alert-' + notification.type"
          [@slideIn]
          (click)="removeNotification(notification.id)">
          
          <div class="notification-content">
            <div class="notification-header">
              <i [class]="getIconClass(notification.type)"></i>
              <strong>{{ notification.title }}</strong>
              <button type="button" class="btn-close btn-close-sm" 
                      (click)="removeNotification(notification.id); $event.stopPropagation()">
              </button>
            </div>
            <div class="notification-message">
              {{ notification.message }}
            </div>
            <div class="notification-time">
              {{ formatTime(notification.timestamp) }}
            </div>
          </div>
          
          @if (notification.duration) {
            <div class="notification-progress">
              <div class="progress-bar" 
                   [style.animation-duration.ms]="notification.duration">
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./notification.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class NotificationComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();
  
  notifications: Notification[] = [];

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  removeNotification(id: string): void {
    this.notificationService.removeNotification(id);
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-bell';
    }
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}