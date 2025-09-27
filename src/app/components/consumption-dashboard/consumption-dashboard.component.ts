import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, interval, timer } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

import { CustomerService } from '../../services/customer.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingService } from '../../services/loading.service';
import { SystemService } from '../../services/system.service';

import { Customer, Consumption, UsageAlert, NetworkMetrics } from '../../models/customer.model';
import { SystemStatus } from '../../models/api.models';

// Pipes
import { BytesPipe } from '../../pipes/bytes.pipe';
import { CurrencyEcPipe } from '../../pipes/currency-ec.pipe';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { PercentagePipe } from '../../pipes/percentage.pipe';
import { DurationPipe } from '../../pipes/duration.pipe';
import { PhonePipe } from '../../pipes/phone.pipe';

// Components
import { CustomerInfoComponent } from '../customer-info/customer-info.component';
import { UsageMetricsComponent } from '../usage-metrics/usage-metrics.component';
import { BillingInfoComponent } from '../billing-info/billing-info.component';
import { AlertsComponent } from '../shared/alerts/alerts.component';

@Component({
  selector: 'app-consumption-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CustomerInfoComponent,
    UsageMetricsComponent,
    BillingInfoComponent,
    AlertsComponent,
    BytesPipe,
    CurrencyEcPipe,
    TimeAgoPipe,
    PercentagePipe,
    DurationPipe,
    PhonePipe
  ],
  templateUrl: './consumption-dashboard.component.html',
  styleUrls: ['./consumption-dashboard.component.scss']
})
export class ConsumptionDashboardComponent implements OnInit, OnDestroy {
  // Services injection
  private readonly customerService = inject(CustomerService);
  private readonly notificationService = inject(NotificationService);
  private readonly loadingService = inject(LoadingService);
  private readonly systemService = inject(SystemService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Signals para estado reactivo
  customer = signal<Customer | null>(null);
  consumption = signal<Consumption | null>(null);
  networkMetrics = signal<NetworkMetrics | null>(null);
  systemStatus = signal<SystemStatus | null>(null);
  error = signal<string | null>(null);
  alerts = signal<UsageAlert[]>([]);
  lastUpdate = signal<Date | null>(null);

  // Configuración
  customerId = signal<number>(1);
  autoRefreshEnabled = signal<boolean>(true);
  refreshInterval = signal<number>(30000); // 30 segundos

  isLoading = computed(() => this.loadingService.isLoading());
  hasData = computed(() => this.customer() !== null && this.consumption() !== null);

  connectionQuality = computed(() => {
    const metrics = this.networkMetrics();
    if (!metrics || metrics.connection_speed === undefined) {
      return 'unknown';
    }

    if (metrics.quality) {
      return metrics.quality;
    }

    if (metrics.connection_speed > 50) return 'excellent';
    if (metrics.connection_speed > 25) return 'good';
    if (metrics.connection_speed > 10) return 'fair';
    return 'poor';
  });

  bssStatus = computed(() => {
    const status = this.systemStatus();
    return status?.bss?.status || 'unknown';
  });

  private readonly destroy$ = new Subject<void>();
  private readonly autoRefreshTimer$ = new Subject<void>();

  ngOnInit(): void {
    this.loadUserPreferences();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        const newCustomerId = +params['id'];
        if (newCustomerId !== this.customerId()) {
          this.customerId.set(newCustomerId);
          this.customerService.setSelectedCustomerId(newCustomerId);
        }
      }
    });

    // Inicializar datos
    this.initializeData();

    // Configurar auto-refresh
    this.setupAutoRefresh();

    // Monitorear estado del sistema
    this.monitorSystemHealth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.autoRefreshTimer$.next();
    this.autoRefreshTimer$.complete();
  }

  /**
   * Inicializar datos del dashboard
   */
  private initializeData(): void {
    this.loadCustomerData();
    this.loadNetworkMetrics();
    this.loadSystemStatus();
  }

  /**
   * Cargar datos del cliente
   */
  private loadCustomerData(): void {
    this.error.set(null);

    this.customerService.getCustomerConsumption(this.customerId())
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: Error) => {
          this.handleError('Error al cargar datos del cliente', error);
          return of(null);
        })
      )
      .subscribe(data => {
        if (data) {
          this.customer.set(data.customer);
          this.consumption.set(data.consumption);
          this.lastUpdate.set(new Date());
          this.checkAndUpdateAlerts(data.consumption);
          this.error.set(null);
        }
      });
  }

  /**
   * Cargar métricas de red
   */
  private loadNetworkMetrics(): void {
    this.customerService.getNetworkMetrics(this.customerId())
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: Error) => {
          console.warn('Network metrics not available:', error);
          return of(null);
        })
      )
      .subscribe(metrics => {
        this.networkMetrics.set(metrics);
      });
  }

  /**
   * Cargar estado del sistema
   */
  private loadSystemStatus(): void {
    this.systemService.getSystemStatus()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: Error) => {
          console.warn('System status not available:', error);
          return of(null);
        })
      )
      .subscribe(status => {
        this.systemStatus.set(status);
      });
  }


  private setupAutoRefresh(): void {
    interval(10000)
      .pipe(
        takeUntil(this.autoRefreshTimer$),
        switchMap(() => {
          if (this.autoRefreshEnabled()) {
            return this.customerService.getNetworkMetrics(this.customerId());
          }
          return of(null);
        }),
        catchError(() => of(null))
      )
      .subscribe(metrics => {
        if (metrics) {
          this.networkMetrics.set(metrics);
        }
      });
  }

  /**
   * Monitorear salud del sistema
   */
  private monitorSystemHealth(): void {
    this.systemService.getSystemStatus()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: Error) => {
          console.warn('System monitoring failed:', error);
          return of(null);
        })
      )
      .subscribe(status => {
        if (status) {
          const previousStatus = this.systemStatus();
          this.systemStatus.set(status);

          if (previousStatus && previousStatus.bss.status !== status.bss.status) {
            if (status.bss.status === 'offline') {
              this.notificationService.showError(
                'Sistema BSS No Disponible',
                'El sistema BSS está temporalmente fuera de línea.'
              );
            } else if (status.bss.status === 'online' && previousStatus.bss.status === 'offline') {
              this.notificationService.showSuccess(
                'Sistema BSS Restaurado',
                'El sistema BSS está nuevamente operativo.'
              );
            }
          }
        }
      });
  }


  refreshData(): void {
    this.customerService.clearCustomerCache(this.customerId());
    this.loadCustomerData();
    this.loadNetworkMetrics();
    this.loadSystemStatus();

    this.notificationService.showInfo(
      'Datos Actualizados',
      'La información ha sido actualizada desde el sistema BSS'
    );
  }


  toggleAutoRefresh(): void {
    const newState = !this.autoRefreshEnabled();
    this.autoRefreshEnabled.set(newState);
    this.customerService.setAutoRefresh(newState);
    this.saveUserPreferences();

    this.notificationService.showInfo(
      'Auto-actualización',
      newState ? 'Habilitada' : 'Deshabilitada'
    );

    if (newState) {
      this.setupAutoRefresh();
    } else {
      this.autoRefreshTimer$.next();
    }
  }

  setRefreshInterval(intervalMs: number): void {
    this.refreshInterval.set(intervalMs);
    this.saveUserPreferences();

    // Reiniciar auto-refresh con nuevo intervalo
    if (this.autoRefreshEnabled()) {
      this.autoRefreshTimer$.next();
      timer(0, intervalMs)
        .pipe(takeUntil(this.autoRefreshTimer$))
        .subscribe(() => {
          if (this.autoRefreshEnabled()) {
            this.loadNetworkMetrics();
          }
        });
    }
  }

  /**
   * Navegar a detalles del cliente
   */
  navigateToCustomerDetail(): void {
    this.router.navigate(['/customer', this.customerId()]);
  }

  /**
   * Verificar y generar alertas basadas en el consumo
   */
  private checkAndUpdateAlerts(consumption: Consumption): void {
    const alerts: UsageAlert[] = [];

    // Alertas de datos
    if (consumption.data_usage_percentage >= 95) {
      alerts.push({
        type: 'danger',
        title: 'Límite de datos crítico',
        message: `Has utilizado el ${consumption.data_usage_percentage.toFixed(1)}% de tus datos. El servicio puede verse afectado.`,
        percentage: consumption.data_usage_percentage,
        category: 'data'
      });
    } else if (consumption.data_usage_percentage >= 90) {
      alerts.push({
        type: 'danger',
        title: 'Límite de datos casi alcanzado',
        message: `Has utilizado el ${consumption.data_usage_percentage.toFixed(1)}% de tus datos.`,
        percentage: consumption.data_usage_percentage,
        category: 'data'
      });
    } else if (consumption.data_usage_percentage >= 70) {
      alerts.push({
        type: 'warning',
        title: 'Alto consumo de datos',
        message: `Has utilizado el ${consumption.data_usage_percentage.toFixed(1)}% de tus datos disponibles.`,
        percentage: consumption.data_usage_percentage,
        category: 'data'
      });
    }

    if (consumption.minutes_usage_percentage >= 95) {
      alerts.push({
        type: 'danger',
        title: 'Límite de minutos crítico',
        message: `Has utilizado el ${consumption.minutes_usage_percentage.toFixed(1)}% de tus minutos.`,
        percentage: consumption.minutes_usage_percentage,
        category: 'minutes'
      });
    } else if (consumption.minutes_usage_percentage >= 90) {
      alerts.push({
        type: 'danger',
        title: 'Límite de minutos casi alcanzado',
        message: `Has utilizado el ${consumption.minutes_usage_percentage.toFixed(1)}% de tus minutos.`,
        percentage: consumption.minutes_usage_percentage,
        category: 'minutes'
      });
    } else if (consumption.minutes_usage_percentage >= 70) {
      alerts.push({
        type: 'warning',
        title: 'Alto consumo de minutos',
        message: `Has utilizado el ${consumption.minutes_usage_percentage.toFixed(1)}% de tus minutos disponibles.`,
        percentage: consumption.minutes_usage_percentage,
        category: 'minutes'
      });
    }

    if (consumption.account_balance <= 2) {
      alerts.push({
        type: 'danger',
        title: 'Saldo crítico',
        message: `Tu saldo actual es muy bajo: ${this.formatCurrency(consumption.account_balance)}. Recarga inmediatamente.`,
        percentage: 0,
        category: 'balance'
      });
    } else if (consumption.account_balance <= 5) {
      alerts.push({
        type: 'danger',
        title: 'Saldo bajo',
        message: `Tu saldo actual es de ${this.formatCurrency(consumption.account_balance)}. Considera recargar.`,
        percentage: 0,
        category: 'balance'
      });
    } else if (consumption.account_balance <= 10) {
      alerts.push({
        type: 'warning',
        title: 'Saldo bajo',
        message: `Tu saldo actual es de ${this.formatCurrency(consumption.account_balance)}.`,
        percentage: 0,
        category: 'balance'
      });
    }

    this.alerts.set(alerts);
  }


  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  
  formatBytes(bytes: number, unit: string = 'B'): string {
    if (unit === 'MB') {
      if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(1)} GB`;
      }
      return `${bytes.toFixed(0)} MB`;
    }
    return `${bytes} B`;
  }


  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  
  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays}d`;
  }

  
  getProgressBarClass(percentage: number): string {
    if (percentage >= 95) return 'bg-danger';
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-success';
  }

 
  getConnectionIcon(): string {
    switch (this.connectionQuality()) {
      case 'excellent': return 'fas fa-signal text-success';
      case 'good': return 'fas fa-signal text-info';
      case 'fair': return 'fas fa-signal text-warning';
      case 'poor': return 'fas fa-signal text-danger';
      default: return 'fas fa-question-circle text-muted';
    }
  }

  
  getBssIcon(): string {
    switch (this.bssStatus()) {
      case 'online': return 'fas fa-check-circle text-success';
      case 'offline': return 'fas fa-times-circle text-danger';
      case 'degraded': return 'fas fa-exclamation-triangle text-warning';
      default: return 'fas fa-question-circle text-muted';
    }
  }

  
  formatSpeed(speed: number | undefined): string {
    if (speed === undefined || speed === null) {
      return 'N/A';
    }

    if (speed >= 1000) {
      return `${(speed / 1000).toFixed(1)} Gbps`;
    }
    return `${speed.toFixed(1)} Mbps`;
  }

  
  private handleError(title: string, error: Error): void {
    console.error(title, error);
    this.error.set(error.message || 'Error desconocido');
    this.notificationService.showError(title, error.message || 'Error desconocido');
  }

 
  private saveUserPreferences(): void {
    const preferences = {
      autoRefresh: this.autoRefreshEnabled(),
      refreshInterval: this.refreshInterval(),
      customerId: this.customerId()
    };
    localStorage.setItem('telcox_dashboard_preferences', JSON.stringify(preferences));
  }

  
  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('telcox_dashboard_preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        this.autoRefreshEnabled.set(preferences.autoRefresh ?? true);
        this.refreshInterval.set(preferences.refreshInterval ?? 30000);
        if (preferences.customerId) {
          this.customerId.set(preferences.customerId);
        }
      }
    } catch (error) {
      console.warn('Error loading user preferences:', error);
    }
  }
}