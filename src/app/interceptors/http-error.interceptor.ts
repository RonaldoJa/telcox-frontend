import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, timer } from 'rxjs';
import { throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>, 
  next: HttpHandlerFn
) => {
  const notificationService = inject(NotificationService);
  
  return next(req).pipe(
    // Retry automático para ciertos tipos de error
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Solo retry para errores de red o del servidor (pero NO para el error HTML)
        if ((error.status >= 500 || error.status === 0) && !isHtmlResponseError(error)) {
          const delayTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Retry attempt ${retryCount} after ${delayTime}ms for ${req.url}`);
          return timer(delayTime);
        }
        return throwError(() => error);
      }
    }),
        
    catchError((error: HttpErrorResponse) => {
      console.error('HTTP Error:', error);
      
      if (isHtmlResponseError(error)) {
        const htmlError = handleHtmlResponseError(error, req);
        console.error('🚨 DIAGNOSTIC ERROR: Received HTML instead of JSON');
        console.error('Request URL:', req.url);
        console.error('This usually means:');
        console.error('1. Proxy configuration is not working');
        console.error('2. Request is hitting Angular dev server instead of backend');
        console.error('3. Backend endpoint does not exist');
        
        notificationService.showError(
          'Error de Configuración',
          'No se puede conectar al backend. Verifica la configuración del proxy.'
        );
        
        return throwError(() => htmlError);
      }
      
      let errorMessage = 'Ocurrió un error inesperado';
      let showNotification = false;
      
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Error de conexión: ${error.error.message}`;
        showNotification = true;
      } else {
        switch (error.status) {
          case 0:
            errorMessage = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
            showNotification = true;
            break;
          case 401:
            errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
            showNotification = true;
            break;
          case 403:
            errorMessage = 'No tienes permisos para realizar esta acción.';
            showNotification = true;
            break;
          case 404:
            errorMessage = 'Recurso no encontrado.';
            break;
          case 429:
            errorMessage = 'Demasiadas solicitudes. Por favor, espera un momento.';
            showNotification = true;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = 'Error del servidor. Nuestro equipo ha sido notificado.';
            showNotification = true;
            break;
          default:
            if (error.error && typeof error.error === 'object' && 'error' in error.error) {
              errorMessage = error.error.error as string;
            } else {
              errorMessage = `Error ${error.status}: ${error.statusText}`;
            }
            showNotification = error.status >= 500;
        }
      }
      
      if (showNotification) {
        notificationService.showError('Error', errorMessage);
      }
      
      // Crear error personalizado con información adicional
      const customError = new Error(errorMessage);
      (customError as any).status = error.status;
      (customError as any).originalError = error;
      
      return throwError(() => customError);
    })
  );
};


function isHtmlResponseError(error: HttpErrorResponse): boolean {
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


function handleHtmlResponseError(error: HttpErrorResponse, req: HttpRequest<unknown>): Error {
  const customError = new Error('Backend connection error - received HTML instead of JSON');
  (customError as any).status = 502; // Bad Gateway es más apropiado que 200
  (customError as any).code = 'PROXY_ERROR';
  (customError as any).details = {
    message: 'The proxy is not working correctly',
    suggestion: 'Check that your backend is running and proxy.conf.json is configured correctly',
    requestUrl: req.url,
    receivedContent: 'HTML page instead of JSON API response'
  };
  (customError as any).originalError = error;
  
  return customError;
}