import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, timer, EMPTY, of } from 'rxjs';
import { catchError, retry, map, shareReplay, switchMap, startWith, distinctUntilChanged, tap } from 'rxjs/operators';

import {
  Customer,
  ConsumptionResponse,
  CustomerResponse,
  UsageHistory,
  BillingCycle,
  NetworkMetrics
} from '../models/customer.model';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Cache para optimizar requests
  private customerCache = new Map<number, Observable<Customer>>();
  private consumptionCache = new Map<number, Observable<ConsumptionResponse['data']>>();

  // Auto-refresh configuración
  private autoRefreshInterval = environment.autoRefreshInterval;
  private autoRefreshEnabled$ = new BehaviorSubject<boolean>(true);
  private selectedCustomerId$ = new BehaviorSubject<number>(1);

  // Configuración HTTP con headers explícitos
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    })
  };

  /**
   * Obtener información básica del cliente
   */
  getCustomerInfo(customerId: number): Observable<Customer> {
    // Verificar cache
    const cacheKey = customerId;
    if (this.customerCache.has(cacheKey)) {
      return this.customerCache.get(cacheKey)!;
    }

    const request$ = this.http.get<CustomerResponse>(
      `${this.apiUrl}/customers/${customerId}`,
      this.httpOptions
    ).pipe(
      tap(response => {
        console.log('CustomerInfo response:', response);
        this.validateApiResponse(response, 'getCustomerInfo');
      }),
      retry({ count: 2, delay: 1000 }),
      map(response => response.data),
      catchError((error) => this.handleError(error, 'getCustomerInfo')),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.customerCache.set(cacheKey, request$);
    return request$;
  }

  /**
   * Obtener datos de consumo del cliente con auto-refresh
   */
  getCustomerConsumption(customerId: number): Observable<ConsumptionResponse['data']> {
    return this.autoRefreshEnabled$.pipe(
      distinctUntilChanged(),
      switchMap(autoRefreshEnabled => {
        if (autoRefreshEnabled) {
          return timer(0, this.autoRefreshInterval).pipe(
            switchMap(() => this.fetchConsumptionData(customerId))
          );
        } else {
          return this.fetchConsumptionData(customerId);
        }
      })
    );
  }


  getCustomerConsumptionOnce(customerId: number): Observable<ConsumptionResponse['data']> {
    return this.fetchConsumptionData(customerId);
  }


  private fetchConsumptionData(customerId: number): Observable<ConsumptionResponse['data']> {
    return this.http.get<ConsumptionResponse>(
      `${this.apiUrl}/customers/${customerId}/consumption`,
      this.httpOptions
    ).pipe(
      tap(response => {
        console.log('Consumption response:', response);
        this.validateApiResponse(response, 'fetchConsumptionData');
      }),
      retry({ count: 2, delay: 1000 }),
      map(response => response.data),
      catchError(error => {
        console.error(`Error fetching consumption for customer ${customerId}:`, error);
        return this.handleError(error, 'fetchConsumptionData');
      })
    );
  }

  /**
   * Obtener historial de uso
   */
  getUsageHistory(customerId: number, days: number = 30): Observable<UsageHistory[]> {
    const params = new HttpParams().set('days', days.toString());

    return this.http.get<{ success: boolean, data: UsageHistory[] }>(
      `${this.apiUrl}/customers/${customerId}/usage-history`, 
      { ...this.httpOptions, params }
    ).pipe(
      tap(response => this.validateApiResponse(response, 'getUsageHistory')),
      map(response => response.data),
      catchError((error) => this.handleError(error, 'getUsageHistory'))
    );
  }

  /**
   * Obtener métricas de red
   */
  getNetworkMetrics(customerId: number): Observable<NetworkMetrics | null> {
  return this.http.get<any>(`/api/customers/${customerId}/network-metrics`)
    .pipe(
      map(response => {
        if (response && response.success && response.data) {
          return {
            connection_speed: response.data.downloadSpeed,
            upload_speed: response.data.uploadSpeed,
            latency: response.data.latency,
            jitter: response.data.jitter,
            packet_loss: response.data.packetLoss,
            signal_strength: response.data.signalStrength,
            uptime_hours: 0, 
            connection_type: response.data.connectionType,
            quality: response.data.quality,
            last_updated: response.data.lastUpdated,
            data_usage: response.data.dataUsage
          } as NetworkMetrics;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting network metrics:', error);
        return of(null);
      })
    );
}

  /**
   * Obtener información del ciclo de facturación
   */
  getBillingCycle(customerId: number): Observable<BillingCycle> {
    return this.http.get<{ success: boolean, data: BillingCycle }>(
      `${this.apiUrl}/customers/${customerId}/billing-cycle`,
      this.httpOptions
    ).pipe(
      tap(response => this.validateApiResponse(response, 'getBillingCycle')),
      map(response => response.data),
      catchError((error) => this.handleError(error, 'getBillingCycle'))
    );
  }


  getCustomers(page: number = 1, limit: number = 10): Observable<Customer[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<{ success: boolean, data: Customer[] }>(
      `${this.apiUrl}/customers`, 
      { ...this.httpOptions, params }
    ).pipe(
      tap(response => this.validateApiResponse(response, 'getCustomers')),
      map(response => response.data),
      catchError((error) => this.handleError(error, 'getCustomers'))
    );
  }


  private validateApiResponse(response: any, methodName: string): void {
    if (!response) {
      throw new Error(`${methodName}: Response is null or undefined`);
    }

    if (typeof response !== 'object') {
      throw new Error(`${methodName}: Response is not an object`);
    }

    if (!('success' in response)) {
      throw new Error(`${methodName}: Response missing 'success' property`);
    }

    if (!response.success) {
      const errorMsg = response.error || 'API returned success: false';
      throw new Error(`${methodName}: ${errorMsg}`);
    }

    if (!('data' in response)) {
      throw new Error(`${methodName}: Response missing 'data' property`);
    }
  }


  private handleError = (error: HttpErrorResponse | Error, context: string = 'unknown'): Observable<never> => {
    let errorMessage = 'Ocurrió un error inesperado';
    let errorCode = 'UNKNOWN_ERROR';

    console.error(`CustomerService Error in ${context}:`, {
      status: (error as HttpErrorResponse).status,
      message: error.message,
      url: (error as HttpErrorResponse).url,
      originalError: error
    });

    if (error instanceof HttpErrorResponse) {
      if (this.isHtmlResponseError(error)) {
        errorMessage = 'Error de configuración - recibido HTML en lugar de JSON';
        errorCode = 'PROXY_CONFIGURATION_ERROR';
        
        console.error('🚨 PROXY ERROR DETECTED:');
        console.error('- Request URL:', error.url);
        console.error('- Expected: JSON API response');
        console.error('- Received: HTML page (Angular dev server)');
        console.error('- Solution: Check proxy.conf.json and restart ng serve with --proxy-config');
        
      } else if (error.error instanceof ErrorEvent) {
        // Error del lado del cliente
        errorMessage = `Error de conexión: ${error.error.message}`;
        errorCode = 'CLIENT_ERROR';
      } else {
        // Error del lado del servidor
        switch (error.status) {
          case 404:
            errorMessage = 'Cliente no encontrado';
            errorCode = 'NOT_FOUND';
            break;
          case 503:
            errorMessage = 'Sistema BSS temporalmente no disponible';
            errorCode = 'SERVICE_UNAVAILABLE';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            errorCode = 'INTERNAL_SERVER_ERROR';
            break;
          case 0:
            errorMessage = 'No se puede conectar al servidor. Verifique su conexión.';
            errorCode = 'CONNECTION_ERROR';
            break;
          default:
            if (error.error && typeof error.error === 'object' && 'error' in error.error) {
              errorMessage = error.error.error as string;
              errorCode = 'API_ERROR';
            } else {
              errorMessage = `Error ${error.status}: ${error.statusText}`;
              errorCode = 'HTTP_ERROR';
            }
        }
      }
    } else {
      // Error genérico de JavaScript
      errorMessage = error.message || 'Error desconocido';
      errorCode = 'JAVASCRIPT_ERROR';
    }

    // Crear objeto de error estructurado
    const structuredError = new Error(errorMessage);
    (structuredError as any).code = errorCode;
    (structuredError as any).context = context;
    (structuredError as any).status = (error as HttpErrorResponse).status;
    (structuredError as any).originalError = error;

    return throwError(() => structuredError);
  };

  /**
   * Detectar si recibimos HTML en lugar de JSON
   */
  private isHtmlResponseError(error: HttpErrorResponse): boolean {
    return (
      error.status === 200 && 
      error.error && 
      typeof error.error === 'object' &&
      'text' in error.error &&
      typeof error.error.text === 'string' &&
      (
        error.error.text.includes('<!doctype html>') ||
        error.error.text.includes('<!DOCTYPE html>') ||
        error.error.text.includes('<html')
      )
    );
  }

  setAutoRefresh(enabled: boolean): void {
    this.autoRefreshEnabled$.next(enabled);
    localStorage.setItem('telcox_auto_refresh', enabled.toString());
  }

  isAutoRefreshEnabled(): Observable<boolean> {
    return this.autoRefreshEnabled$.asObservable();
  }

  loadAutoRefreshPreference(): void {
    const saved = localStorage.getItem('telcox_auto_refresh');
    if (saved !== null) {
      this.autoRefreshEnabled$.next(saved === 'true');
    }
  }

  setSelectedCustomerId(customerId: number): void {
    this.selectedCustomerId$.next(customerId);
  }

  getSelectedCustomerId(): Observable<number> {
    return this.selectedCustomerId$.asObservable();
  }

  clearCustomerCache(customerId: number): void {
    this.customerCache.delete(customerId);
    this.consumptionCache.delete(customerId);
  }

  clearAllCache(): void {
    this.customerCache.clear();
    this.consumptionCache.clear();
  }
}