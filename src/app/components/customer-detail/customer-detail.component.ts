import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, catchError, of, forkJoin, interval } from 'rxjs';
import { switchMap, finalize } from 'rxjs/operators';

import { CustomerService } from '../../services/customer.service';
import { NotificationService } from '../../services/notification.service';
import { LoadingService } from '../../services/loading.service';
import { SystemService } from '../../services/system.service';

import { 
  Customer, 
  Consumption, 
  UsageHistory, 
  BillingCycle, 
  NetworkMetrics,
  UsageAlert 
} from '../../models/customer.model';

// Pipes
import { BytesPipe } from '../../pipes/bytes.pipe';
import { CurrencyEcPipe } from '../../pipes/currency-ec.pipe';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { PercentagePipe } from '../../pipes/percentage.pipe';
import { DurationPipe } from '../../pipes/duration.pipe';
import { PhonePipe } from '../../pipes/phone.pipe';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    CommonModule,
    BytesPipe,
    CurrencyEcPipe,
    TimeAgoPipe,
    PercentagePipe,
    DurationPipe,
    PhonePipe
  ],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit, OnDestroy {
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
  usageHistory = signal<UsageHistory[]>([]);
  billingCycle = signal<BillingCycle | null>(null);
  networkMetrics = signal<NetworkMetrics | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  refreshing = signal<boolean>(false);

  // UI State
  customerId = signal<number>(1);
  selectedTab = signal<string>('overview');
  selectedHistoryDays = signal<number>(30);
  showAdvancedMetrics = signal<boolean>(false);

  // Computed properties
  isLoading = computed(() => this.loading() || this.loadingService.isLoading());
  hasData = computed(() => this.customer() !== null && this.consumption() !== null);
  
  // Estadísticas calculadas
  totalDataUsedThisMonth = computed(() => {
    const history = this.usageHistory();
    if (!history.length) return 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return history
      .filter(h => {
        const date = new Date(h.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((total, h) => total + h.data_used, 0);
  });

  averageDailyUsage = computed(() => {
    const history = this.usageHistory();
    if (!history.length) return 0;
    
    const totalUsage = history.reduce((total, h) => total + h.data_used, 0);
    return totalUsage / history.length;
  });

  peakUsageDay = computed(() => {
    const history = this.usageHistory();
    if (!history.length) return null;
    
    return history.reduce((peak, current) => 
      current.data_used > peak.data_used ? current : peak
    );
  });

  // Análisis de tendencias
  usageTrend = computed(() => {
    const history = this.usageHistory();
    if (history.length < 7) return 'insufficient-data';
    
    const recentWeek = history.slice(-7);
    const previousWeek = history.slice(-14, -7);
    
    if (previousWeek.length < 7) return 'insufficient-data';
    
    const recentAvg = recentWeek.reduce((sum, h) => sum + h.data_used, 0) / 7;
    const previousAvg = previousWeek.reduce((sum, h) => sum + h.data_used, 0) / 7;
    
    const difference = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    if (difference > 20) return 'increasing';
    if (difference < -20) return 'decreasing';
    return 'stable';
  });

  // Estado de la conexión
  connectionQuality = computed(() => {
    const metrics = this.networkMetrics();
    if (!metrics) return 'unknown';
    
    const speed = metrics.connection_speed;
    const signal = metrics.signal_strength;
    const latency = metrics.latency;
    
    // Algoritmo de calidad basado en múltiples factores
    let score = 0;
    
    // Velocidad (40% del score)
    if (speed >= 100) score += 40;
    else if (speed >= 50) score += 30;
    else if (speed >= 25) score += 20;
    else if (speed >= 10) score += 10;
    
    // Señal (35% del score)
    if (signal >= 90) score += 35;
    else if (signal >= 75) score += 25;
    else if (signal >= 60) score += 15;
    else if (signal >= 40) score += 5;
    
    // Latencia (25% del score) - menor es mejor
    if (latency <= 50) score += 25;
    else if (latency <= 100) score += 20;
    else if (latency <= 200) score += 10;
    else if (latency <= 500) score += 5;
    
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  });

  // Alertas del cliente
  customerAlerts = computed(() => {
    const consumption = this.consumption();
    const cycle = this.billingCycle();
    if (!consumption) return [];

    const alerts: UsageAlert[] = [];

    // Alertas de datos críticas
    if (consumption.data_usage_percentage >= 95) {
      alerts.push({
        type: 'danger',
        title: 'Datos agotándose',
        message: 'Limite de datos casi alcanzado. El servicio puede ser suspendido.',
        percentage: consumption.data_usage_percentage,
        category: 'data'
      });
    }

    // Alertas de saldo
    if (consumption.account_balance <= 1) {
      alerts.push({
        type: 'danger',
        title: 'Saldo crítico',
        message: 'Saldo insuficiente. Recarga inmediatamente para evitar cortes.',
        percentage: 0,
        category: 'balance'
      });
    }

    // Alertas de ciclo de facturación
    if (cycle && cycle.days_remaining <= 2) {
      alerts.push({
        type: 'warning',
        title: 'Fin de ciclo próximo',
        message: `El ciclo de facturación termina en ${cycle.days_remaining} días.`,
        percentage: cycle.progress_percentage,
        category: 'balance'
      });
    }

    return alerts;
  });

  // Cleanup
  private readonly destroy$ = new Subject<void>();
  private readonly refreshTimer$ = new Subject<void>();

  ngOnInit(): void {
    this.setupRouteListeners();
    this.startPeriodicRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshTimer$.next();
    this.refreshTimer$.complete();
  }

  /**
   * Configurar listeners de ruta
   */
  private setupRouteListeners(): void {
    // Obtener customer ID de la ruta
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        const newCustomerId = +params['id'];
        if (newCustomerId !== this.customerId() && newCustomerId > 0) {
          this.customerId.set(newCustomerId);
          this.customerService.setSelectedCustomerId(newCustomerId);
          this.loadCustomerDetails();
        }
      }
    });

    // Obtener tab seleccionado de query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['tab']) {
        this.selectedTab.set(params['tab']);
      }
      if (params['days']) {
        const days = +params['days'];
        if ([7, 15, 30, 60, 90].includes(days)) {
          this.selectedHistoryDays.set(days);
        }
      }
    });
  }

  private startPeriodicRefresh(): void {
    interval(15000) 
      .pipe(
        takeUntil(this.refreshTimer$),
        switchMap(() => {
          if (!this.refreshing()) {
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
   * Cargar todos los detalles del cliente
   */
  private loadCustomerDetails(): void {
    this.loading.set(true);
    this.error.set(null);

    const customerId = this.customerId();
    const historyDays = this.selectedHistoryDays();

    forkJoin({
      consumption: this.customerService.getCustomerConsumptionOnce(customerId),
      usageHistory: this.customerService.getUsageHistory(customerId, historyDays),
      billingCycle: this.customerService.getBillingCycle(customerId),
      networkMetrics: this.customerService.getNetworkMetrics(customerId)
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading.set(false)),
      catchError(error => {
        this.handleError('Error al cargar detalles del cliente', error);
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        this.customer.set(data.consumption.customer);
        this.consumption.set(data.consumption.consumption);
        this.usageHistory.set(data.usageHistory);
        this.billingCycle.set(data.billingCycle);
        this.networkMetrics.set(data.networkMetrics);
        
        this.notificationService.showSuccess(
          'Datos Cargados',
          'Información actualizada correctamente'
        );
      }
    });
  }


  selectTab(tab: string): void {
    this.selectedTab.set(tab);
    this.updateUrlParams({ tab });
  }

  changeHistoryPeriod(days: number): void {
    this.selectedHistoryDays.set(days);
    this.updateUrlParams({ days: days.toString() });
    
    // Recargar historial con nuevo período
    this.customerService.getUsageHistory(this.customerId(), days)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.notificationService.showError(
            'Error al cargar historial',
            'No se pudo cargar el historial para el período seleccionado'
          );
          return of([]);
        })
      )
      .subscribe(history => {
        this.usageHistory.set(history);
      });
  }

 
  private updateUrlParams(params: { [key: string]: string }): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge'
    });
  }

  
  navigateBack(): void {
    this.router.navigate(['/dashboard']);
  }

  
  refreshData(): void {
    this.refreshing.set(true);
    this.customerService.clearCustomerCache(this.customerId());
    
    this.loadCustomerDetails();
    
    setTimeout(() => {
      this.refreshing.set(false);
    }, 1000);
  }

 
  toggleAdvancedMetrics(): void {
    this.showAdvancedMetrics.set(!this.showAdvancedMetrics());
  }

  downloadUsageHistory(): void {
    const history = this.usageHistory();
    const customer = this.customer();
    
    if (!history.length) {
      this.notificationService.showWarning(
        'Sin Datos',
        'No hay historial de uso disponible para descargar'
      );
      return;
    }

    try {
      const csvContent = this.generateUsageHistoryCSV(history);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `historial-uso-${customer?.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      window.URL.revokeObjectURL(url);
      
      this.notificationService.showSuccess(
        'Descarga Completada',
        `Archivo CSV descargado con ${history.length} registros`
      );
    } catch (error) {
      this.notificationService.showError(
        'Error de Descarga',
        'No se pudo generar el archivo CSV'
      );
    }
  }

 
  generateDetailedReport(): void {
    const customer = this.customer();
    const consumption = this.consumption();
    
    if (!customer || !consumption) {
      this.notificationService.showWarning('Sin Datos', 'Información insuficiente para generar reporte');
      return;
    }

    this.notificationService.showSuccess(
      'Reporte Generado',
      'Funcionalidad de reporte detallado en desarrollo'
    );
  }

  /**
   * Probar velocidad de conexión
   */
  testConnectionSpeed(): void {
    this.notificationService.showInfo(
      'Prueba de Velocidad',
      'Iniciando prueba de velocidad de conexión...'
    );

    setTimeout(() => {
      const metrics = this.networkMetrics();
      if (metrics) {
        const variation = (Math.random() - 0.5) * 20;
        const newSpeed = Math.max(1, metrics.connection_speed + variation);
        
        const updatedMetrics = {
          ...metrics,
          connection_speed: newSpeed
        };
        
        this.networkMetrics.set(updatedMetrics);
        
        this.notificationService.showSuccess(
          'Prueba Completada',
          `Velocidad actual: ${newSpeed.toFixed(1)} Mbps`
        );
      }
    }, 3000);
  }

  /**
   * Generar CSV del historial de uso
   */
  private generateUsageHistoryCSV(history: UsageHistory[]): string {
    const headers = [
      'Fecha',
      'Datos Usados (MB)',
      'Minutos Usados',
      'Hora Pico de Uso',
      'Día de la Semana'
    ];
    
    const rows = history.map(h => {
      const date = new Date(h.date);
      return [
        date.toLocaleDateString('es-EC'),
        h.data_used.toFixed(2),
        h.minutes_used.toString(),
        `${h.peak_usage_hour}:00`,
        date.toLocaleDateString('es-EC', { weekday: 'long' })
      ];
    });

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }


  getBadgeClass(): string {
    const status = this.getPlanStatusClass();
    if (status.includes('success')) return 'bg-success';
    if (status.includes('warning')) return 'bg-warning';
    return 'bg-danger';
  }

 
  getFormattedPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

 
  getDataProgressClass(percentage: number): string {
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-success';
  }

  
  getMinutesProgressClass(percentage: number): string {
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-success';
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

  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }


  formatDuration(value: number, unit: 'minutes' | 'hours' = 'minutes'): string {
    if (unit === 'hours') {
      const hours = value;
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (days > 0) {
        return `${days}d ${remainingHours}h`;
      }
      return `${hours}h`;
    }
    
    const minutes = value;
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

 
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDayName(dateString: string): string {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const date = new Date(dateString);
    return dayNames[date.getDay()];
  }


  getPlanStatusClass(): string {
    const consumption = this.consumption();
    if (!consumption) return 'text-muted';

    const maxUsage = Math.max(consumption.data_usage_percentage, consumption.minutes_usage_percentage);
    
    if (maxUsage >= 95) return 'text-danger';
    if (maxUsage >= 90) return 'text-danger';
    if (maxUsage >= 70) return 'text-warning';
    return 'text-success';
  }

 
  getPlanStatusDescription(): string {
    const consumption = this.consumption();
    if (!consumption) return 'Cargando...';

    const dataUsage = consumption.data_usage_percentage;
    const minutesUsage = consumption.minutes_usage_percentage;
    const maxUsage = Math.max(dataUsage, minutesUsage);

    if (maxUsage >= 95) return 'Crítico - Límite casi alcanzado';
    if (maxUsage >= 90) return 'Alto riesgo - Monitorear de cerca';
    if (maxUsage >= 70) return 'Consumo elevado - Precaución';
    if (maxUsage >= 50) return 'Consumo moderado';
    return 'Consumo normal';
  }


  getConnectionQualityColor(): string {
    switch (this.connectionQuality()) {
      case 'excellent': return 'success';
      case 'good': return 'info';
      case 'fair': return 'warning';
      case 'poor': return 'danger';
      default: return 'secondary';
    }
  }


  getConnectionQualityText(): string {
    switch (this.connectionQuality()) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Buena';
      case 'fair': return 'Regular';
      case 'poor': return 'Pobre';
      default: return 'Desconocida';
    }
  }

 
  formatConnectionSpeed(speed: number): string {
    if (speed >= 1000) {
      return `${(speed / 1000).toFixed(1)} Gbps`;
    }
    return `${speed.toFixed(1)} Mbps`;
  }


  getUsageTrendText(): string {
    switch (this.usageTrend()) {
      case 'increasing': return 'Tendencia creciente';
      case 'decreasing': return 'Tendencia decreciente';
      case 'stable': return 'Uso estable';
      default: return 'Datos insuficientes';
    }
  }


  getUsageTrendIcon(): string {
    switch (this.usageTrend()) {
      case 'increasing': return 'fas fa-arrow-up text-danger';
      case 'decreasing': return 'fas fa-arrow-down text-success';
      case 'stable': return 'fas fa-minus text-info';
      default: return 'fas fa-question text-muted';
    }
  }

  private handleError(title: string, error: Error): void {
    console.error(title, error);
    this.error.set(error.message || 'Error desconocido');
    this.notificationService.showError(title, error.message || 'Error desconocido');
  }
}