import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SystemStatus } from '../models/api.models';
import { environment } from '../../environments/environments'; 

@Injectable({
  providedIn: 'root'
})
export class SystemService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtener estado del sistema completo
   */
  getSystemStatus(): Observable<SystemStatus> {
    return this.http.get<{ success: boolean; data: SystemStatus }>(`${this.apiUrl}/system-status`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error getting system status:', error);
          return of({
            bss: {
              status: 'offline',
              response_time: 0,
              last_check: new Date().toISOString(),
              services: {}
            },
            database: {
              status: 'unknown',
              connections: 0
            },
            api: {
              status: 'unknown',
              version: '0.0.0',
              uptime: 0
            }
          } as SystemStatus);
        })
      );
  }
} 
