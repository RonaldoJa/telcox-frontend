import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
  isLoading: boolean;
  activeRequests: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingCount = signal(0);
  private loadingMessage = signal<string>('');
  
  public isLoading = computed(() => this.loadingCount() > 0);
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingCountSubject = new BehaviorSubject<number>(0);
  
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();
  public loadingCount$: Observable<number> = this.loadingCountSubject.asObservable();

  /**
   * Incrementar contador de loading
   */
  show(message?: string): void {
    const currentCount = this.loadingCount();
    const newCount = currentCount + 1;
    
    this.loadingCount.set(newCount);
    this.loadingCountSubject.next(newCount);
    
    if (message) {
      this.loadingMessage.set(message);
    }
    
    if (newCount > 0) {
      this.loadingSubject.next(true);
    }

    // Debug info
    console.log(`Loading: ${newCount} active requests`, message || '');
  }

  /**
   * Decrementar contador de loading
   */
  hide(): void {
    const currentCount = this.loadingCount();
    const newCount = Math.max(0, currentCount - 1);
    
    this.loadingCount.set(newCount);
    this.loadingCountSubject.next(newCount);
    
    if (newCount === 0) {
      this.loadingSubject.next(false);
      this.loadingMessage.set('');
    }

    // Debug info
    console.log(`Loading: ${newCount} active requests`);
  }

  /**
   * Forzar estado de loading
   */
  setLoading(loading: boolean, message?: string): void {
    this.loadingCount.set(loading ? 1 : 0);
    this.loadingCountSubject.next(loading ? 1 : 0);
    this.loadingSubject.next(loading);
    
    if (message) {
      this.loadingMessage.set(message);
    } else if (!loading) {
      this.loadingMessage.set('');
    }
  }

  /**
   * Verificar si está loading
   */
  isCurrentlyLoading(): boolean {
    return this.isLoading();
  }

  /**
   * Obtener mensaje actual de loading
   */
  getCurrentMessage(): string {
    return this.loadingMessage();
  }

  /**
   * Obtener número de requests activos
   */
  getActiveRequestsCount(): number {
    return this.loadingCount();
  }

  /**
   * Resetear todo el estado de loading
   */
  reset(): void {
    this.loadingCount.set(0);
    this.loadingMessage.set('');
    this.loadingSubject.next(false);
    this.loadingCountSubject.next(0);
  }

  /**
   * Obtener estado completo de loading
   */
  getLoadingState(): LoadingState {
    return {
      isLoading: this.isLoading(),
      activeRequests: this.loadingCount(),
      message: this.loadingMessage() || undefined
    };
  }
}