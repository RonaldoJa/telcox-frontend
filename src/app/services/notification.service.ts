import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
  persistent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Signals para estado reactivo
  private notificationsSignal = signal<Notification[]>([]);
  
  // Observable para compatibilidad
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$: Observable<Notification[]> = this.notificationsSubject.asObservable();
  
  // Configuración
  private readonly maxNotifications = 5;
  private readonly defaultDuration = 5000;

  /**
   * Mostrar notificación de éxito
   */
  showSuccess(title: string, message: string, duration: number = this.defaultDuration): void {
    this.addNotification('success', title, message, duration);
  }

  /**
   * Mostrar notificación de error
   */
  showError(title: string, message: string, duration: number = 8000): void {
    this.addNotification('error', title, message, duration);
  }

  /**
   * Mostrar notificación de advertencia
   */
  showWarning(title: string, message: string, duration: number = 6000): void {
    this.addNotification('warning', title, message, duration);
  }

  /**
   * Mostrar notificación informativa
   */
  showInfo(title: string, message: string, duration: number = 4000): void {
    this.addNotification('info', title, message, duration);
  }

  /**
   * Mostrar notificación persistente (no se oculta automáticamente)
   */
  showPersistent(
    type: Notification['type'], 
    title: string, 
    message: string, 
    actions?: NotificationAction[]
  ): void {
    this.addNotification(type, title, message, undefined, true, actions);
  }

  /**
   * Agregar notificación genérica
   */
  private addNotification(
    type: Notification['type'], 
    title: string, 
    message: string, 
    duration?: number,
    persistent: boolean = false,
    actions?: NotificationAction[]
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      title,
      message,
      duration: persistent ? undefined : duration,
      timestamp: new Date(),
      persistent,
      actions
    };

    const currentNotifications = this.notificationsSignal();
    let newNotifications = [...currentNotifications, notification];
    
    // Limitar número máximo de notificaciones
    if (newNotifications.length > this.maxNotifications) {
      newNotifications = newNotifications.slice(-this.maxNotifications);
    }
    
    this.notificationsSignal.set(newNotifications);
    this.notificationsSubject.next(newNotifications);

    if (!persistent && duration && duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, duration);
    }

    // Log para debugging
    console.log(`Notification ${type}: ${title} - ${message}`);
  }

  /**
   * Remover notificación específica
   */
  removeNotification(id: string): void {
    const currentNotifications = this.notificationsSignal();
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    
    this.notificationsSignal.set(filteredNotifications);
    this.notificationsSubject.next(filteredNotifications);
  }

  /**
   * Limpiar todas las notificaciones
   */
  clearAll(): void {
    this.notificationsSignal.set([]);
    this.notificationsSubject.next([]);
  }

  /**
   * Limpiar notificaciones por tipo
   */
  clearByType(type: Notification['type']): void {
    const currentNotifications = this.notificationsSignal();
    const filteredNotifications = currentNotifications.filter(n => n.type !== type);
    
    this.notificationsSignal.set(filteredNotifications);
    this.notificationsSubject.next(filteredNotifications);
  }

  /**
   * Obtener todas las notificaciones actuales
   */
  getNotifications(): Notification[] {
    return this.notificationsSignal();
  }

  /**
   * Obtener notificaciones por tipo
   */
  getNotificationsByType(type: Notification['type']): Notification[] {
    return this.notificationsSignal().filter(n => n.type === type);
  }

  /**
   * Verificar si hay notificaciones de un tipo específico
   */
  hasNotificationsOfType(type: Notification['type']): boolean {
    return this.notificationsSignal().some(n => n.type === type);
  }

  /**
   * Generar ID único para notificaciones
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mostrar notificación de conexión perdida
   */
  showConnectionLost(): void {
    this.showPersistent(
      'error',
      'Conexión Perdida',
      'Se ha perdido la conexión con el servidor. Verificando...',
      [
        {
          label: 'Reintentar',
          action: () => window.location.reload(),
          style: 'primary'
        }
      ]
    );
  }

  /**
   * Mostrar notificación de conexión restaurada
   */
  showConnectionRestored(): void {
    this.clearByType('error'); 
    this.showSuccess(
      'Conexión Restaurada',
      'La conexión con el servidor ha sido restaurada.'
    );
  }
}